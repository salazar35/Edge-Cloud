# Edge Cloud - Kubernetes Management Platform

## Architecture Overview

```
+----------------------------------------------------------+
|                    Angular Shell (Host)                    |
|  +-------------------+  +-----------------------------+  |
|  | MFE Cluster Mgmt  |  | MFE Workload Mgmt          |  |
|  | - Add/Remove K8s  |  | - Namespaces               |  |
|  | - Health Check     |  | - Workloads (Pods, Deploy) |  |
|  | - Cluster List     |  | - Deploy New Workload      |  |
|  +-------------------+  +-----------------------------+  |
+----------------------------------------------------------+
                          |  REST API + WebSocket
                          v
+----------------------------------------------------------+
|                  Backend (FastAPI)                         |
|  - Cluster Management APIs                               |
|  - Health Check Service                                  |
|  - Namespace APIs                                        |
|  - Workload APIs                                         |
|  - Deployment Service                                    |
+----------------------------------------------------------+
                          |
                          v
+----------------------------------------------------------+
|              Kubernetes Clusters (Multi-Cluster)          |
+----------------------------------------------------------+
```

## Project Structure

```
edge-cloud/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database setup
│   │   ├── models/            # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   └── cluster.py
│   │   ├── schemas/           # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── cluster.py
│   │   │   ├── namespace.py
│   │   │   └── workload.py
│   │   ├── services/          # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── cluster_service.py
│   │   │   ├── health_service.py
│   │   │   ├── namespace_service.py
│   │   │   └── workload_service.py
│   │   ├── routers/           # API routes
│   │   │   ├── __init__.py
│   │   │   ├── clusters.py
│   │   │   ├── namespaces.py
│   │   │   └── workloads.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── k8s_client.py  # Kubernetes client wrapper
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── shell/                  # Host/Shell Angular App
│   │   ├── src/
│   │   ├── angular.json
│   │   ├── package.json
│   │   └── webpack.config.js
│   ├── mfe-cluster/           # Micro-frontend: Cluster Management
│   │   ├── src/
│   │   ├── angular.json
│   │   ├── package.json
│   │   └── webpack.config.js
│   └── mfe-workload/          # Micro-frontend: Workload Management
│       ├── src/
│       ├── angular.json
│       ├── package.json
│       └── webpack.config.js
├── docker-compose.yml
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17 (monolith, micro-frontend ready) |
| Backend API | Python 3.11+, FastAPI, Uvicorn |
| K8s Client | kubernetes (Python client) |
| Database | SQLAlchemy + SQLite (dev) / PostgreSQL (prod) |
| Real-time | WebSocket (FastAPI WebSocket) |
| Containerization | Docker, Docker Compose |

## Features

| Module | Chức năng |
|--------|-----------|
| Dashboard | Tổng quan clusters, stats (total, connected, errors, nodes) |
| Cluster Management | Add/Edit/Delete cluster, Health Check (animated), Node details |
| Namespace Management | Create/Edit/Delete namespace, Labels, Annotations, Resource Quota, RBAC RoleBindings |
| Workload Management | List Deployments/StatefulSets/DaemonSets, Deploy new workload, Scale, Delete |

## API Endpoints

### Clusters
- `GET /api/clusters` - List all clusters
- `POST /api/clusters` - Add a new cluster
- `PATCH /api/clusters/{id}` - Update cluster info
- `DELETE /api/clusters/{id}` - Remove a cluster
- `GET /api/clusters/{id}/health` - Health check (nodes, components, version)
- `WS /api/clusters/ws/health` - Real-time health updates

### Namespaces
- `GET /api/clusters/{id}/namespaces` - List namespaces
- `GET /api/clusters/{id}/namespaces/{name}` - Get namespace detail (labels, annotations, quota, RBAC)
- `POST /api/clusters/{id}/namespaces` - Create namespace
- `PATCH /api/clusters/{id}/namespaces/{name}` - Update labels/annotations
- `DELETE /api/clusters/{id}/namespaces/{name}` - Delete namespace
- `POST /api/clusters/{id}/namespaces/{name}/resource-quota` - Set resource quota
- `DELETE /api/clusters/{id}/namespaces/{name}/resource-quota` - Remove resource quota
- `POST /api/clusters/{id}/namespaces/{name}/role-bindings` - Create RBAC RoleBinding
- `DELETE /api/clusters/{id}/namespaces/{name}/role-bindings/{rb}` - Delete RoleBinding

### Workloads
- `GET /api/clusters/{id}/namespaces/{ns}/workloads` - List workloads
- `GET /api/clusters/{id}/namespaces/{ns}/workloads/{name}` - Get workload details
- `POST /api/clusters/{id}/namespaces/{ns}/deployments` - Deploy new workload
- `DELETE /api/clusters/{id}/namespaces/{ns}/workloads/{name}` - Delete workload
- `PATCH /api/clusters/{id}/namespaces/{ns}/workloads/{name}/scale` - Scale workload

## Getting Started

### Target Environment
- **OS**: Ubuntu 24.04 LTS
- **Python**: 3.11+ (chạy trong virtual environment)
- **Node.js**: 20 LTS
- **Docker**: (optional) Docker CE + Docker Compose v2

### Quick Setup (Ubuntu 24.04)

```bash
# 1. Clone project
git clone <repo-url> edge-cloud && cd edge-cloud

# 2. Run setup script (installs all prerequisites + creates venv)
chmod +x scripts/setup-ubuntu.sh
./scripts/setup-ubuntu.sh

# 3. Start all services
chmod +x scripts/dev-start.sh
./scripts/dev-start.sh
```

### Manual Setup

#### Backend (Python Virtual Environment)

```bash
# Install system packages
sudo apt install -y python3 python3-venv python3-pip python3-dev

# Create and activate virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run backend (venv must be active)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Deactivate when done
deactivate
```

#### Frontend

```bash
# Install Node.js 20 LTS (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Shell (Host)
cd frontend/shell
npm install
npm start  # port 4200

# MFE Cluster
cd frontend/mfe-cluster
npm install
npm start  # port 4201

# MFE Workload
cd frontend/mfe-workload
npm install
npm start  # port 4202
```

### Docker Compose
```bash
docker compose up --build
```

---

## Quản lý hệ thống (Operations)

### Bật hệ thống

```bash
# Cách 1: Sử dụng script (recommended)
./scripts/dev-start.sh

# Cách 2: Bật từng service thủ công
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Shell frontend
cd frontend/shell
npx ng serve --configuration development

# Terminal 3 - MFE Cluster
cd frontend/mfe-cluster
npx ng serve --configuration development

# Terminal 4 - MFE Workload
cd frontend/mfe-workload
npx ng serve --configuration development
```

### Tắt hệ thống

```bash
# Cách 1: Script tắt tất cả services
./scripts/dev-stop.sh

# Cách 2: Nếu đang chạy dev-start.sh, nhấn Ctrl+C

# Cách 3: Kill từng service theo port
sudo lsof -ti:8000 | xargs kill -9   # Backend
sudo lsof -ti:4200 | xargs kill -9   # Shell
sudo lsof -ti:4201 | xargs kill -9   # MFE Cluster
sudo lsof -ti:4202 | xargs kill -9   # MFE Workload
```

### Clear / Reset hệ thống

```bash
# Reset toàn bộ (xóa dependencies, database, cache)
rm -rf backend/.venv
rm -rf backend/edge_cloud.db
rm -rf frontend/shell/node_modules frontend/shell/.angular
rm -rf frontend/mfe-cluster/node_modules frontend/mfe-cluster/.angular
rm -rf frontend/mfe-workload/node_modules frontend/mfe-workload/.angular
rm -rf logs/

# Cài đặt lại từ đầu
./scripts/setup-ubuntu.sh

# Chỉ reset database (xóa clusters đã đăng ký)
rm -f backend/edge_cloud.db
# Database sẽ tự tạo lại khi backend khởi động

# Chỉ reset frontend cache
rm -rf frontend/*/node_modules frontend/*/.angular
cd frontend/shell && npm install
cd frontend/mfe-cluster && npm install
cd frontend/mfe-workload && npm install

# Xóa logs
rm -rf logs/*
```

### Kiểm tra trạng thái hệ thống

```bash
./scripts/check-services.sh
```

---

## Network Ports & Firewall

### Ports của Edge Cloud Platform

| Service | Port | Protocol | Bind | Description |
|---------|------|----------|------|-------------|
| Shell (Host) | 4200 | HTTP | 0.0.0.0 | Giao diện web chính |
| MFE Cluster | 4201 | HTTP | 0.0.0.0 | Micro-frontend quản lý cluster |
| MFE Workload | 4202 | HTTP | 0.0.0.0 | Micro-frontend quản lý workload |
| Backend API | 8000 | HTTP | 0.0.0.0 | REST API + Swagger docs |
| WebSocket | 8000 | WS | 0.0.0.0 | Real-time health updates |

### Ports cần mở để kết nối tới K8s Clusters

Platform cần kết nối **outbound** tới các K8s clusters mà bạn đăng ký. Đảm bảo server chạy Edge Cloud có thể access tới:

| Port | Protocol | Direction | Description |
|------|----------|-----------|-------------|
| 6443 | TCP | Outbound | Kubernetes API Server (mặc định) |
| 443 | TCP | Outbound | Kubernetes API Server (nếu dùng HTTPS chuẩn) |
| 8443 | TCP | Outbound | Kubernetes API Server (một số cloud providers) |
| 10250 | TCP | Outbound | Kubelet API (nếu cần truy cập trực tiếp node) |

> **Lưu ý**: Port thực tế phụ thuộc vào cấu hình `server` trong kubeconfig. Kiểm tra field `clusters[].cluster.server` trong file kubeconfig.

### Firewall rules (UFW trên Ubuntu)

```bash
# Mở ports cho Edge Cloud Platform (cho phép truy cập từ LAN)
sudo ufw allow 4200/tcp comment "Edge Cloud - Web UI"
sudo ufw allow 8000/tcp comment "Edge Cloud - Backend API"

# Mở ports cho micro-frontends (cần thiết khi dev, production dùng reverse proxy)
sudo ufw allow 4201/tcp comment "Edge Cloud - MFE Cluster"
sudo ufw allow 4202/tcp comment "Edge Cloud - MFE Workload"

# Kiểm tra rules
sudo ufw status numbered

# Nếu dùng iptables thay vì ufw
sudo iptables -A INPUT -p tcp --dport 4200 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 4201 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 4202 -j ACCEPT
```

### Network Flow Diagram

```
 [Browser - Windows/Mac]
        |
        | HTTP :4200 (Web UI)
        | HTTP :8000 (API calls)
        v
 [Ubuntu Server - Edge Cloud]
        |
        | TCP :6443 (K8s API)
        v
 [Kubernetes Cluster 1]    [Kubernetes Cluster 2]    [...]
   - Nodes                   - Nodes
   - Namespaces              - Namespaces
   - Workloads               - Workloads
```

### Truy cập từ máy khác trong mạng LAN

```bash
# Xem IP của server
hostname -I

# Truy cập từ browser trên máy khác
# http://<server-ip>:4200
# Ví dụ: http://192.168.27.137:4200

# API Docs (Swagger)
# http://<server-ip>:8000/docs
```

---

## Scripts

| Script | Mô tả |
|--------|--------|
| `scripts/setup-ubuntu.sh` | Cài đặt prerequisites trên Ubuntu 24.04 (chạy 1 lần) |
| `scripts/fix-permissions.sh` | Fix quyền file khi copy từ Windows sang Ubuntu |
| `scripts/dev-start.sh` | Bật toàn bộ hệ thống (backend + frontend) |
| `scripts/dev-stop.sh` | Tắt toàn bộ services |
| `scripts/check-services.sh` | Kiểm tra trạng thái các services |
| `scripts/dev-start.ps1` | Bật hệ thống trên Windows (PowerShell) |
