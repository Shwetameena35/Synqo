# ⚡ API Playground Hub

> **The All-in-One API Platform**: Postman + Swagger + Dynamic Mock Server + Multi-Language SDK Generator + Real-Time Collaboration & Telemetry.

---

## 🌟 The Problem & Solution

### The Problem
Every backend and frontend engineer works with APIs daily, but today's tooling is fragmented:
- **Postman** stores collections & runs manual tests
- **Swagger / Stoplight** stores static documentation
- **Mock servers** (Beeceptor, Mockoon) live on separate domains
- **SDK generation** requires third-party scripts or OpenAPI generator CLI
- **Logs & latency telemetry** are scattered across cloud loggers
- **Collaboration** requires paid enterprise tiers

### The Solution: API Playground Hub
A unified, high-performance developer workspace written in **Go** and **React + TypeScript** where engineering teams can:
1. **Design & Organize APIs**: Hierarchical collections, folders, environments, and dynamic `{{variable}}` substitution.
2. **Execute & Test APIs**: High-performance backend proxy with nanosecond latency timers, header inspection, and visual assertion evaluations.
3. **Dynamic Mock Server Engine**: Instant live mock URLs (`/api/v1/mock/:workspaceId/*path`) with configurable HTTP status codes, JSON/XML bodies, artificial latency simulation (to test loading spinners), and a real-time incoming traffic stream via WebSockets!
4. **Interactive OpenAPI / Swagger Docs**: Import OpenAPI 3.0 or Swagger 2.0 specs (JSON/YAML), browse interactive documentation, and test endpoints with one-click "Try in Runner".
5. **Multi-Language SDK Generator**: Instant generation of idiomatic, type-safe client libraries for **Go**, **TypeScript**, **Python**, and **Java 11+**.
6. **Real-Time Collaboration & Telemetry**: Live Google Docs-style collaborator presence, WebSocket workspace synchronization, and monitoring metrics (P50/P95/P99 latency, success rate, throughput).

---

## 📐 Architecture

```
                                  +---------------------------------------+
                                  |     React 19 + TypeScript Frontend    |
                                  |   (Tailwind CSS, Lucide, Dark UI)     |
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

## 🚀 Key Features Breakdown

### 1. 📁 Collections & Dynamic Environments
- Nested tree hierarchy: Workspace -> Collections -> Folders -> Requests.
- Full HTTP verb support: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Environment variable engine: Write `{{baseUrl}}/users` or `{{authToken}}` in URLs, headers, auth, or request bodies. Variables resolve automatically at runtime.

### 2. ⚡ Dynamic Mock Server Engine
- Create mock endpoints with custom routes (e.g. `GET /users`, `POST /checkout`).
- Custom response status code (`200`, `201`, `400`, `404`, `500`).
- Artificial delay simulation (0 to 3000ms) to test loading skeletons and race conditions.
- **Public Mock URL**: Each endpoint is instantly live at:
  `http://localhost:8080/api/v1/mock/:workspaceId/:path`
- **Real-Time Traffic Log**: Live stream of incoming mock requests (Client IP, method, headers, duration, payload) delivered instantly over WebSockets.

### 3. 🧪 High-Performance API Testing Runner
- Backend proxy client bypasses browser CORS issues when testing external APIs.
- Captures precise execution latency in milliseconds.
- Visual assertion builder:
  - `status_code equals 200`
  - `response_time less_than 300`
  - `body_contains "success"`
  - `header_exists "Content-Type"`
- Saves comprehensive test history with status badges, timestamps, and pass/fail cards.

### 4. 📖 OpenAPI 3.0 & Swagger Documentation Hub
- Drag-and-drop or paste OpenAPI 3.0 / Swagger 2.0 specs (JSON or YAML).
- Renders interactive documentation with tags, schemas, and parameter tables.
- One-click **"Try in Runner"** to load any documented endpoint into the tester.
- Export collections to OpenAPI 3.0 JSON format.

### 5. 📦 Multi-Language SDK Generator
- Generates production-ready API client code for:
  - **Go**: `net/http` client struct, context timeouts, request wrappers, and error decoders.
  - **TypeScript**: Universal `fetch` client class with typed async methods.
  - **Python**: Class-based client using `requests` with docstrings.
  - **Java**: Modern Java 11+ `HttpClient` implementation.
- In-browser code preview with one-click copy and source file download.

### 6. 🌐 Real-Time Collaboration & Telemetry
- Gorilla WebSocket room management per workspace.
- Live collaborator presence indicators with colored avatars.
- Live platform telemetry dashboard:
  - Total requests and error rates (%)
  - P50, P95, and P99 latency percentiles
  - Status code breakdown (2xx, 4xx, 5xx)
  - Time-series throughput chart

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Go 1.26+, Gin Web Framework, Gorilla WebSocket, GORM |
| **Storage (Dual)** | PostgreSQL (Production) / SQLite (Zero-setup local development) |
| **PubSub & Cache** | Redis (Production) / In-Memory Hub (Local development) |
| **DevOps** | Docker, Docker Compose, Kubernetes manifests |

---

## 🏁 Quick Start (Local Development)

The platform is designed with zero external setup friction. It runs on any machine with Go and Node.js installed without requiring external database servers!

### 1. Start the Go Backend
```bash
cd backend
go run cmd/server/main.go
```
*The server will start at `http://localhost:8080`, automatically initialize the database, and seed realistic demo e-commerce collections, environments, and mock endpoints.*

### 2. Start the React Frontend
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

- Web UI: `http://localhost:3000`
- API Server: `http://localhost:8080`
- Meilisearch: `http://localhost:7700`

---

## ☸️ Kubernetes Deployment (Phase 2)

```bash
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/backend-deployment.yaml
kubectl apply -f deploy/k8s/frontend-deployment.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

---

## 📚 API Endpoints Reference

### Dynamic Mock Server
| Method | Endpoint | Description |
|---|---|---|
| `ANY` | `/api/v1/mock/:workspaceId/*path` | Dispatches dynamic mock response matching method & path |

### API Test Runner
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/runner/execute` | Executes HTTP request through backend proxy and evaluates assertions |
| `GET` | `/api/v1/workspaces/:workspaceId/history` | Retrieves recent test execution history |

### Workspaces & Collections
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/workspaces` | Lists all workspaces |
| `GET` | `/api/v1/workspaces/:workspaceId/collections` | Returns collections with folders and requests |
| `POST` | `/api/v1/requests` | Creates a new request item |
| `PUT` | `/api/v1/requests/:id` | Updates request configuration |

### OpenAPI & SDK Generation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/workspaces/:workspaceId/openapi/import` | Imports OpenAPI spec into collections |
| `GET` | `/api/v1/collections/:collectionId/openapi/export` | Exports collection as OpenAPI 3.0 spec |
| `GET` | `/api/v1/collections/:collectionId/sdk?lang=go` | Generates Go, TypeScript, Python, or Java SDK |

### Telemetry & Real-Time
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/monitoring/metrics` | Returns latency percentiles and error metrics |
| `GET` | `/api/v1/ws/:workspaceId` | WebSocket connection for presence and live sync |
