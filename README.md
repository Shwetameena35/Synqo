# ⚡ Synqo

> **The Modern All-in-One API Development Platform**: Postman + Swagger + Dynamic Mock Server + Multi-Language SDK Studio + Real-Time Collaboration & Telemetry.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?logo=typescript)
![Go](https://img.shields.io/badge/Go-1.26+-00add8.svg?logo=go)
![Vite](https://img.shields.io/badge/Vite-8.0-646cff.svg?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38b2ac.svg?logo=tailwind-css)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg?logo=docker)

---

## 🌟 Overview: What is Synqo?

Modern backend and frontend teams work with APIs every day, but their workflow is fragmented across multiple disjointed tools:
- **Postman** for collections and manual tests
- **Swagger / Readme** for API specifications and static docs
- **Mock servers** (Beeceptor, Mockoon) on external domains
- **SDK generation** via separate CLI scripts or OpenAPI generator
- **Telemetry & latency tracking** spread across disparate cloud dashboards
- **Collaboration** locked behind expensive enterprise pricing tiers

**Synqo** solves this by unifying the entire API lifecycle into a single high-performance developer workspace built with **Go** and **React 19 + TypeScript**.

---

## 🚀 Key Feature Pillars

### 1. ⚡ High-Performance Request Builder & Testing Runner
- **Zero-CORS Backend Proxy**: Execute HTTP requests (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) via high-speed Go proxy with millisecond precision latency timers.
- **Instant cURL Import**:
  - *Smart URL Bar Paste*: Paste any raw `curl ...` command directly into the address bar to auto-populate method, endpoint, headers, body, and query parameters.
  - *Dedicated Import Modal*: Monospace cURL editor with 1-click preset templates (*JSON POST*, *GET with Params*, *Form Data Upload*, *Basic Auth*) and live parsed breakdown.
- **Keyboard Execution Shortcuts**:
  - `↵ Enter` directly in the address bar sends the request immediately.
  - `Ctrl + Enter` (or `Cmd + Enter`) triggers execution globally from any tab (Params, Headers, Body, Auth, Tests).
  - Rich hover tooltip on the Send button displays keyboard shortcuts.
- **Inline Dynamic Variable Highlighting & Inspector**:
  - `{{baseUrl}}` and other environment variables are highlighted inline inside the URL bar in Synqo orange (or rose if undefined) with zero wasted space.
  - Click directly on any variable in the address bar (or Ctrl+click) to open the **Variable Inspector Modal** to view, reveal masked secrets, copy, or edit and save values in-place.
- **Visual Assertion Builder & History**:
  - Test response status codes, response time thresholds, body text matches, and header checks.
  - Comprehensive historical execution log with one-click restore.

### 2. 📡 Dynamic Mock Server Studio
- Create live mock endpoints with custom routes (e.g. `GET /users`, `POST /orders`).
- Configurable response HTTP status codes (`200`, `201`, `400`, `404`, `500`).
- Artificial delay simulation (0ms to 3000ms) to test loading skeletons and race conditions.
- **Instant Public Mock URLs**:
  `http://localhost:8080/api/v1/mock/:workspaceId/*path`
- **Live Traffic Stream**: Real-time incoming mock requests (Client IP, method, headers, duration, body) delivered instantly over WebSockets.

### 3. 📖 OpenAPI 3.0 & Swagger Hub
- Drag-and-drop or paste OpenAPI 3.0 / Swagger 2.0 specifications (JSON or YAML).
- Interactive API documentation with schemas, parameters, tags, and request samples.
- One-click **"Try in Runner"** action loads documented endpoints straight into the Request Builder.
- Export collections back to OpenAPI 3.0 JSON format.

### 4. 📦 Multi-Language SDK Generator
- Auto-generate idiomatic, type-safe API client libraries:
  - **Go**: `net/http` client struct, context timeouts, request wrappers, and error decoders.
  - **TypeScript**: Universal `fetch` client class with typed async methods.
  - **Python**: Class-based client using `requests` with clean docstrings.
  - **Java**: Modern Java 11+ `HttpClient` implementation.
- In-browser code preview with one-click copy and source file download.

### 5. 👥 Team Collaboration & Telemetry
- **Google Docs-Style Presence**: Live collaborator avatars powered by Gorilla WebSockets.
- **Role Management**: Workspace owners can switch member roles between **`Editor`** and **`Viewer`**.
- **Team Comments & Issue Tracking**: Leave discussions, report broken/failing endpoints, reply in threads, and resolve issues directly on individual requests.
- **Live Monitoring Dashboard**:
  - Smooth animated count-up metrics for total requests, error rates, and average latency.
  - P50, P95, and P99 latency percentiles.
  - Status code distribution breakdown (2xx, 4xx, 5xx).
  - 5-minute time-series throughput charts.

### 6. 📱 Full Mobile, Tablet & Desktop Responsiveness
- **Off-Canvas Sidebar Drawer**: On viewports `< 1024px`, the dual-rail sidebar slides in as a mobile drawer with a glassmorphism backdrop. Automatically dismisses upon choosing a request or tab.
- **Adaptive Navigation Bar**: Hamburger menu button (☰), gracefully truncated workspace/environment names, compact `+` button, and a responsive **More Options** (`...`) dropdown menu.
- **Smart Segmented Mobile View Switcher**:
  - Replaces cramped 50%/50% columns on mobile with a full-width **`[ ⚡ Request ]` ⇄ `[ 📄 Response ]`** controller.
  - Auto-switches to the Response view immediately upon receiving an API execution response.
- **Horizontal Scroll Containers**: Request tabs and key-value tables scroll smoothly on small screens.

### 7. 🔐 Dynamic Environment Configuration & Auth
- **Configurable in `.env`**:
  - `JWT_EXPIRATION_HOURS=24`: Configurable token expiration duration (defaults to 24 hours).
  - `JWT_EXPIRES_IN=24h`: Flexible duration strings (e.g. `24h`, `7d`, `168h`, `30m`).
  - `JWT_SECRET=...`: Dynamic HMAC-SHA256 signature secret key.
- **Zero-Dependency Startup Loader**: Custom `loadEnv()` in Go loads `.env` or `../.env` automatically on startup without requiring external third-party dependencies.
- **Environment Persistence**: Workspace-specific active environment selection persists across browser refreshes via `localStorage`.

---

## 📐 Architecture

```
                                  +---------------------------------------+
                                  |     React 19 + TypeScript Frontend    |
                                  |   (Tailwind CSS, Lucide, Responsive)  |
                                  +-------------------+-------------------+
                                                      |
                                   HTTP REST / JSON   |    WebSockets (Live Presence,
                                                      |    Live Mock Stream & Sync)
                                                      v
                                  +-------------------+-------------------+
                                  |        Go API Gateway & Server        |
                                  |         (Gin Web Framework)           |
                                  +----+-----+----+----+----+-----+---+---+
                                       |     |    |    |    |     |   |
         +-----------------------------+     |    |    |    |     |   +-----------------------------+
         |               +-------------------+    |    +--+ |     |                                 |
         v               v                        v       v v     v                                 v
+----------------+ +----------------+ +----------------+ +----+ +----+-----------------+ +-----------------+
|  Auth Service  | | Workspace &    | |  Mock Server   | | API Testing| | OpenAPI/Docs  | | SDK Generator   |
| (JWT, Bcrypt,  | | Collections    | |  Engine        | | Runner     | | Service       | | (Go, TS, Py,    |
|  Roles/Teams)  | | & Environments | | (Delay/Routes) | | (Timings)  | | (Parser/Gen)  | |  Java, cURL)    |
+----------------+ +----------------+ +----------------+ +----+ +----+-----------------+ +-----------------+
         |               |                        |         |                 |                 |
         +---------------+------------------------+---------+-----------------+-----------------+
                                                  |
                                                  v
                                 +--------------------------------+
                                 |       Dual-Storage Engine      |
                                 | Production: PostgreSQL + Redis |
                                 | Local/Dev: SQLite + In-Memory  |
                                 +--------------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Custom Vector Favicon |
| **Backend** | Go 1.26+, Gin Web Framework, Gorilla WebSocket, GORM, `golang-jwt/v5`, `bcrypt` |
| **Storage (Dual)** | PostgreSQL (Production) / SQLite with zero-setup automatic migrations (Local) |
| **PubSub & Cache** | Redis (Production) / In-Memory Channel Hub (Local development) |
| **DevOps** | Docker, Docker Compose, Kubernetes manifests |

---

## 🏁 Quick Start (Local Development)

Synqo is engineered for zero-friction setup. It runs locally on any machine with Go and Node.js without requiring external database servers!

### Prerequisites
- [Go 1.22+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/) & npm

---

### 1. Configure Backend Environment
Create or adjust `backend/.env` (a template is available in `backend/.env.example`):

```env
PORT=8080
JWT_SECRET=api-playground-hub-secret-key-2026
JWT_EXPIRATION_HOURS=24
JWT_EXPIRES_IN=24h
SQLITE_PATH=api_playground.db
```

### 2. Start the Go Backend
```bash
cd backend
go run cmd/server/main.go
```
*The server will start at `http://localhost:8080`, auto-load `.env`, create the local SQLite database, and seed realistic demo e-commerce data.*

### 3. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🐳 Docker Deployment

To spin up the entire production container stack (PostgreSQL, Redis, Meilisearch, Go Backend, and React Frontend):

```bash
cd deploy
docker-compose up --build
```

- **Web UI**: `http://localhost:3000`
- **API Server**: `http://localhost:8080`
- **Meilisearch**: `http://localhost:7700`

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Scope | Action |
|---|---|---|
| `↵ Enter` | Address Bar | Send active API request |
| `Ctrl + Enter` / `Cmd + Enter` | Anywhere | Send active API request |
| `Ctrl + S` / `Cmd + S` | Anywhere | Save current request draft |
| `Click on {{var}}` | Address Bar | Inspect variable, reveal secret, or edit in-place |
| `Ctrl + Click on {{var}}` | Address Bar | Inspect dynamic variable |
| `Escape` | Modals & Menus | Dismiss dropdowns, sidebar drawer, or modal dialogs |

---

## 📚 Core API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Login and receive 24h JWT token |
| `GET` | `/api/v1/auth/me` | Retrieve profile of authenticated user |

### Dynamic Mock Server
| Method | Endpoint | Description |
|---|---|---|
| `ANY` | `/api/v1/mock/:workspaceId/*path` | Dispatches dynamic mock response matching method & route |
| `GET` | `/api/v1/workspaces/:workspaceId/mocks` | Lists all configured mock endpoints |
| `POST` | `/api/v1/workspaces/:workspaceId/mocks` | Creates a new mock endpoint with delay simulation |

### API Test Runner
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/runner/execute` | Executes HTTP request through backend proxy and evaluates assertions |
| `GET` | `/api/v1/workspaces/:workspaceId/history` | Retrieves recent test execution history |
| `DELETE` | `/api/v1/workspaces/:workspaceId/history` | Clears test execution history |

### Workspaces, Collections & Environments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/workspaces` | Lists all workspaces for current user |
| `POST` | `/api/v1/workspaces` | Creates a new workspace |
| `GET` | `/api/v1/workspaces/:workspaceId/collections` | Returns collections with folders and requests |
| `POST` | `/api/v1/workspaces/:workspaceId/collections` | Creates a new collection |
| `GET` | `/api/v1/workspaces/:workspaceId/environments` | Lists environments and variables |
| `PUT` | `/api/v1/environments/:id` | Updates environment variables |

### OpenAPI & SDK Generation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/workspaces/:workspaceId/openapi/import` | Imports OpenAPI/Swagger spec into collections |
| `GET` | `/api/v1/collections/:collectionId/openapi/export` | Exports collection as OpenAPI 3.0 spec |
| `GET` | `/api/v1/collections/:collectionId/sdk?lang=go` | Generates Go, TypeScript, Python, or Java SDK |

### Telemetry & Real-Time Collaboration
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/monitoring/metrics` | Returns throughput, latency percentiles, and error rate |
| `GET` | `/api/v1/ws/:workspaceId` | WebSocket connection for live presence, updates, and mock stream |

---

## 📄 License

This project is licensed under the MIT License.
