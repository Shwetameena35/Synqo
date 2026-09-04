package auth

import (
	"net/http"
	"os"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte(getEnv("JWT_SECRET", "api-playground-hub-secret-key-2026"))

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// Claims defines standard JWT claims with user details
type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string        `json:"token"`
	User  database.User `json:"user"`
}

// GenerateToken creates a signed JWT for a user
func GenerateToken(user database.User) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "api-playground-hub",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// Register creates a new user and returns a token
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	var existing database.User
	if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email is already registered"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	newUser := database.User{
		ID:           "usr_" + uuid.New().String()[:8],
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         "developer",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := db.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Also create a default personal workspace for the new user
	defaultWorkspace := database.Workspace{
		ID:          "ws_" + uuid.New().String()[:8],
		Name:        req.Name + "'s Workspace",
		Description: "Personal API development workspace",
		OwnerID:     newUser.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&defaultWorkspace)

	db.Create(&database.WorkspaceMember{
		ID:          "mem_" + uuid.New().String()[:8],
		WorkspaceID: defaultWorkspace.ID,
		UserID:      newUser.ID,
		UserEmail:   newUser.Email,
		UserName:    newUser.Name,
		Role:        "owner",
		JoinedAt:    time.Now(),
	})

	// Add default environment
	db.Create(&database.Environment{
		ID:          "env_" + uuid.New().String()[:8],
		WorkspaceID: defaultWorkspace.ID,
		Name:        "Development",
		IsDefault:   true,
		Variables:   `[{"key": "baseUrl", "value": "http://localhost:8080/api/v1", "isSecret": false, "enabled": true}]`,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	})

	// Add a starter collection with sample request
	starterCol := database.Collection{
		ID:          "col_" + uuid.New().String()[:8],
		WorkspaceID: defaultWorkspace.ID,
		Name:        "Getting Started",
		Description: "Sample requests for your new workspace",
		OrderIndex:  0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.Create(&starterCol)

	db.Create(&database.RequestItem{
		ID:           "req_" + uuid.New().String()[:8],
		WorkspaceID:  defaultWorkspace.ID,
		CollectionID: starterCol.ID,
		Name:         "Get Products (Catalog Demo)",
		Method:       "GET",
		URL:          "{{baseUrl}}/products",
		Headers:      `[{"key": "Accept", "value": "application/json", "enabled": true}]`,
		Params:       `[]`,
		BodyType:     "none",
		BodyContent:  "",
		AuthType:     "none",
		AuthConfig:   `{}`,
		Tests:        `[{"type": "status_code", "operator": "equals", "value": "200"}]`,
		OrderIndex:   0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	})

	token, err := GenerateToken(newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User:  newUser,
	})
}

// Login authenticates an existing user
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	var user database.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User:  user,
	})
}

// Me returns the currently authenticated user's profile
func Me(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	db := database.GetDB()
	var user database.User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}
