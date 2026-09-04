package workspace

import (
	"net/http"
	"strings"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CollectionWithTree includes folders and requests inside a collection
type CollectionWithTree struct {
	database.Collection
	Folders  []database.Folder      `json:"folders"`
	Requests []database.RequestItem `json:"requests"`
}

// ListWorkspaces lists all workspaces the user has access to
func ListWorkspaces(c *gin.Context) {
	db := database.GetDB()
	userIDVal, hasUser := c.Get("userId")
	emailVal, _ := c.Get("email")

	var workspaces []database.Workspace
	if hasUser && userIDVal != "" {
		userID := userIDVal.(string)
		userEmail := ""
		if emailVal != nil {
			userEmail = emailVal.(string)
		}
		// Return workspaces where user is owner, or member, or the preloaded demo workspace
		query := db.Where(
			"owner_id = ? OR id = 'ws_demo_ecommerce' OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ? OR user_email = ?)",
			userID, userID, userEmail,
		)
		query.Order("created_at asc").Find(&workspaces)
	} else {
		// Guest / unauthenticated: only expose the demo workspace
		db.Where("id = ?", "ws_demo_ecommerce").Order("created_at asc").Find(&workspaces)
		if len(workspaces) == 0 {
			db.Order("created_at asc").Limit(1).Find(&workspaces)
		}
	}
	c.JSON(http.StatusOK, workspaces)
}

// GetWorkspace returns a single workspace with members
func GetWorkspace(c *gin.Context) {
	id := c.Param("workspaceId")
	if id == "" {
		id = c.Param("id")
	}
	db := database.GetDB()

	var ws database.Workspace
	if err := db.First(&ws, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	// If not the public demo workspace, ensure user has access
	if ws.ID != "ws_demo_ecommerce" {
		userIDVal, hasUser := c.Get("userId")
		emailVal, _ := c.Get("email")
		if !hasUser || userIDVal == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Authentication required to access this workspace"})
			return
		}
		userID := userIDVal.(string)
		userEmail := ""
		if emailVal != nil {
			userEmail = emailVal.(string)
		}

		if ws.OwnerID != userID {
			var member database.WorkspaceMember
			if err := db.Where("workspace_id = ? AND (user_id = ? OR user_email = ?)", id, userID, userEmail).First(&member).Error; err != nil {
				c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this workspace"})
				return
			}
		}
	}

	var members []database.WorkspaceMember
	db.Where("workspace_id = ?", id).Find(&members)

	c.JSON(http.StatusOK, gin.H{
		"workspace": ws,
		"members":   members,
	})
}

// ListMembers returns all team members for a workspace
func ListMembers(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()

	var members []database.WorkspaceMember
	if err := db.Where("workspace_id = ?", workspaceID).Order("joined_at asc").Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}

	c.JSON(http.StatusOK, members)
}

// AddMember invites a new team member to the workspace
func AddMember(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Name  string `json:"name"`
		Role  string `json:"role"` // owner, editor, viewer
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role := req.Role
	if role != "owner" && role != "editor" && role != "viewer" {
		role = "editor"
	}

	name := req.Name
	if name == "" {
		name = req.Email
	}

	emailVal, _ := c.Get("email")
	if emailVal != nil && strings.EqualFold(strings.TrimSpace(req.Email), strings.TrimSpace(emailVal.(string))) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot invite yourself to your own workspace"})
		return
	}

	db := database.GetDB()

	// Check if already member
	var existing database.WorkspaceMember
	if err := db.Where("workspace_id = ? AND LOWER(user_email) = ?", workspaceID, strings.ToLower(req.Email)).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already a member of this workspace"})
		return
	}

	userID := "usr_" + uuid.New().String()[:8]
	var u database.User
	if err := db.Where("email = ?", req.Email).First(&u).Error; err == nil {
		userID = u.ID
		if req.Name == "" {
			name = u.Name
		}
	}

	member := database.WorkspaceMember{
		ID:          "mem_" + uuid.New().String()[:8],
		WorkspaceID: workspaceID,
		UserID:      userID,
		UserEmail:   req.Email,
		UserName:    name,
		Role:        role,
		JoinedAt:    time.Now(),
	}

	if err := db.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}

	c.JSON(http.StatusCreated, member)
}

// RemoveMember removes a team member from the workspace
func RemoveMember(c *gin.Context) {
	memberID := c.Param("memberId")
	db := database.GetDB()

	var member database.WorkspaceMember
	if err := db.First(&member, "id = ?", memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	if member.Role == "owner" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the workspace owner"})
		return
	}

	db.Delete(&member)
	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

// CreateWorkspace creates a new workspace
func CreateWorkspace(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, hasUser := c.Get("userId")
	emailVal, _ := c.Get("email")
	userID := "usr_demo_1"
	userEmail := "palak@apihub.dev"
	userName := "Creator"

	if hasUser && userIDVal != "" {
		if u, ok := userIDVal.(string); ok && u != "" {
			userID = u
		}
	}
	if emailVal != nil {
		if em, ok := emailVal.(string); ok && em != "" {
			userEmail = em
		}
	}

	db := database.GetDB()
	var creator database.User
	if err := db.First(&creator, "id = ?", userID).Error; err == nil {
		userName = creator.Name
		userEmail = creator.Email
	}

	ws := database.Workspace{
		ID:          "ws_" + uuid.New().String()[:8],
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.Create(&ws).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace"})
		return
	}

	// Add owner as member
	db.Create(&database.WorkspaceMember{
		ID:          "mem_" + uuid.New().String()[:8],
		WorkspaceID: ws.ID,
		UserID:      userID,
		UserEmail:   userEmail,
		UserName:    userName,
		Role:        "owner",
		JoinedAt:    time.Now(),
	})

	// Add default environment
	db.Create(&database.Environment{
		ID:          "env_" + uuid.New().String()[:8],
		WorkspaceID: ws.ID,
		Name:        "Development",
		IsDefault:   true,
		Variables:   `[{"key": "baseUrl", "value": "http://localhost:8080/api/v1", "isSecret": false, "enabled": true}]`,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	})

	c.JSON(http.StatusCreated, ws)
}

// ListCollections returns all collections in a workspace with their child requests and folders
func ListCollections(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()

	var collections []database.Collection
	if err := db.Where("workspace_id = ?", workspaceID).Order("order_index asc, created_at asc").Find(&collections).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load collections"})
		return
	}

	results := make([]CollectionWithTree, 0, len(collections))
	for _, col := range collections {
		var folders []database.Folder
		db.Where("collection_id = ?", col.ID).Order("order_index asc, created_at asc").Find(&folders)

		var requests []database.RequestItem
		db.Where("collection_id = ?", col.ID).Order("order_index asc, created_at asc").Find(&requests)

		results = append(results, CollectionWithTree{
			Collection: col,
			Folders:    folders,
			Requests:   requests,
		})
	}

	c.JSON(http.StatusOK, results)
}

// CreateCollection adds a collection
func CreateCollection(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col := database.Collection{
		ID:          "col_" + uuid.New().String()[:8],
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	db := database.GetDB()
	if err := db.Create(&col).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create collection"})
		return
	}

	c.JSON(http.StatusCreated, col)
}

// UpdateCollection modifies a collection
func UpdateCollection(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	var col database.Collection
	if err := db.First(&col, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Collection not found"})
		return
	}

	if req.Name != "" {
		col.Name = req.Name
	}
	col.Description = req.Description
	col.UpdatedAt = time.Now()
	db.Save(&col)

	c.JSON(http.StatusOK, col)
}

// DeleteCollection deletes a collection and its items
func DeleteCollection(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()

	db.Delete(&database.RequestItem{}, "collection_id = ?", id)
	db.Delete(&database.Folder{}, "collection_id = ?", id)
	db.Delete(&database.Collection{}, "id = ?", id)

	c.JSON(http.StatusOK, gin.H{"message": "Collection deleted"})
}

// CreateRequest creates a new request item inside a collection
func CreateRequest(c *gin.Context) {
	var req database.RequestItem
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ID == "" {
		req.ID = "req_" + uuid.New().String()[:8]
	}
	if req.Headers == "" {
		req.Headers = "[]"
	}
	if req.Params == "" {
		req.Params = "[]"
	}
	if req.BodyType == "" {
		req.BodyType = "none"
	}
	if req.AuthType == "" {
		req.AuthType = "none"
	}
	if req.Tests == "" {
		req.Tests = "[]"
	}
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	db := database.GetDB()
	if err := db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// GetRequest retrieves a single request
func GetRequest(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()

	var req database.RequestItem
	if err := db.First(&req, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	c.JSON(http.StatusOK, req)
}

// UpdateRequest updates an existing request
func UpdateRequest(c *gin.Context) {
	id := c.Param("id")
	var updated database.RequestItem
	if err := c.ShouldBindJSON(&updated); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	var req database.RequestItem
	if err := db.First(&req, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	req.Name = updated.Name
	req.Description = updated.Description
	req.Method = updated.Method
	req.URL = updated.URL
	req.Headers = updated.Headers
	req.Params = updated.Params
	req.BodyType = updated.BodyType
	req.BodyContent = updated.BodyContent
	req.AuthType = updated.AuthType
	req.AuthConfig = updated.AuthConfig
	req.Tests = updated.Tests
	req.FolderID = updated.FolderID
	req.UpdatedAt = time.Now()

	db.Save(&req)
	c.JSON(http.StatusOK, req)
}

// DeleteRequest deletes a request
func DeleteRequest(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()
	if err := db.Delete(&database.RequestItem{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete request"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Request deleted"})
}

// CreateInvite generates a shareable invite link/code for a workspace
func CreateInvite(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	userIDVal, _ := c.Get("userId")
	emailVal, _ := c.Get("email")
	nameVal, _ := c.Get("name")

	userID := ""
	if userIDVal != nil {
		userID = userIDVal.(string)
	}
	inviterName := "Workspace Owner"
	if nameVal != nil && nameVal.(string) != "" {
		inviterName = nameVal.(string)
	} else if emailVal != nil && emailVal.(string) != "" {
		inviterName = emailVal.(string)
	}

	var req struct {
		Role        string `json:"role"`        // editor, viewer
		TargetEmail string `json:"targetEmail"` // optional: specific user email
	}
	c.ShouldBindJSON(&req)

	role := req.Role
	if role != "viewer" && role != "editor" {
		role = "editor"
	}

	targetEmail := strings.TrimSpace(strings.ToLower(req.TargetEmail))
	if targetEmail != "" && emailVal != nil && strings.EqualFold(targetEmail, strings.TrimSpace(strings.ToLower(emailVal.(string)))) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot invite yourself to your own workspace"})
		return
	}

	db := database.GetDB()

	// Verify workspace exists
	var ws database.Workspace
	if err := db.First(&ws, "id = ?", workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	// Generate a unique, url-safe invite code
	inviteCode := "inv_" + uuid.New().String()[:12]

	invite := database.WorkspaceInvite{
		ID:          "inv_rec_" + uuid.New().String()[:8],
		WorkspaceID: workspaceID,
		InviteCode:  inviteCode,
		InvitedBy:   userID,
		InviterName: inviterName,
		TargetEmail: strings.TrimSpace(strings.ToLower(req.TargetEmail)),
		Role:        role,
		Status:      "pending",
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour), // 7 days validity
		CreatedAt:   time.Now(),
	}

	if err := db.Create(&invite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"invite":     invite,
		"inviteUrl":  "/join/" + inviteCode,
		"inviteCode": inviteCode,
	})
}

// ListInvites returns all pending invites for a workspace
func ListInvites(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	db := database.GetDB()

	var invites []database.WorkspaceInvite
	db.Where("workspace_id = ? AND status = ?", workspaceID, "pending").Order("created_at desc").Find(&invites)

	c.JSON(http.StatusOK, invites)
}

// GetInviteDetails retrieves public invitation info to render on the join page
func GetInviteDetails(c *gin.Context) {
	code := c.Param("inviteCode")
	db := database.GetDB()

	var invite database.WorkspaceInvite
	if err := db.Where("invite_code = ? AND status = ?", code, "pending").First(&invite).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation link is invalid or has expired"})
		return
	}

	if time.Now().After(invite.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "Invitation link has expired"})
		return
	}

	var ws database.Workspace
	db.First(&ws, "id = ?", invite.WorkspaceID)

	c.JSON(http.StatusOK, gin.H{
		"inviteCode":           invite.InviteCode,
		"workspaceId":          invite.WorkspaceID,
		"workspaceName":        ws.Name,
		"workspaceDescription": ws.Description,
		"inviterName":          invite.InviterName,
		"role":                 invite.Role,
		"targetEmail":          invite.TargetEmail,
		"expiresAt":            invite.ExpiresAt,
	})
}

// AcceptInvite adds the authenticated user into the workspace
func AcceptInvite(c *gin.Context) {
	code := c.Param("inviteCode")
	userIDVal, hasUser := c.Get("userId")
	emailVal, _ := c.Get("email")
	nameVal, _ := c.Get("name")

	if !hasUser || userIDVal == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You must be signed in to accept an invitation"})
		return
	}

	userID := userIDVal.(string)
	userEmail := ""
	if emailVal != nil {
		userEmail = emailVal.(string)
	}
	userName := userEmail
	if nameVal != nil && nameVal.(string) != "" {
		userName = nameVal.(string)
	}

	db := database.GetDB()

	var invite database.WorkspaceInvite
	if err := db.Where("invite_code = ? AND status = ?", code, "pending").First(&invite).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invitation"})
		return
	}

	if time.Now().After(invite.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "This invitation has expired"})
		return
	}

	// If restricted to a specific email, verify match
	if invite.TargetEmail != "" {
		if !strings.EqualFold(invite.TargetEmail, userEmail) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "This invitation was sent specifically to " + invite.TargetEmail + ". You are logged in as " + userEmail,
			})
			return
		}
	}

	// Check if already a member or owner
	var ws database.Workspace
	if err := db.First(&ws, "id = ?", invite.WorkspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if ws.OwnerID == userID {
		c.JSON(http.StatusOK, gin.H{
			"message":     "You are already the owner of this workspace",
			"workspaceId": ws.ID,
			"workspace":   ws,
		})
		return
	}

	var existing database.WorkspaceMember
	if err := db.Where("workspace_id = ? AND (user_id = ? OR user_email = ?)", ws.ID, userID, userEmail).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{
			"message":     "You are already a member of this workspace",
			"workspaceId": ws.ID,
			"workspace":   ws,
		})
		return
	}

	// Add user as member with verified identity
	newMember := database.WorkspaceMember{
		ID:          "mem_" + uuid.New().String()[:8],
		WorkspaceID: ws.ID,
		UserID:      userID,
		UserEmail:   userEmail,
		UserName:    userName,
		Role:        invite.Role,
		JoinedAt:    time.Now(),
	}

	if err := db.Create(&newMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join workspace"})
		return
	}

	// If invite was target-specific, mark as accepted
	if invite.TargetEmail != "" {
		invite.Status = "accepted"
		db.Save(&invite)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Successfully joined workspace",
		"workspaceId": ws.ID,
		"workspace":   ws,
		"member":      newMember,
	})
}

// GetUserInvitations returns pending invites for the logged-in user
func GetUserInvitations(c *gin.Context) {
	emailVal, hasEmail := c.Get("email")
	userIDVal, _ := c.Get("userId")
	if !hasEmail || emailVal == nil || emailVal.(string) == "" {
		c.JSON(http.StatusOK, []any{})
		return
	}
	userEmail := emailVal.(string)
	userID := ""
	if userIDVal != nil {
		userID = userIDVal.(string)
	}
	db := database.GetDB()

	type InviteWithWorkspace struct {
		InviteCode    string    `json:"inviteCode"`
		WorkspaceID   string    `json:"workspaceId"`
		WorkspaceName string    `json:"workspaceName"`
		InviterName   string    `json:"inviterName"`
		Role          string    `json:"role"`
		TargetEmail   string    `json:"targetEmail"`
		CreatedAt     time.Time `json:"createdAt"`
	}

	var results []InviteWithWorkspace
	db.Table("workspace_invites").
		Select("workspace_invites.invite_code, workspace_invites.workspace_id, workspaces.name as workspace_name, workspace_invites.inviter_name, workspace_invites.role, workspace_invites.target_email, workspace_invites.created_at").
		Joins("JOIN workspaces ON workspaces.id = workspace_invites.workspace_id").
		Where("LOWER(workspace_invites.target_email) = ? AND workspace_invites.status = ? AND workspace_invites.expires_at > ? AND workspaces.owner_id != ?", strings.ToLower(userEmail), "pending", time.Now(), userID).
		Order("workspace_invites.created_at desc").
		Scan(&results)

	c.JSON(http.StatusOK, results)
}
