package mock

import (
	"net/http"
	"strings"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ListMockEndpoints retrieves all mock endpoints for a workspace
func ListMockEndpoints(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()

	var endpoints []database.MockEndpoint
	if err := db.Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&endpoints).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch mock endpoints"})
		return
	}

	c.JSON(http.StatusOK, endpoints)
}

// CreateMockEndpoint registers a new mock endpoint
func CreateMockEndpoint(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	var req database.MockEndpoint
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.ID = "mock_" + uuid.New().String()[:8]
	req.WorkspaceID = workspaceID
	if !strings.HasPrefix(req.Path, "/") {
		req.Path = "/" + req.Path
	}
	if req.StatusCode == 0 {
		req.StatusCode = 200
	}
	if req.ResponseHeaders == "" {
		req.ResponseHeaders = `{"Content-Type": "application/json"}`
	}
	if req.ResponseBody == "" {
		req.ResponseBody = `{"message": "Hello from mock endpoint!"}`
	}
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	db := database.GetDB()
	if err := db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mock endpoint"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// UpdateMockEndpoint updates an existing mock endpoint
func UpdateMockEndpoint(c *gin.Context) {
	id := c.Param("id")
	var updated database.MockEndpoint
	if err := c.ShouldBindJSON(&updated); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	var endpoint database.MockEndpoint
	if err := db.First(&endpoint, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mock endpoint not found"})
		return
	}

	endpoint.Name = updated.Name
	endpoint.Method = updated.Method
	if !strings.HasPrefix(updated.Path, "/") {
		endpoint.Path = "/" + updated.Path
	} else {
		endpoint.Path = updated.Path
	}
	endpoint.StatusCode = updated.StatusCode
	endpoint.ResponseHeaders = updated.ResponseHeaders
	endpoint.ResponseBody = updated.ResponseBody
	endpoint.DelayMs = updated.DelayMs
	endpoint.IsActive = updated.IsActive
	endpoint.UpdatedAt = time.Now()

	db.Save(&endpoint)
	c.JSON(http.StatusOK, endpoint)
}

// DeleteMockEndpoint deletes a mock endpoint and its logs
func DeleteMockEndpoint(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()
	db.Delete(&database.MockRequestLog{}, "mock_endpoint_id = ?", id)
	db.Delete(&database.MockEndpoint{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Mock endpoint deleted"})
}

// GetMockLogs retrieves recent request logs for a mock endpoint or entire workspace
func GetMockLogs(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	mockID := c.Query("mockId")
	db := database.GetDB()

	query := db.Where("workspace_id = ?", workspaceID)
	if mockID != "" {
		query = query.Where("mock_endpoint_id = ?", mockID)
	}

	var logs []database.MockRequestLog
	query.Order("timestamp desc").Limit(50).Find(&logs)

	c.JSON(http.StatusOK, logs)
}

// ClearMockLogs deletes logs for a workspace or endpoint
func ClearMockLogs(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()
	db.Delete(&database.MockRequestLog{}, "workspace_id = ?", workspaceID)
	c.JSON(http.StatusOK, gin.H{"message": "Mock logs cleared"})
}
