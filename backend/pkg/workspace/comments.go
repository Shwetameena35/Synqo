package workspace

import (
	"net/http"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateCommentPayload struct {
	Content    string `json:"content" binding:"required"`
	ParentID   string `json:"parentId"`
	StatusCode int    `json:"statusCode"`
}

type UpdateCommentStatusPayload struct {
	Status string `json:"status" binding:"required"` // "open" or "resolved"
}

// ListComments returns all comments and nested replies for an API request
func ListComments(c *gin.Context) {
	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request ID is required"})
		return
	}

	db := database.GetDB()
	var allComments []database.RequestComment
	if err := db.Where("request_id = ?", requestID).Order("created_at asc").Find(&allComments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments: " + err.Error()})
		return
	}

	// Organize comments into parent/replies tree
	rootMap := make(map[string]*database.RequestComment)
	var rootComments []database.RequestComment
	var replies []database.RequestComment

	for _, cmt := range allComments {
		if cmt.ParentID == "" {
			cmtCopy := cmt
			cmtCopy.Replies = []database.RequestComment{}
			rootComments = append(rootComments, cmtCopy)
		} else {
			replies = append(replies, cmt)
		}
	}

	// Index root comments for quick reply attachment
	for i := range rootComments {
		rootMap[rootComments[i].ID] = &rootComments[i]
	}

	// Attach replies to parents
	for _, rep := range replies {
		if parent, exists := rootMap[rep.ParentID]; exists {
			parent.Replies = append(parent.Replies, rep)
		} else {
			// If parent not found, treat as root comment
			rep.Replies = []database.RequestComment{}
			rootComments = append(rootComments, rep)
		}
	}

	if rootComments == nil {
		rootComments = []database.RequestComment{}
	}

	c.JSON(http.StatusOK, rootComments)
}

// CreateComment creates a new comment or reply on an API request
func CreateComment(c *gin.Context) {
	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request ID is required"})
		return
	}

	var payload CreateCommentPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Content is required"})
		return
	}

	db := database.GetDB()

	// Verify request exists and get its workspaceId
	var reqItem database.RequestItem
	if err := db.Where("id = ?", requestID).First(&reqItem).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	// Determine author
	authorID := "usr_anonymous"
	authorName := "Team Member"
	authorEmail := ""

	if userIDVal, exists := c.Get("userId"); exists && userIDVal != "" {
		authorID = userIDVal.(string)
		var user database.User
		if err := db.Where("id = ?", authorID).First(&user).Error; err == nil {
			authorName = user.Name
			authorEmail = user.Email
		}
	} else if emailVal, exists := c.Get("email"); exists && emailVal != "" {
		authorEmail = emailVal.(string)
		authorName = authorEmail
	}

	newComment := database.RequestComment{
		ID:          "cmt_" + uuid.New().String()[:8],
		RequestID:   requestID,
		WorkspaceID: reqItem.WorkspaceID,
		ParentID:    payload.ParentID,
		AuthorID:    authorID,
		AuthorName:  authorName,
		AuthorEmail: authorEmail,
		Content:     payload.Content,
		Status:      "open",
		StatusCode:  payload.StatusCode,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.Create(&newComment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save comment: " + err.Error()})
		return
	}

	newComment.Replies = []database.RequestComment{}
	c.JSON(http.StatusCreated, newComment)
}

// ToggleResolveComment updates comment status (open vs resolved)
func ToggleResolveComment(c *gin.Context) {
	commentID := c.Param("commentId")
	if commentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment ID is required"})
		return
	}

	var payload UpdateCommentStatusPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status is required (open or resolved)"})
		return
	}

	db := database.GetDB()
	var comment database.RequestComment
	if err := db.Where("id = ?", commentID).First(&comment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	comment.Status = payload.Status
	comment.UpdatedAt = time.Now()
	if err := db.Save(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment status: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, comment)
}

// DeleteComment deletes a comment and its child replies
func DeleteComment(c *gin.Context) {
	commentID := c.Param("commentId")
	if commentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment ID is required"})
		return
	}

	db := database.GetDB()

	// Delete replies first
	_ = db.Where("parent_id = ?", commentID).Delete(&database.RequestComment{}).Error

	// Delete comment
	if err := db.Where("id = ?", commentID).Delete(&database.RequestComment{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}
