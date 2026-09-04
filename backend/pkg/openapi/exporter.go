package openapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
)

// ExportCollectionToOpenAPI exports a workspace collection as OpenAPI 3.0 JSON
func ExportCollectionToOpenAPI(c *gin.Context) {
	collectionID := c.Param("collectionId")
	db := database.GetDB()

	var col database.Collection
	if err := db.First(&col, "id = ?", collectionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Collection not found"})
		return
	}

	var requests []database.RequestItem
	db.Where("collection_id = ?", collectionID).Order("order_index asc").Find(&requests)

	paths := make(map[string]map[string]any)

	for _, req := range requests {
		// Clean up URL to extract path
		cleanPath := req.URL
		if strings.HasPrefix(cleanPath, "{{baseUrl}}") {
			cleanPath = strings.TrimPrefix(cleanPath, "{{baseUrl}}")
		}
		if !strings.HasPrefix(cleanPath, "/") {
			cleanPath = "/" + cleanPath
		}
		// Strip query parameters if in url
		if idx := strings.Index(cleanPath, "?"); idx != -1 {
			cleanPath = cleanPath[:idx]
		}

		method := strings.ToLower(req.Method)

		if _, ok := paths[cleanPath]; !ok {
			paths[cleanPath] = make(map[string]any)
		}

		op := map[string]any{
			"summary":     req.Name,
			"description": req.Description,
			"responses": map[string]any{
				"200": map[string]any{
					"description": "Successful operation",
				},
			},
		}

		// Parameters
		if req.Params != "" {
			var paramItems []struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			}
			if err := json.Unmarshal([]byte(req.Params), &paramItems); err == nil && len(paramItems) > 0 {
				var opParams []map[string]any
				for _, p := range paramItems {
					opParams = append(opParams, map[string]any{
						"name":     p.Key,
						"in":       "query",
						"required": false,
						"schema": map[string]any{
							"type": "string",
						},
						"example": p.Value,
					})
				}
				op["parameters"] = opParams
			}
		}

		// Request Body
		if req.BodyType == "json" && req.BodyContent != "" {
			var parsedJSON any
			if err := json.Unmarshal([]byte(req.BodyContent), &parsedJSON); err == nil {
				op["requestBody"] = map[string]any{
					"required": true,
					"content": map[string]any{
						"application/json": map[string]any{
							"example": parsedJSON,
						},
					},
				}
			}
		}

		paths[cleanPath][method] = op
	}

	spec := map[string]any{
		"openapi": "3.0.0",
		"info": map[string]any{
			"title":       col.Name,
			"description": col.Description,
			"version":     "1.0.0",
		},
		"servers": []map[string]any{
			{"url": "https://api.example.com/v1", "description": "Production Server"},
		},
		"paths": paths,
	}

	c.JSON(http.StatusOK, spec)
}
