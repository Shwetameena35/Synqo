package openapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

// DocParameter describes a path, query, or header param
type DocParameter struct {
	Name        string `json:"name"`
	In          string `json:"in"` // query, path, header
	Required    bool   `json:"required"`
	Description string `json:"description"`
	SchemaType  string `json:"schemaType"`
	Example     string `json:"example"`
}

// DocEndpoint represents a parsed API operation
type DocEndpoint struct {
	ID          string         `json:"id"`
	Method      string         `json:"method"`
	Path        string         `json:"path"`
	Summary     string         `json:"summary"`
	Description string         `json:"description"`
	Tags        []string       `json:"tags"`
	Parameters  []DocParameter `json:"parameters"`
	RequestBody string         `json:"requestBody"`
	Responses   map[string]any `json:"responses"`
	Snippets    map[string]string `json:"snippets"`
}

// ParsedOpenAPISpec represents structured documentation
type ParsedOpenAPISpec struct {
	Title       string        `json:"title"`
	Version     string        `json:"version"`
	Description string        `json:"description"`
	BaseURL     string        `json:"baseUrl"`
	Endpoints   []DocEndpoint `json:"endpoints"`
}

// ParseSpec parses either JSON or YAML OpenAPI/Swagger spec into structured docs
func ParseSpec(raw string) (*ParsedOpenAPISpec, error) {
	var rawData map[string]any
	err := json.Unmarshal([]byte(raw), &rawData)
	if err != nil {
		// Try YAML
		if yamlErr := yaml.Unmarshal([]byte(raw), &rawData); yamlErr != nil {
			return nil, fmt.Errorf("failed to parse spec as JSON or YAML: %v", err)
		}
	}

	doc := &ParsedOpenAPISpec{
		Title:   "API Documentation",
		Version: "1.0.0",
		BaseURL: "https://api.example.com/v1",
	}

	if info, ok := rawData["info"].(map[string]any); ok {
		if t, ok := info["title"].(string); ok {
			doc.Title = t
		}
		if v, ok := info["version"].(string); ok {
			doc.Version = v
		}
		if d, ok := info["description"].(string); ok {
			doc.Description = d
		}
	}

	if servers, ok := rawData["servers"].([]any); ok && len(servers) > 0 {
		if sMap, ok := servers[0].(map[string]any); ok {
			if u, ok := sMap["url"].(string); ok {
				doc.BaseURL = u
			}
		}
	} else if host, ok := rawData["host"].(string); ok {
		basePath := ""
		if bp, ok := rawData["basePath"].(string); ok {
			basePath = bp
		}
		doc.BaseURL = "https://" + host + basePath
	}

	paths, ok := rawData["paths"].(map[string]any)
	if !ok {
		return doc, nil
	}

	for pathStr, itemAny := range paths {
		pathItem, ok := itemAny.(map[string]any)
		if !ok {
			continue
		}

		for methodKey, opAny := range pathItem {
			method := strings.ToUpper(methodKey)
			if method != "GET" && method != "POST" && method != "PUT" && method != "DELETE" && method != "PATCH" {
				continue
			}

			op, ok := opAny.(map[string]any)
			if !ok {
				continue
			}

			summary := ""
			if s, ok := op["summary"].(string); ok {
				summary = s
			} else {
				summary = fmt.Sprintf("%s %s", method, pathStr)
			}

			desc := ""
			if d, ok := op["description"].(string); ok {
				desc = d
			}

			var tags []string
			if tagList, ok := op["tags"].([]any); ok {
				for _, t := range tagList {
					if ts, ok := t.(string); ok {
						tags = append(tags, ts)
					}
				}
			}

			var params []DocParameter
			if paramList, ok := op["parameters"].([]any); ok {
				for _, pAny := range paramList {
					if pMap, ok := pAny.(map[string]any); ok {
						name, _ := pMap["name"].(string)
						in, _ := pMap["in"].(string)
						req, _ := pMap["required"].(bool)
						pDesc, _ := pMap["description"].(string)
						pType := "string"
						if s, ok := pMap["schema"].(map[string]any); ok {
							if t, ok := s["type"].(string); ok {
								pType = t
							}
						}
						params = append(params, DocParameter{
							Name:        name,
							In:          in,
							Required:    req,
							Description: pDesc,
							SchemaType:  pType,
						})
					}
				}
			}

			reqBodyStr := ""
			if reqBody, ok := op["requestBody"].(map[string]any); ok {
				if content, ok := reqBody["content"].(map[string]any); ok {
					if appJSON, ok := content["application/json"].(map[string]any); ok {
						if ex, ok := appJSON["example"]; ok {
							b, _ := json.MarshalIndent(ex, "", "  ")
							reqBodyStr = string(b)
						} else {
							reqBodyStr = "{\n  \"example\": \"value\"\n}"
						}
					}
				}
			}

			responses := make(map[string]any)
			if respMap, ok := op["responses"].(map[string]any); ok {
				responses = respMap
			}

			// Generate quick snippets
			fullURL := doc.BaseURL + pathStr
			snippets := map[string]string{
				"curl": fmt.Sprintf("curl -X %s \"%s\" \\\n  -H \"Content-Type: application/json\"", method, fullURL),
				"javascript": fmt.Sprintf("const response = await fetch(\"%s\", {\n  method: \"%s\",\n  headers: { \"Content-Type\": \"application/json\" }\n});\nconst data = await response.json();", fullURL, method),
				"go": fmt.Sprintf("req, _ := http.NewRequest(\"%s\", \"%s\", nil)\nresp, err := http.DefaultClient.Do(req)", method, fullURL),
				"python": fmt.Sprintf("import requests\n\nresponse = requests.%s(\"%s\")\nprint(response.json())", strings.ToLower(method), fullURL),
			}

			doc.Endpoints = append(doc.Endpoints, DocEndpoint{
				ID:          uuid.New().String()[:8],
				Method:      method,
				Path:        pathStr,
				Summary:     summary,
				Description: desc,
				Tags:        tags,
				Parameters:  params,
				RequestBody: reqBodyStr,
				Responses:   responses,
				Snippets:    snippets,
			})
		}
	}

	return doc, nil
}

// ParseAndPreviewOpenAPI handles uploaded or pasted specs and returns parsed doc
func ParseAndPreviewOpenAPI(c *gin.Context) {
	var req struct {
		Spec string `json:"spec" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	doc, err := ParseSpec(req.Spec)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, doc)
}

// ImportOpenAPI converts an OpenAPI spec directly into a collection and requests
func ImportOpenAPI(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	var req struct {
		Spec           string `json:"spec"`
		URL            string `json:"url"`
		CollectionName string `json:"collectionName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	specContent := req.Spec
	fetchURL := strings.TrimSpace(req.URL)
	trimmedSpec := strings.TrimSpace(req.Spec)
	if fetchURL == "" && (strings.HasPrefix(trimmedSpec, "http://") || strings.HasPrefix(trimmedSpec, "https://")) {
		fetchURL = trimmedSpec
	}

	if fetchURL != "" {
		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Get(fetchURL)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch Swagger URL: " + err.Error()})
			return
		}
		defer resp.Body.Close()
		bytes, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read response from Swagger URL: " + err.Error()})
			return
		}
		specContent = string(bytes)

		// If the fetched URL returned an HTML page (like Swagger UI), auto-resolve the underlying JSON spec
		if strings.HasPrefix(strings.TrimSpace(specContent), "<") {
			client := &http.Client{Timeout: 10 * time.Second}
			cleanURL := strings.TrimRight(fetchURL, "/")
			candidates := []string{
				cleanURL + "-json",
				cleanURL + "/swagger.json",
				cleanURL + "/openapi.json",
				cleanURL + "/v3/api-docs",
			}

			resolved := false
			for _, cand := range candidates {
				cResp, cErr := client.Get(cand)
				if cErr == nil && cResp.StatusCode == 200 {
					cBytes, rErr := io.ReadAll(cResp.Body)
					cResp.Body.Close()
					if rErr == nil {
						trimmed := strings.TrimSpace(string(cBytes))
						if !strings.HasPrefix(trimmed, "<") && (strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "openapi") || strings.HasPrefix(trimmed, "swagger")) {
							specContent = string(cBytes)
							resolved = true
							break
						}
					}
				}
			}

			if !resolved {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("The URL '%s' returned an HTML webpage instead of a raw OpenAPI JSON/YAML specification. For Swagger UI, please try appending '-json' (e.g. %s-json) or use the direct openapi.json / swagger.json URL.", fetchURL, cleanURL),
				})
				return
			}
		}
	}

	if strings.TrimSpace(specContent) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Specification content or valid URL is required"})
		return
	}

	doc, err := ParseSpec(specContent)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := req.CollectionName
	if name == "" {
		name = doc.Title
		if name == "" {
			name = "Imported OpenAPI Collection"
		}
	}

	db := database.GetDB()

	// Create Collection
	col := database.Collection{
		ID:          "col_" + uuid.New().String()[:8],
		WorkspaceID: workspaceID,
		Name:        name,
		Description: doc.Description,
		OrderIndex:  0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&col)

	// Create Requests
	type localItem struct {
		Key     string `json:"key"`
		Value   string `json:"value"`
		Enabled bool   `json:"enabled"`
	}

	for idx, ep := range doc.Endpoints {
		headers := []localItem{}
		params := []localItem{}

		for _, p := range ep.Parameters {
			if p.In == "query" {
				params = append(params, localItem{
					Key:     p.Name,
					Value:   p.Example,
					Enabled: true,
				})
			} else if p.In == "header" {
				headers = append(headers, localItem{
					Key:     p.Name,
					Value:   p.Example,
					Enabled: true,
				})
			}
		}

		headersJSON, _ := json.Marshal(headers)
		paramsJSON, _ := json.Marshal(params)

		bodyType := "none"
		bodyContent := ""
		if ep.RequestBody != "" {
			bodyType = "json"
			bodyContent = ep.RequestBody
		}

		reqItem := database.RequestItem{
			ID:           "req_" + uuid.New().String()[:8],
			WorkspaceID:  workspaceID,
			CollectionID: col.ID,
			Name:         ep.Summary,
			Description:  ep.Description,
			Method:       ep.Method,
			URL:          "{{baseUrl}}" + ep.Path,
			Headers:      string(headersJSON),
			Params:       string(paramsJSON),
			BodyType:     bodyType,
			BodyContent:  bodyContent,
			AuthType:     "none",
			OrderIndex:   idx,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		db.Create(&reqItem)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Collection imported successfully",
		"collection":     col,
		"requestsCount": len(doc.Endpoints),
	})
}
