package environment

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VariableItem represents a single key-value variable in an environment
type VariableItem struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	IsSecret bool   `json:"isSecret"`
	Enabled  bool   `json:"enabled"`
}

var varRegex = regexp.MustCompile(`\{\{([a-zA-Z0-9_\-\.]+)\}\}`)

// ResolveVariables replaces {{key}} in the template with values from the given environment
func ResolveVariables(template string, envID string, db *gorm.DB) string {
	if template == "" || !strings.Contains(template, "{{") {
		return template
	}

	var env database.Environment
	if err := db.First(&env, "id = ?", envID).Error; err != nil {
		return template
	}

	var vars []VariableItem
	if err := json.Unmarshal([]byte(env.Variables), &vars); err != nil {
		return template
	}

	valMap := make(map[string]string)
	for _, v := range vars {
		if v.Enabled {
			valMap[v.Key] = v.Value
		}
	}

	return varRegex.ReplaceAllStringFunc(template, func(match string) string {
		key := strings.Trim(match, "{}")
		if val, exists := valMap[key]; exists {
			return val
		}
		return match
	})
}

// ListEnvironments returns all environments for a workspace
func ListEnvironments(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()

	var envs []database.Environment
	if err := db.Where("workspace_id = ?", workspaceID).Order("is_default desc, created_at asc").Find(&envs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch environments"})
		return
	}

	c.JSON(http.StatusOK, envs)
}

// CreateEnvironment adds a new environment to a workspace
func CreateEnvironment(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	var req struct {
		Name      string `json:"name" binding:"required"`
		IsDefault bool   `json:"isDefault"`
		Variables any    `json:"variables"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	varsStr := "[]"
	if req.Variables != nil {
		switch v := req.Variables.(type) {
		case string:
			if strings.TrimSpace(v) != "" {
				varsStr = v
			}
		default:
			varsBytes, err := json.Marshal(v)
			if err == nil {
				varsStr = string(varsBytes)
			}
		}
	}

	db := database.GetDB()

	// If marked as default, unset other defaults
	if req.IsDefault {
		db.Model(&database.Environment{}).Where("workspace_id = ?", workspaceID).Update("is_default", false)
	}

	env := database.Environment{
		ID:          "env_" + uuid.New().String()[:8],
		WorkspaceID: workspaceID,
		Name:        req.Name,
		IsDefault:   req.IsDefault,
		Variables:   varsStr,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.Create(&env).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create environment"})
		return
	}

	c.JSON(http.StatusCreated, env)
}

// UpdateEnvironment updates name, default status, or variables
func UpdateEnvironment(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name      string `json:"name"`
		IsDefault *bool  `json:"isDefault"`
		Variables any    `json:"variables"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	var env database.Environment
	if err := db.First(&env, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		return
	}

	if req.Name != "" {
		env.Name = req.Name
	}
	if req.IsDefault != nil {
		env.IsDefault = *req.IsDefault
		if env.IsDefault {
			db.Model(&database.Environment{}).Where("workspace_id = ? AND id != ?", env.WorkspaceID, env.ID).Update("is_default", false)
		}
	}
	if req.Variables != nil {
		switch v := req.Variables.(type) {
		case string:
			if strings.TrimSpace(v) != "" {
				env.Variables = v
			} else {
				env.Variables = "[]"
			}
		default:
			varsBytes, err := json.Marshal(v)
			if err == nil {
				env.Variables = string(varsBytes)
			}
		}
	}
	env.UpdatedAt = time.Now()

	db.Save(&env)
	c.JSON(http.StatusOK, env)
}

// DeleteEnvironment removes an environment
func DeleteEnvironment(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()
	if err := db.Delete(&database.Environment{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete environment"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Environment deleted successfully"})
}
