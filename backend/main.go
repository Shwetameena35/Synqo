package main

import (
	"log"
	"os"
	"strings"
	"time"

	"api-playground-hub/pkg/database"
	"api-playground-hub/pkg/realtime"
	"api-playground-hub/pkg/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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

	// Enable CORS for frontend and external tools
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-Mock-Server", "X-Mock-Endpoint-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 5. Register All Application Routes
	routes.RegisterRoutes(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("⚡ API Playground Hub Backend running at http://localhost:%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server startup failed: %v\n", err)
	}
}
