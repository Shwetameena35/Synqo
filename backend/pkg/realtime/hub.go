package realtime

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"api-playground-hub/pkg/database"
	"api-playground-hub/pkg/mock"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev/playground
	},
}

// WSMessage represents a structured real-time packet
type WSMessage struct {
	Type        string `json:"type"` // presence_join, presence_leave, presence_list, mock_hit, collection_updated, env_updated
	WorkspaceID string `json:"workspaceId"`
	UserID      string `json:"userId"`
	UserName    string `json:"userName"`
	Payload     any    `json:"payload"`
	Timestamp   int64  `json:"timestamp"`
}

// Client represents a connected WebSocket user
type Client struct {
	Hub         *Hub
	Conn        *websocket.Conn
	WorkspaceID string
	UserID      string
	UserName    string
	Send        chan []byte
}

// Hub manages workspace rooms, broadcasting, and active clients
type Hub struct {
	clients    map[*Client]bool
	workspaces map[string]map[*Client]bool
	broadcast  chan WSMessage
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

var GlobalHub *Hub

// InitHub initializes and runs the central WebSocket hub
func InitHub() *Hub {
	h := &Hub{
		clients:    make(map[*Client]bool),
		workspaces: make(map[string]map[*Client]bool),
		broadcast:  make(chan WSMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	GlobalHub = h

	// Hook into mock engine to stream live mock hits
	mock.OnMockHitCallback = func(hit database.MockRequestLog) {
		h.BroadcastToWorkspace(hit.WorkspaceID, WSMessage{
			Type:        "mock_hit",
			WorkspaceID: hit.WorkspaceID,
			Payload:     hit,
			Timestamp:   time.Now().UnixMilli(),
		})
	}

	go h.run()
	return h
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			if _, ok := h.workspaces[client.WorkspaceID]; !ok {
				h.workspaces[client.WorkspaceID] = make(map[*Client]bool)
			}
			h.workspaces[client.WorkspaceID][client] = true
			h.mutex.Unlock()

			// Broadcast presence join to workspace
			h.broadcastPresence(client.WorkspaceID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				if wsClients, ok := h.workspaces[client.WorkspaceID]; ok {
					delete(wsClients, client)
					if len(wsClients) == 0 {
						delete(h.workspaces, client.WorkspaceID)
					}
				}
			}
			h.mutex.Unlock()

			// Broadcast presence leave
			h.broadcastPresence(client.WorkspaceID)

		case msg := <-h.broadcast:
			msgBytes, err := json.Marshal(msg)
			if err != nil {
				continue
			}

			h.mutex.RLock()
			if wsClients, ok := h.workspaces[msg.WorkspaceID]; ok {
				for client := range wsClients {
					select {
					case client.Send <- msgBytes:
					default:
						close(client.Send)
						delete(h.clients, client)
						delete(wsClients, client)
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// broadcastPresence sends the current active user list to all in the workspace
func (h *Hub) broadcastPresence(workspaceID string) {
	h.mutex.RLock()
	var onlineUsers []map[string]string
	if wsClients, ok := h.workspaces[workspaceID]; ok {
		seen := make(map[string]bool)
		for c := range wsClients {
			if !seen[c.UserID] {
				seen[c.UserID] = true
				onlineUsers = append(onlineUsers, map[string]string{
					"userId":   c.UserID,
					"userName": c.UserName,
				})
			}
		}
	}
	h.mutex.RUnlock()

	msg := WSMessage{
		Type:        "presence_list",
		WorkspaceID: workspaceID,
		Payload:     onlineUsers,
		Timestamp:   time.Now().UnixMilli(),
	}
	h.broadcast <- msg
}

// BroadcastToWorkspace publishes a message to all clients in a workspace
func (h *Hub) BroadcastToWorkspace(workspaceID string, msg WSMessage) {
	h.broadcast <- msg
}

// HandleWebSocket upgrades HTTP to WebSocket and registers client
func HandleWebSocket(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	userID := c.DefaultQuery("userId", "usr_guest_"+time.Now().Format("150405"))
	userName := c.DefaultQuery("userName", "Collaborator")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v\n", err)
		return
	}

	client := &Client{
		Hub:         GlobalHub,
		Conn:        conn,
		WorkspaceID: workspaceID,
		UserID:      userID,
		UserName:    userName,
		Send:        make(chan []byte, 256),
	}

	GlobalHub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(4096)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var incoming WSMessage
		if err := json.Unmarshal(message, &incoming); err == nil {
			incoming.WorkspaceID = c.WorkspaceID
			incoming.UserID = c.UserID
			incoming.UserName = c.UserName
			incoming.Timestamp = time.Now().UnixMilli()
			c.Hub.broadcast <- incoming
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
