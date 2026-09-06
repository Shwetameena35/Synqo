package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"api-playground-hub/pkg/auth"
	"api-playground-hub/pkg/database"
	"api-playground-hub/pkg/environment"
	"api-playground-hub/pkg/mock"
	"api-playground-hub/pkg/monitoring"
	"api-playground-hub/pkg/openapi"
	"api-playground-hub/pkg/realtime"
	"api-playground-hub/pkg/runner"
	"api-playground-hub/pkg/sdkgen"
	"api-playground-hub/pkg/workspace"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// loadEnv reads key-value pairs from .env and populates environment variables
func loadEnv() {
	candidates := []string{".env", "../.env", "backend/.env"}
	var envPath string
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			envPath = p
			break
		}
	}

	if envPath == "" {
		return
	}

	data, err := os.ReadFile(envPath)
	if err != nil {
		return
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
	log.Printf("📄 Loaded environment configuration from %s\n", envPath)
}

func main() {
	loadEnv()
	log.Println("🚀 Initializing API Playground Hub Backend...")

	// 1. Initialize Database (Dual-mode: PostgreSQL or local SQLite)
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to database: %v\n", err)
	}

	// 2. Seed realistic demo data
	database.SeedDemoData(db)

	// 3. Initialize WebSocket collaboration hub
	realtime.InitHub()

	// 4. Configure Gin Router
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// Enable CORS for frontend and tools
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-Mock-Server", "X-Mock-Endpoint-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"service":   "API Playground Hub",
			"version":   "1.0.0",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	apiV1 := router.Group("/api/v1")
	{
		// Real-time WebSocket connection
		apiV1.GET("/ws/:workspaceId", realtime.HandleWebSocket)

		// Dynamic Mock Server Serving Route (Accepts any HTTP verb!)
		apiV1.Any("/mock/:workspaceId/*path", mock.ServeMockEndpoint)

		// Live Catalog & Demo API Endpoints
		apiV1.GET("/products", func(c *gin.Context) {
			c.JSON(http.StatusOK, []gin.H{
				{"id": "prod_101", "title": "Quantum Mechanical Keyboard", "price": 149.99, "category": "Electronics", "inStock": true, "rating": 4.8},
				{"id": "prod_102", "title": "Wireless Ergonomic Mouse", "price": 79.50, "category": "Accessories", "inStock": true, "rating": 4.6},
				{"id": "prod_103", "title": "Noise-Cancelling Studio Headphones", "price": 299.00, "category": "Audio", "inStock": false, "rating": 4.9},
			})
		})

		apiV1.POST("/products", func(c *gin.Context) {
			var body map[string]any
			c.ShouldBindJSON(&body)
			c.JSON(http.StatusCreated, gin.H{
				"id": "prod_" + uuid.New().String()[:8],
				"status": "created",
				"product": body,
				"createdAt": time.Now().Format(time.RFC3339),
			})
		})

		apiV1.GET("/orders", func(c *gin.Context) {
			c.JSON(http.StatusOK, []gin.H{
				{"id": "ord_8849101", "customer": "palak@apihub.dev", "total": 149.99, "status": "shipped"},
				{"id": "ord_8849102", "customer": "alex@apihub.dev", "total": 378.50, "status": "processing"},
			})
		})

		apiV1.POST("/checkout", func(c *gin.Context) {
			c.JSON(http.StatusCreated, gin.H{
				"status": "success",
				"orderId": "ord_" + uuid.New().String()[:8],
				"total": 378.50,
				"currency": "USD",
				"estimatedDelivery": "3 business days",
				"receiptUrl": "https://apihub.dev/receipts/ord_8849102",
			})
		})

		apiV1.GET("/users", func(c *gin.Context) {
			c.JSON(http.StatusOK, []gin.H{
				{"id": 1, "name": "Palak Sharma", "email": "palak@apihub.dev", "role": "Lead Architect"},
				{"id": 2, "name": "Alex Chen", "email": "alex@apihub.dev", "role": "Fullstack Engineer"},
				{"id": 3, "name": "Sarah Connor", "email": "sarah@cyberdyne.io", "role": "DevOps Specialist"},
			})
		})

		// Auth Service routes
		authGroup := apiV1.Group("/auth")
		{
			authGroup.POST("/register", auth.Register)
			authGroup.POST("/login", auth.Login)
			authGroup.GET("/me", auth.AuthMiddleware(), auth.Me)
		}

		// Workspace routes
		wsGroup := apiV1.Group("/workspaces")
		wsGroup.Use(auth.OptionalAuthMiddleware())
		{
			wsGroup.GET("", workspace.ListWorkspaces)
			wsGroup.POST("", workspace.CreateWorkspace)
			wsGroup.GET("/:workspaceId", workspace.GetWorkspace)

			// Collections under workspace
			wsGroup.GET("/:workspaceId/collections", workspace.ListCollections)
			wsGroup.POST("/:workspaceId/collections", workspace.CreateCollection)

			// Environments under workspace
			wsGroup.GET("/:workspaceId/environments", environment.ListEnvironments)
			wsGroup.POST("/:workspaceId/environments", environment.CreateEnvironment)

			// Mock endpoints under workspace
			wsGroup.GET("/:workspaceId/mocks", mock.ListMockEndpoints)
			wsGroup.POST("/:workspaceId/mocks", mock.CreateMockEndpoint)
			wsGroup.GET("/:workspaceId/mock-logs", mock.GetMockLogs)
			wsGroup.DELETE("/:workspaceId/mock-logs", mock.ClearMockLogs)

			// Test history under workspace
			wsGroup.GET("/:workspaceId/history", runner.GetHistory)
			wsGroup.DELETE("/:workspaceId/history", runner.ClearHistory)

			// OpenAPI spec import into workspace
			wsGroup.POST("/:workspaceId/openapi/import", openapi.ImportOpenAPI)

			// Team members under workspace
			wsGroup.GET("/:workspaceId/members", workspace.ListMembers)
			wsGroup.POST("/:workspaceId/members", workspace.AddMember)
			wsGroup.PUT("/:workspaceId/members/:memberId/role", workspace.UpdateMemberRole)
			wsGroup.DELETE("/:workspaceId/members/:memberId", workspace.RemoveMember)
			wsGroup.POST("/:workspaceId/invites", workspace.CreateInvite)
			wsGroup.GET("/:workspaceId/invites", workspace.ListInvites)
		}

		// Public & Auth Invite endpoints
		apiV1.GET("/invites/:inviteCode", workspace.GetInviteDetails)
		apiV1.POST("/invites/:inviteCode/accept", auth.AuthMiddleware(), workspace.AcceptInvite)
		apiV1.GET("/user/invitations", auth.AuthMiddleware(), workspace.GetUserInvitations)

		// Collections direct operations
		colGroup := apiV1.Group("/collections")
		{
			colGroup.PUT("/:id", workspace.UpdateCollection)
			colGroup.DELETE("/:id", workspace.DeleteCollection)
			colGroup.GET("/:collectionId/openapi/export", openapi.ExportCollectionToOpenAPI)
			colGroup.GET("/:collectionId/sdk", sdkgen.GenerateCollectionSDK)
		}

		// Requests direct operations
		reqGroup := apiV1.Group("/requests")
		{
			reqGroup.POST("", workspace.CreateRequest)
			reqGroup.GET("/:id", workspace.GetRequest)
			reqGroup.PUT("/:id", workspace.UpdateRequest)
			reqGroup.DELETE("/:id", workspace.DeleteRequest)

			// Comments on requests
			reqGroup.GET("/:id/comments", workspace.ListComments)
			reqGroup.POST("/:id/comments", auth.OptionalAuthMiddleware(), workspace.CreateComment)
		}

		// Direct comment actions
		commentGroup := apiV1.Group("/comments")
		{
			commentGroup.PUT("/:commentId/status", workspace.ToggleResolveComment)
			commentGroup.DELETE("/:commentId", workspace.DeleteComment)
		}

		// Environments direct operations
		envGroup := apiV1.Group("/environments")
		{
			envGroup.PUT("/:id", environment.UpdateEnvironment)
			envGroup.DELETE("/:id", environment.DeleteEnvironment)
		}

		// Mocks direct operations
		mockGroup := apiV1.Group("/mocks")
		{
			mockGroup.PUT("/:id", mock.UpdateMockEndpoint)
			mockGroup.DELETE("/:id", mock.DeleteMockEndpoint)
		}

		// Test Runner Proxy execution
		apiV1.POST("/runner/execute", runner.ExecuteRequest)

		// OpenAPI Docs Preview
		apiV1.POST("/openapi/preview", openapi.ParseAndPreviewOpenAPI)

		// Monitoring Telemetry metrics
		apiV1.GET("/monitoring/metrics", monitoring.GetMetricsSummary)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("⚡ API Playground Hub Backend running at http://localhost:%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server startup failed: %v\n", err)
	}
}
