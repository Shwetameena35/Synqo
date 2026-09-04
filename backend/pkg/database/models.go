package database

import (
	"time"
)

// User represents a platform user
type User struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Name         string    `gorm:"type:varchar(128);not null" json:"name"`
	Email        string    `gorm:"type:varchar(128);uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"type:varchar(256);not null" json:"-"`
	Role         string    `gorm:"type:varchar(32);default:'developer'" json:"role"` // admin, developer, viewer
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Workspace represents an isolated API workspace for teams
type Workspace struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	Name        string    `gorm:"type:varchar(128);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	OwnerID     string    `gorm:"type:varchar(64);not null" json:"ownerId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// WorkspaceMember represents a user's membership and permission in a workspace
type WorkspaceMember struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	UserID      string    `gorm:"type:varchar(64);index;not null" json:"userId"`
	UserEmail   string    `gorm:"type:varchar(128)" json:"userEmail"`
	UserName    string    `gorm:"type:varchar(128)" json:"userName"`
	Role        string    `gorm:"type:varchar(32);default:'editor'" json:"role"` // owner, editor, viewer
	JoinedAt    time.Time `json:"joinedAt"`
}

// WorkspaceInvite represents an invitation code/link for a workspace
type WorkspaceInvite struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	InviteCode  string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"inviteCode"`
	InvitedBy   string    `gorm:"type:varchar(64);not null" json:"invitedBy"`
	InviterName string    `gorm:"type:varchar(128)" json:"inviterName"`
	TargetEmail string    `gorm:"type:varchar(128);index" json:"targetEmail"` // optional: restricted to email
	Role        string    `gorm:"type:varchar(32);default:'editor'" json:"role"` // editor, viewer
	Status      string    `gorm:"type:varchar(32);default:'pending'" json:"status"` // pending, accepted, revoked
	ExpiresAt   time.Time `json:"expiresAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Collection represents a group of API requests (like a Postman Collection)
type Collection struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	Name        string    `gorm:"type:varchar(128);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	OrderIndex  int       `gorm:"default:0" json:"orderIndex"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Folder represents a folder inside a collection
type Folder struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	CollectionID string    `gorm:"type:varchar(64);index;not null" json:"collectionId"`
	ParentID     string    `gorm:"type:varchar(64);index" json:"parentId"` // Empty if root in collection
	Name         string    `gorm:"type:varchar(128);not null" json:"name"`
	OrderIndex   int       `gorm:"default:0" json:"orderIndex"`
	CreatedAt    time.Time `json:"createdAt"`
}

// RequestItem represents a single executable API request
type RequestItem struct {
	ID           string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID  string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	CollectionID string    `gorm:"type:varchar(64);index;not null" json:"collectionId"`
	FolderID     string    `gorm:"type:varchar(64);index" json:"folderId"` // optional
	Name         string    `gorm:"type:varchar(128);not null" json:"name"`
	Description  string    `gorm:"type:text" json:"description"`
	Method       string    `gorm:"type:varchar(16);not null" json:"method"` // GET, POST, PUT, DELETE, PATCH, etc.
	URL          string    `gorm:"type:text;not null" json:"url"`
	Headers      string    `gorm:"type:text" json:"headers"`     // JSON string: [{"key": "Content-Type", "value": "application/json", "enabled": true}]
	Params       string    `gorm:"type:text" json:"params"`      // JSON string: [{"key": "page", "value": "1", "enabled": true}]
	BodyType     string    `gorm:"type:varchar(32);default:'none'" json:"bodyType"` // none, json, raw, formdata
	BodyContent  string    `gorm:"type:text" json:"bodyContent"`
	AuthType     string    `gorm:"type:varchar(32);default:'none'" json:"authType"` // none, bearer, basic, apikey
	AuthConfig   string    `gorm:"type:text" json:"authConfig"`  // JSON string: {"token": "...", "username": "..."}
	Tests        string    `gorm:"type:text" json:"tests"`       // JSON string: [{"type": "status_code", "operator": "equals", "value": "200"}]
	OrderIndex   int       `gorm:"default:0" json:"orderIndex"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Environment represents a key-value variable environment (Dev, Staging, Prod)
type Environment struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	Name        string    `gorm:"type:varchar(128);not null" json:"name"`
	IsDefault   bool      `gorm:"default:false" json:"isDefault"`
	Variables   string    `gorm:"type:text" json:"variables"` // JSON string: [{"key": "baseUrl", "value": "http://localhost:8080", "isSecret": false, "enabled": true}]
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// MockEndpoint defines a dynamic mock route simulated by the platform
type MockEndpoint struct {
	ID              string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID     string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	Name            string    `gorm:"type:varchar(128);not null" json:"name"`
	Method          string    `gorm:"type:varchar(16);not null" json:"method"` // GET, POST, etc.
	Path            string    `gorm:"type:varchar(256);not null" json:"path"`   // e.g. /users, /products/:id
	StatusCode      int       `gorm:"default:200" json:"statusCode"`
	ResponseHeaders string    `gorm:"type:text" json:"responseHeaders"` // JSON string: {"Content-Type": "application/json"}
	ResponseBody    string    `gorm:"type:text" json:"responseBody"`
	DelayMs         int       `gorm:"default:0" json:"delayMs"` // Simulated latency in ms
	IsActive        bool      `gorm:"default:true" json:"isActive"`
	HitCount        int64     `gorm:"default:0" json:"hitCount"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// MockRequestLog logs requests that hit a mock endpoint
type MockRequestLog struct {
	ID             string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	MockEndpointID string    `gorm:"type:varchar(64);index" json:"mockEndpointId"`
	WorkspaceID    string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	Method         string    `gorm:"type:varchar(16)" json:"method"`
	Path           string    `gorm:"type:varchar(256)" json:"path"`
	ClientIP       string    `gorm:"type:varchar(64)" json:"clientIp"`
	Headers        string    `gorm:"type:text" json:"headers"`
	QueryParams    string    `gorm:"type:text" json:"queryParams"`
	Body           string    `gorm:"type:text" json:"body"`
	StatusCode     int       `json:"statusCode"`
	DurationMs     int64     `json:"durationMs"`
	Timestamp      time.Time `gorm:"index" json:"timestamp"`
}

// TestHistory tracks executions of requests in the test runner
type TestHistory struct {
	ID               string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID      string    `gorm:"type:varchar(64);index;not null" json:"workspaceId"`
	RequestItemID    string    `gorm:"type:varchar(64);index" json:"requestItemId"`
	RequestName      string    `gorm:"type:varchar(128)" json:"requestName"`
	Method           string    `gorm:"type:varchar(16)" json:"method"`
	URL              string    `gorm:"type:text" json:"url"`
	StatusCode       int       `json:"statusCode"`
	StatusText       string    `gorm:"type:varchar(64)" json:"statusText"`
	LatencyMs        int64     `json:"latencyMs"`
	ResponseSize     int64     `json:"responseSize"`
	ResponseHeaders  string    `gorm:"type:text" json:"responseHeaders"`
	ResponseBody     string    `gorm:"type:text" json:"responseBody"`
	AssertionsPassed int       `json:"assertionsPassed"`
	AssertionsTotal  int       `json:"assertionsTotal"`
	AssertionDetails string    `gorm:"type:text" json:"assertionDetails"` // JSON array
	ExecutedAt       time.Time `gorm:"index" json:"executedAt"`
}

// MetricRecord stores real-time telemetry metrics for monitoring
type MetricRecord struct {
	ID          string    `gorm:"primaryKey;type:varchar(64)" json:"id"`
	WorkspaceID string    `gorm:"type:varchar(64);index" json:"workspaceId"`
	Endpoint    string    `gorm:"type:varchar(256);index" json:"endpoint"`
	Method      string    `gorm:"type:varchar(16)" json:"method"`
	StatusCode  int       `json:"statusCode"`
	LatencyMs   int64     `json:"latencyMs"`
	IsError     bool      `gorm:"index" json:"isError"`
	Timestamp   time.Time `gorm:"index" json:"timestamp"`
}
