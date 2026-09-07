package routes

import (
	"net/http"
	"time"

	"api-playground-hub/pkg/auth"
	"api-playground-hub/pkg/environment"
	"api-playground-hub/pkg/mock"
	"api-playground-hub/pkg/monitoring"
	"api-playground-hub/pkg/openapi"
	"api-playground-hub/pkg/realtime"
	"api-playground-hub/pkg/runner"
	"api-playground-hub/pkg/sdkgen"
	"api-playground-hub/pkg/workspace"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RegisterRoutes registers all API endpoints and route groups onto the Gin engine
func RegisterRoutes(router *gin.Engine) {
	// Root Health Check
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

		// Dynamic Mock Server Serving Route (Accepts any HTTP verb)
		apiV1.Any("/mock/:workspaceId/*path", mock.ServeMockEndpoint)

		// Live Catalog & Demo API Endpoints
		registerDemoRoutes(apiV1)

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
}

// registerDemoRoutes defines sample endpoints for catalog, orders, and checkout
func registerDemoRoutes(apiV1 *gin.RouterGroup) {
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
			"id":        "prod_" + uuid.New().String()[:8],
			"status":    "created",
			"product":   body,
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
			"status":            "success",
			"orderId":           "ord_" + uuid.New().String()[:8],
			"total":             378.50,
			"currency":          "USD",
			"estimatedDelivery": "3 business days",
			"receiptUrl":        "https://apihub.dev/receipts/ord_8849102",
		})
	})

	apiV1.GET("/users", func(c *gin.Context) {
		c.JSON(http.StatusOK, []gin.H{
			{"id": 1, "name": "Palak Sharma", "email": "palak@apihub.dev", "role": "Lead Architect"},
			{"id": 2, "name": "Alex Chen", "email": "alex@apihub.dev", "role": "Fullstack Engineer"},
			{"id": 3, "name": "Sarah Connor", "email": "sarah@cyberdyne.io", "role": "DevOps Specialist"},
		})
	})
}
