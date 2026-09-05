package database

import (
	"log"
	"os"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes the database connection (PostgreSQL or SQLite dual-mode)
func InitDB() (*gorm.DB, error) {
	var dialector gorm.Dialector

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		log.Printf("Connecting to PostgreSQL at %s\n", dbURL)
		dialector = postgres.Open(dbURL)
	} else {
		dbPath := os.Getenv("SQLITE_PATH")
		if dbPath == "" {
			dbPath = "api_playground.db"
		}
		log.Printf("Using SQLite database at %s\n", dbPath)
		dialector = sqlite.Open(dbPath)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	// Run auto migrations
	err = db.AutoMigrate(
		&User{},
		&Workspace{},
		&WorkspaceMember{},
		&WorkspaceInvite{},
		&Collection{},
		&Folder{},
		&RequestItem{},
		&Environment{},
		&MockEndpoint{},
		&MockRequestLog{},
		&TestHistory{},
		&MetricRecord{},
		&RequestComment{},
	)
	if err != nil {
		return nil, err
	}

	DB = db
	log.Println("Database connection established and migrations completed successfully.")
	return DB, nil
}

// GetDB returns the global GORM database instance
func GetDB() *gorm.DB {
	return DB
}
