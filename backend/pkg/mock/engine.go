package mock

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// OnMockHitCallback allows notifying WebSocket hub of live mock hits
var OnMockHitCallback func(log database.MockRequestLog)

// ServeMockEndpoint dynamically matches and serves registered mock endpoints
func ServeMockEndpoint(c *gin.Context) {
	start := time.Now()
	workspaceID := c.Param("workspaceId")
	reqPath := c.Param("path")
	if !strings.HasPrefix(reqPath, "/") {
		reqPath = "/" + reqPath
	}
	method := c.Request.Method

	db := database.GetDB()

	// Find matching active mock endpoint for this workspace, method and path
	var endpoint database.MockEndpoint
	var err error
	if workspaceID != "" {
		err = db.Where("workspace_id = ? AND method = ? AND is_active = ? AND (path = ? OR path = ?)",
			workspaceID, method, true, reqPath, strings.TrimSuffix(reqPath, "/")).First(&endpoint).Error

		if err != nil {
			cleanPath := strings.TrimSuffix(reqPath, "/")
			err = db.Where("workspace_id = ? AND method = ? AND is_active = ? AND path LIKE ?",
				workspaceID, method, true, cleanPath+"%").First(&endpoint).Error
		}
	} else {
		err = db.Where("method = ? AND is_active = ? AND (path = ? OR path = ?)",
			method, true, reqPath, strings.TrimSuffix(reqPath, "/")).First(&endpoint).Error
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":       "Mock endpoint not found or inactive",
			"workspaceId": workspaceID,
			"method":      method,
			"path":        reqPath,
			"hint":        "Ensure you have created and activated a mock endpoint for this route in Mock Studio.",
		})
		return
	}

	// Artificial delay simulation if configured
	if endpoint.DelayMs > 0 {
		time.Sleep(time.Duration(endpoint.DelayMs) * time.Millisecond)
	}

	// Parse and set custom headers
	if endpoint.ResponseHeaders != "" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(endpoint.ResponseHeaders), &headers); err == nil {
			for k, v := range headers {
				c.Header(k, v)
			}
		}
	}

	// Always set mock identification header
	c.Header("X-Mock-Server", "Synqo")
	c.Header("X-Mock-Endpoint-ID", endpoint.ID)

	// Read body for logging
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	durationMs := time.Since(start).Milliseconds()

	// Capture request headers and query
	headerJSON, _ := json.Marshal(c.Request.Header)
	queryJSON, _ := json.Marshal(c.Request.URL.Query())

	// Save request log
	reqLog := database.MockRequestLog{
		ID:             "log_" + uuid.New().String()[:8],
		MockEndpointID: endpoint.ID,
		WorkspaceID:    workspaceID,
		Method:         method,
		Path:           reqPath,
		ClientIP:       c.ClientIP(),
		Headers:        string(headerJSON),
		QueryParams:    string(queryJSON),
		Body:           string(bodyBytes),
		StatusCode:     endpoint.StatusCode,
		DurationMs:     durationMs,
		Timestamp:      time.Now(),
	}
	db.Create(&reqLog)

	// Increment hit counter asynchronously
	go func(epID string) {
		database.GetDB().Model(&database.MockEndpoint{}).Where("id = ?", epID).Update("hit_count", endpoint.HitCount+1)
	}(endpoint.ID)

	// Broadcast live hit via callback
	if OnMockHitCallback != nil {
		go OnMockHitCallback(reqLog)
	}

	// Serve the response body with configured status code
	contentType := c.Writer.Header().Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	c.Data(endpoint.StatusCode, contentType, []byte(endpoint.ResponseBody))
}
