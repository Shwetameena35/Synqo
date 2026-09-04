package database

import (
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedDemoData pre-populates realistic data if the database is empty
func SeedDemoData(db *gorm.DB) {
	var userCount int64
	db.Model(&User{}).Count(&userCount)
	if userCount > 0 {
		return
	}

	log.Println("Seeding realistic demo data for API Playground Hub...")

	// 1. Demo User
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	demoUser := User{
		ID:           "usr_demo_1",
		Name:         "Palak Sharma",
		Email:        "palak@apihub.dev",
		PasswordHash: string(hashedPassword),
		Role:         "admin",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.Create(&demoUser)

	collabUser := User{
		ID:           "usr_collab_2",
		Name:         "Alex Chen",
		Email:        "alex@apihub.dev",
		PasswordHash: string(hashedPassword),
		Role:         "developer",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.Create(&collabUser)

	// 2. Demo Workspace
	workspace := Workspace{
		ID:          "ws_demo_ecommerce",
		Name:        "Nexus Cloud & E-Commerce",
		Description: "Production APIs for catalog, auth, payments, and notifications.",
		OwnerID:     demoUser.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&workspace)

	// Members
	db.Create(&WorkspaceMember{
		ID:          "mem_1",
		WorkspaceID: workspace.ID,
		UserID:      demoUser.ID,
		UserEmail:   demoUser.Email,
		UserName:    demoUser.Name,
		Role:        "owner",
		JoinedAt:    time.Now(),
	})
	db.Create(&WorkspaceMember{
		ID:          "mem_2",
		WorkspaceID: workspace.ID,
		UserID:      collabUser.ID,
		UserEmail:   collabUser.Email,
		UserName:    collabUser.Name,
		Role:        "editor",
		JoinedAt:    time.Now(),
	})

	// 3. Demo Environments
	devEnv := Environment{
		ID:          "env_dev",
		WorkspaceID: workspace.ID,
		Name:        "Development",
		IsDefault:   true,
		Variables: `[
			{"key": "baseUrl", "value": "http://localhost:8080/api/v1", "isSecret": false, "enabled": true},
			{"key": "authToken", "value": "demo-bearer-token-xyz-123", "isSecret": true, "enabled": true},
			{"key": "version", "value": "v1", "isSecret": false, "enabled": true}
		]`,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&devEnv)

	prodEnv := Environment{
		ID:          "env_prod",
		WorkspaceID: workspace.ID,
		Name:        "Production",
		IsDefault:   false,
		Variables: `[
			{"key": "baseUrl", "value": "https://api.nexus-cloud.io/v1", "isSecret": false, "enabled": true},
			{"key": "authToken", "value": "prod-secret-bearer-98765", "isSecret": true, "enabled": true},
			{"key": "version", "value": "v1", "isSecret": false, "enabled": true}
		]`,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&prodEnv)

	// 4. Demo Collections
	colAuth := Collection{
		ID:          "col_auth",
		WorkspaceID: workspace.ID,
		Name:        "Authentication & Users",
		Description: "Endpoints for login, register, OAuth, and profile management",
		OrderIndex:  0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&colAuth)

	colProducts := Collection{
		ID:          "col_products",
		WorkspaceID: workspace.ID,
		Name:        "Product Catalog",
		Description: "Endpoints for querying inventory, categories, and item specs",
		OrderIndex:  1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&colProducts)

	colOrders := Collection{
		ID:          "col_orders",
		WorkspaceID: workspace.ID,
		Name:        "Orders & Checkout",
		Description: "Order creation, payment processing, and fulfillment",
		OrderIndex:  2,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&colOrders)

	// 5. Demo Requests
	reqListProducts := RequestItem{
		ID:           "req_products_list",
		WorkspaceID:  workspace.ID,
		CollectionID: colProducts.ID,
		Name:         "List Products",
		Description:  "Retrieve a paginated list of catalog items with active stock",
		Method:       "GET",
		URL:          "{{baseUrl}}/products",
		Headers:      `[{"key": "Accept", "value": "application/json", "enabled": true}]`,
		Params:       `[{"key": "page", "value": "1", "enabled": true}, {"key": "limit", "value": "20", "enabled": true}]`,
		BodyType:     "none",
		BodyContent:  "",
		AuthType:     "bearer",
		AuthConfig:   `{"token": "{{authToken}}"}`,
		Tests:        `[{"type": "status_code", "operator": "equals", "value": "200"}, {"type": "response_time", "operator": "less_than", "value": "300"}]`,
		OrderIndex:   0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.Create(&reqListProducts)

	reqCreateProduct := RequestItem{
		ID:           "req_products_create",
		WorkspaceID:  workspace.ID,
		CollectionID: colProducts.ID,
		Name:         "Create Product",
		Description:  "Add a new product with pricing, SKU, and metadata",
		Method:       "POST",
		URL:          "{{baseUrl}}/products",
		Headers:      `[{"key": "Content-Type", "value": "application/json", "enabled": true}]`,
		Params:       `[]`,
		BodyType:     "json",
		BodyContent:  `{\n  "title": "Quantum Mechanical Keyboard",\n  "price": 149.99,\n  "category": "Electronics",\n  "stock": 85\n}`,
		AuthType:     "bearer",
		AuthConfig:   `{"token": "{{authToken}}"}`,
		Tests:        `[{"type": "status_code", "operator": "equals", "value": "201"}]`,
		OrderIndex:   1,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.Create(&reqCreateProduct)

	reqLogin := RequestItem{
		ID:           "req_auth_login",
		WorkspaceID:  workspace.ID,
		CollectionID: colAuth.ID,
		Name:         "User Login",
		Description:  "Authenticate developer or customer and obtain JWT",
		Method:       "POST",
		URL:          "{{baseUrl}}/auth/login",
		Headers:      `[{"key": "Content-Type", "value": "application/json", "enabled": true}]`,
		Params:       `[]`,
		BodyType:     "json",
		BodyContent:  `{\n  "email": "palak@apihub.dev",\n  "password": "password123"\n}`,
		AuthType:     "none",
		AuthConfig:   `{}`,
		Tests:        `[{"type": "status_code", "operator": "equals", "value": "200"}]`,
		OrderIndex:   0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.Create(&reqLogin)

	reqProfile := RequestItem{
		ID:           "req_auth_profile",
		WorkspaceID:  workspace.ID,
		CollectionID: colAuth.ID,
		Name:         "Current User Profile",
		Description:  "Get profile information of currently logged in user",
		Method:       "GET",
		URL:          "{{baseUrl}}/auth/me",
		Headers:      `[{"key": "Accept", "value": "application/json", "enabled": true}]`,
		Params:       `[]`,
		BodyType:     "none",
		BodyContent:  "",
		AuthType:     "bearer",
		AuthConfig:   `{"token": "{{authToken}}"}`,
		Tests:        `[{"type": "status_code", "operator": "equals", "value": "200"}]`,
		OrderIndex:   1,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.Create(&reqProfile)

	// 6. Demo Mock Endpoints
	mockUsers := MockEndpoint{
		ID:              "mock_users",
		WorkspaceID:     workspace.ID,
		Name:            "Mock Users List",
		Method:          "GET",
		Path:            "/users",
		StatusCode:      200,
		ResponseHeaders: `{"Content-Type": "application/json", "X-Mock-By": "API-Playground-Hub"}`,
		ResponseBody: `[
  {
    "id": 1,
    "name": "Palak Sharma",
    "email": "palak@apihub.dev",
    "role": "Lead Architect",
    "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Palak"
  },
  {
    "id": 2,
    "name": "Alex Chen",
    "email": "alex@apihub.dev",
    "role": "Fullstack Engineer",
    "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Alex"
  },
  {
    "id": 3,
    "name": "Sarah Connor",
    "email": "sarah@cyberdyne.io",
    "role": "DevOps Specialist",
    "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Sarah"
  }
]`,
		DelayMs:   50,
		IsActive:  true,
		HitCount:  14,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&mockUsers)

	mockProducts := MockEndpoint{
		ID:              "mock_products",
		WorkspaceID:     workspace.ID,
		Name:            "Mock Products Endpoint",
		Method:          "GET",
		Path:            "/products",
		StatusCode:      200,
		ResponseHeaders: `{"Content-Type": "application/json"}`,
		ResponseBody: `[
  {
    "id": "prod_101",
    "title": "Ultra-Wide Gaming Monitor 34\"",
    "price": 649.99,
    "category": "Electronics",
    "inStock": true,
    "rating": 4.8
  },
  {
    "id": "prod_102",
    "title": "Wireless Ergonomic Mouse",
    "price": 79.50,
    "category": "Accessories",
    "inStock": true,
    "rating": 4.6
  },
  {
    "id": "prod_103",
    "title": "Noise-Cancelling Studio Headphones",
    "price": 299.00,
    "category": "Audio",
    "inStock": false,
    "rating": 4.9
  }
]`,
		DelayMs:   120,
		IsActive:  true,
		HitCount:  28,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&mockProducts)

	mockCheckout := MockEndpoint{
		ID:              "mock_checkout",
		WorkspaceID:     workspace.ID,
		Name:            "Mock Checkout Simulation",
		Method:          "POST",
		Path:            "/checkout",
		StatusCode:      201,
		ResponseHeaders: `{"Content-Type": "application/json"}`,
		ResponseBody: `{
  "status": "success",
  "orderId": "ord_8849102",
  "total": 378.50,
  "currency": "USD",
  "estimatedDelivery": "3 business days",
  "receiptUrl": "https://apihub.dev/receipts/ord_8849102"
}`,
		DelayMs:   350,
		IsActive:  true,
		HitCount:  9,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&mockCheckout)

	// 7. Initial Telemetry records
	for i := 0; i < 20; i++ {
		t := time.Now().Add(-time.Duration(20-i) * time.Minute)
		latency := int64(30 + (i*7)%65)
		status := 200
		isErr := false
		if i == 7 || i == 14 {
			status = 500
			isErr = true
		}
		db.Create(&MetricRecord{
			ID:          fmt.Sprintf("rec_seed_%d_%d", i, time.Now().UnixNano()),
			WorkspaceID: workspace.ID,
			Endpoint:    "/api/v1/mock/" + workspace.ID + "/users",
			Method:      "GET",
			StatusCode:  status,
			LatencyMs:   latency,
			IsError:     isErr,
			Timestamp:   t,
		})
	}

	log.Println("Demo data seeded successfully!")
}
