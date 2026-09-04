package tests

import (
	"strings"
	"testing"

	"api-playground-hub/pkg/database"
	"api-playground-hub/pkg/environment"
	"api-playground-hub/pkg/openapi"
	"api-playground-hub/pkg/runner"
	"api-playground-hub/pkg/sdkgen"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open in-memory sqlite: %v", err)
	}

	err = db.AutoMigrate(
		&database.User{},
		&database.Workspace{},
		&database.WorkspaceMember{},
		&database.Collection{},
		&database.Folder{},
		&database.RequestItem{},
		&database.Environment{},
		&database.MockEndpoint{},
		&database.MockRequestLog{},
		&database.TestHistory{},
		&database.MetricRecord{},
	)
	if err != nil {
		t.Fatalf("Failed to automigrate: %v", err)
	}

	database.SeedDemoData(db)
	return db
}

func TestSeedDemoData(t *testing.T) {
	db := setupTestDB(t)

	var userCount int64
	db.Model(&database.User{}).Count(&userCount)
	if userCount == 0 {
		t.Errorf("Expected seeded users, got 0")
	}

	var wsCount int64
	db.Model(&database.Workspace{}).Count(&wsCount)
	if wsCount == 0 {
		t.Errorf("Expected seeded workspaces, got 0")
	}

	var mockCount int64
	db.Model(&database.MockEndpoint{}).Count(&mockCount)
	if mockCount == 0 {
		t.Errorf("Expected seeded mock endpoints, got 0")
	}
}

func TestVariableResolver(t *testing.T) {
	db := setupTestDB(t)

	var env database.Environment
	if err := db.Where("is_default = ?", true).First(&env).Error; err != nil {
		t.Fatalf("Default env not found: %v", err)
	}

	input := "{{baseUrl}}/users"
	resolved := environment.ResolveVariables(input, env.ID, db)

	if strings.Contains(resolved, "{{baseUrl}}") {
		t.Errorf("Variable was not replaced: %s", resolved)
	}
	if !strings.Contains(resolved, "http") {
		t.Errorf("Expected resolved URL with http, got %s", resolved)
	}
}

func TestAssertionsEvaluator(t *testing.T) {
	rules := []runner.AssertionRule{
		{Type: "status_code", Operator: "equals", Value: "200"},
		{Type: "response_time", Operator: "less_than", Value: "500"},
		{Type: "body_contains", Operator: "contains", Value: "success"},
	}

	results := runner.EvaluateAssertions(rules, 200, 150, map[string][]string{}, `{"status": "success"}`)
	if len(results) != 3 {
		t.Fatalf("Expected 3 results, got %d", len(results))
	}

	for _, r := range results {
		if !r.Passed {
			t.Errorf("Expected assertion to pass, failed: %s (%s)", r.Rule.Type, r.Message)
		}
	}
}

func TestSDKGenerators(t *testing.T) {
	sampleRequests := []database.RequestItem{
		{
			Name:        "Get User Profile",
			Description: "Fetch current user profile",
			Method:      "GET",
			URL:         "{{baseUrl}}/users/me",
		},
		{
			Name:        "Create Order",
			Description: "Submit new checkout order",
			Method:      "POST",
			URL:         "{{baseUrl}}/orders",
		},
	}

	goCode := sdkgen.GenerateGoSDK("ShopClient", sampleRequests)
	if !strings.Contains(goCode, "GetUserProfile") || !strings.Contains(goCode, "CreateOrder") {
		t.Errorf("Go SDK missing generated methods: %s", goCode)
	}

	tsCode := sdkgen.GenerateTypeScriptSDK("ShopClient", sampleRequests)
	if !strings.Contains(tsCode, "getUserProfile") || !strings.Contains(tsCode, "createOrder") {
		t.Errorf("TypeScript SDK missing generated methods: %s", tsCode)
	}

	pyCode := sdkgen.GeneratePythonSDK("ShopClient", sampleRequests)
	if !strings.Contains(pyCode, "get_user_profile") || !strings.Contains(pyCode, "create_order") {
		t.Errorf("Python SDK missing generated methods: %s", pyCode)
	}
}

func TestOpenAPIParser(t *testing.T) {
	sampleSpec := `{
		"openapi": "3.0.0",
		"info": {
			"title": "Pet Store API",
			"version": "1.0.0"
		},
		"paths": {
			"/pets": {
				"get": {
					"summary": "List all pets",
					"responses": { "200": { "description": "OK" } }
				}
			}
		}
	}`

	parsed, err := openapi.ParseSpec(sampleSpec)
	if err != nil {
		t.Fatalf("Failed to parse OpenAPI spec: %v", err)
	}

	if parsed.Title != "Pet Store API" {
		t.Errorf("Expected title 'Pet Store API', got '%s'", parsed.Title)
	}
	if len(parsed.Endpoints) != 1 {
		t.Errorf("Expected 1 endpoint, got %d", len(parsed.Endpoints))
	}
	if parsed.Endpoints[0].Method != "GET" {
		t.Errorf("Expected GET method, got %s", parsed.Endpoints[0].Method)
	}
}
