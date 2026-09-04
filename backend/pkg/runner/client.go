package runner

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"

	"api-playground-hub/pkg/database"
	"api-playground-hub/pkg/environment"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FormFieldItem represents a form-data or urlencoded item
type FormFieldItem struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
	Type    string `json:"type"` // "text" or "file"
}

// HeaderItem represents an outgoing HTTP header
type HeaderItem struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// ParamItem represents a query parameter
type ParamItem struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// AuthConfig defines credentials
type AuthConfig struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Password string `json:"password"`
	Key      string `json:"key"`
	Value    string `json:"value"`
	AddTo    string `json:"addTo"` // header or query
}

// ExecuteRequestPayload represents the payload sent from frontend runner
type ExecuteRequestPayload struct {
	WorkspaceID   string          `json:"workspaceId"`
	RequestItemID string          `json:"requestItemId"`
	RequestName   string          `json:"requestName"`
	EnvironmentID string          `json:"environmentId"`
	Method        string          `json:"method" binding:"required"`
	URL           string          `json:"url" binding:"required"`
	Headers       []HeaderItem    `json:"headers"`
	Params        []ParamItem     `json:"params"`
	BodyType      string          `json:"bodyType"` // none, json, raw
	BodyContent   string          `json:"bodyContent"`
	AuthType      string          `json:"authType"` // none, bearer, basic, apikey
	AuthConfig    AuthConfig      `json:"authConfig"`
	Tests         []AssertionRule `json:"tests"`
}

// ExecuteResponsePayload is the response returned to the frontend
type ExecuteResponsePayload struct {
	StatusCode       int               `json:"statusCode"`
	StatusText       string            `json:"statusText"`
	LatencyMs        int64             `json:"latencyMs"`
	ResponseSize     int64             `json:"responseSize"`
	Headers          map[string]string `json:"headers"`
	Body             string            `json:"body"`
	AssertionsPassed int               `json:"assertionsPassed"`
	AssertionsTotal  int               `json:"assertionsTotal"`
	AssertionDetails []AssertionResult `json:"assertionDetails"`
	HistoryID        string            `json:"historyId"`
}

// ExecuteRequest runs the HTTP request, records metrics, and evaluates assertions
func ExecuteRequest(c *gin.Context) {
	var payload ExecuteRequestPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// 1. Resolve variables in URL, headers, auth, and body
	targetURL := payload.URL
	bodyContent := payload.BodyContent
	if payload.EnvironmentID != "" {
		targetURL = environment.ResolveVariables(targetURL, payload.EnvironmentID, db)
		bodyContent = environment.ResolveVariables(bodyContent, payload.EnvironmentID, db)
	}

	// 2. Parse URL and append query parameters
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL: " + err.Error()})
		return
	}

	queryParams := parsedURL.Query()
	for _, p := range payload.Params {
		if p.Enabled && p.Key != "" {
			val := p.Value
			if payload.EnvironmentID != "" {
				val = environment.ResolveVariables(val, payload.EnvironmentID, db)
			}
			queryParams.Add(p.Key, val)
		}
	}
	parsedURL.RawQuery = queryParams.Encode()
	finalURL := parsedURL.String()

	// 3. Prepare Request Body
	var bodyReader io.Reader
	var autoContentType string

	switch strings.ToLower(payload.BodyType) {
	case "json":
		if bodyContent != "" {
			bodyReader = bytes.NewBufferString(bodyContent)
		}
		autoContentType = "application/json"

	case "raw":
		if bodyContent != "" {
			bodyReader = bytes.NewBufferString(bodyContent)
		}
		autoContentType = "text/plain"

	case "x-www-form-urlencoded":
		var formItems []FormFieldItem
		if err := json.Unmarshal([]byte(bodyContent), &formItems); err == nil && len(formItems) > 0 {
			formVals := url.Values{}
			for _, item := range formItems {
				if item.Enabled && item.Key != "" {
					k := item.Key
					v := item.Value
					if payload.EnvironmentID != "" {
						k = environment.ResolveVariables(k, payload.EnvironmentID, db)
						v = environment.ResolveVariables(v, payload.EnvironmentID, db)
					}
					formVals.Add(k, v)
				}
			}
			bodyReader = strings.NewReader(formVals.Encode())
		} else if bodyContent != "" {
			bodyReader = strings.NewReader(bodyContent)
		}
		autoContentType = "application/x-www-form-urlencoded"

	case "form-data", "formdata":
		var formItems []FormFieldItem
		if err := json.Unmarshal([]byte(bodyContent), &formItems); err == nil && len(formItems) > 0 {
			bodyBuf := &bytes.Buffer{}
			mpWriter := multipart.NewWriter(bodyBuf)
			for _, item := range formItems {
				if item.Enabled && item.Key != "" {
					k := item.Key
					v := item.Value
					if payload.EnvironmentID != "" {
						k = environment.ResolveVariables(k, payload.EnvironmentID, db)
						v = environment.ResolveVariables(v, payload.EnvironmentID, db)
					}
					if item.Type == "file" {
						part, err := mpWriter.CreateFormFile(k, "upload.bin")
						if err == nil {
							_, _ = io.WriteString(part, v)
						}
					} else {
						_ = mpWriter.WriteField(k, v)
					}
				}
			}
			_ = mpWriter.Close()
			bodyReader = bodyBuf
			autoContentType = mpWriter.FormDataContentType()
		} else if bodyContent != "" {
			bodyReader = strings.NewReader(bodyContent)
			autoContentType = "multipart/form-data"
		}
	}

	httpReq, err := http.NewRequest(strings.ToUpper(payload.Method), finalURL, bodyReader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create HTTP request: " + err.Error()})
		return
	}

	// 4. Set Headers
	for _, h := range payload.Headers {
		if h.Enabled && h.Key != "" {
			val := h.Value
			if payload.EnvironmentID != "" {
				val = environment.ResolveVariables(val, payload.EnvironmentID, db)
			}
			httpReq.Header.Set(h.Key, val)
		}
	}

	// Default Content-Type if not explicitly overridden by user
	if autoContentType != "" && httpReq.Header.Get("Content-Type") == "" {
		httpReq.Header.Set("Content-Type", autoContentType)
	}

	// 5. Handle Authentication
	switch payload.AuthType {
	case "bearer":
		token := payload.AuthConfig.Token
		if payload.EnvironmentID != "" {
			token = environment.ResolveVariables(token, payload.EnvironmentID, db)
		}
		if token != "" {
			httpReq.Header.Set("Authorization", "Bearer "+token)
		}
	case "basic":
		user := payload.AuthConfig.Username
		pass := payload.AuthConfig.Password
		if payload.EnvironmentID != "" {
			user = environment.ResolveVariables(user, payload.EnvironmentID, db)
			pass = environment.ResolveVariables(pass, payload.EnvironmentID, db)
		}
		auth := base64.StdEncoding.EncodeToString([]byte(user + ":" + pass))
		httpReq.Header.Set("Authorization", "Basic "+auth)
	case "apikey":
		key := payload.AuthConfig.Key
		val := payload.AuthConfig.Value
		if payload.EnvironmentID != "" {
			key = environment.ResolveVariables(key, payload.EnvironmentID, db)
			val = environment.ResolveVariables(val, payload.EnvironmentID, db)
		}
		if payload.AuthConfig.AddTo == "query" {
			q := httpReq.URL.Query()
			q.Add(key, val)
			httpReq.URL.RawQuery = q.Encode()
		} else {
			httpReq.Header.Set(key, val)
		}
	}

	// 6. Execute Request with custom Transport (timeout 30s, disable cert verification for dev mocks)
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	startTime := time.Now()
	resp, err := client.Do(httpReq)
	latencyMs := time.Since(startTime).Milliseconds()

	if err != nil {
		c.JSON(http.StatusOK, ExecuteResponsePayload{
			StatusCode:   504,
			StatusText:   "Gateway Timeout / Connection Error",
			LatencyMs:    latencyMs,
			ResponseSize: 0,
			Headers:      map[string]string{},
			Body:         "Error executing request: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	respBodyBytes, _ := io.ReadAll(resp.Body)
	respBodyStr := string(respBodyBytes)

	// Collect Headers
	respHeaders := make(map[string]string)
	for k, v := range resp.Header {
		respHeaders[k] = strings.Join(v, ", ")
	}

	// 7. Evaluate Assertions
	assertionResults := EvaluateAssertions(payload.Tests, resp.StatusCode, latencyMs, resp.Header, respBodyStr)
	passedCount := 0
	for _, ar := range assertionResults {
		if ar.Passed {
			passedCount++
		}
	}

	// 8. Store Test History
	respHeadersJSON, _ := json.Marshal(respHeaders)
	assertionDetailsJSON, _ := json.Marshal(assertionResults)

	historyEntry := database.TestHistory{
		ID:               "hist_" + uuid.New().String()[:8],
		WorkspaceID:      payload.WorkspaceID,
		RequestItemID:    payload.RequestItemID,
		RequestName:      payload.RequestName,
		Method:           payload.Method,
		URL:              finalURL,
		StatusCode:       resp.StatusCode,
		StatusText:       resp.Status,
		LatencyMs:        latencyMs,
		ResponseSize:     int64(len(respBodyBytes)),
		ResponseHeaders:  string(respHeadersJSON),
		ResponseBody:     respBodyStr,
		AssertionsPassed: passedCount,
		AssertionsTotal:  len(assertionResults),
		AssertionDetails: string(assertionDetailsJSON),
		ExecutedAt:       time.Now(),
	}
	db.Create(&historyEntry)

	// 9. Record Metric Record for Telemetry
	db.Create(&database.MetricRecord{
		ID:          "rec_" + uuid.New().String()[:8],
		WorkspaceID: payload.WorkspaceID,
		Endpoint:    parsedURL.Path,
		Method:      payload.Method,
		StatusCode:  resp.StatusCode,
		LatencyMs:   latencyMs,
		IsError:     resp.StatusCode >= 400,
		Timestamp:   time.Now(),
	})

	c.JSON(http.StatusOK, ExecuteResponsePayload{
		StatusCode:       resp.StatusCode,
		StatusText:       resp.Status,
		LatencyMs:        latencyMs,
		ResponseSize:     int64(len(respBodyBytes)),
		Headers:          respHeaders,
		Body:             respBodyStr,
		AssertionsPassed: passedCount,
		AssertionsTotal:  len(assertionResults),
		AssertionDetails: assertionResults,
		HistoryID:        historyEntry.ID,
	})
}

// GetHistory returns past test runner executions
func GetHistory(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()

	var history []database.TestHistory
	query := db.Where("workspace_id = ?", workspaceID)

	reqID := c.Query("requestId")
	if reqID != "" {
		query = query.Where("request_item_id = ?", reqID)
	}

	query.Order("executed_at desc").Limit(40).Find(&history)
	c.JSON(http.StatusOK, history)
}

// ClearHistory wipes test runner history for a workspace
func ClearHistory(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()
	db.Delete(&database.TestHistory{}, "workspace_id = ?", workspaceID)
	c.JSON(http.StatusOK, gin.H{"message": "Test history cleared"})
}
