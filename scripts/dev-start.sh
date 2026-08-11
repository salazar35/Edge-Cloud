#!/bin/bash
# Edge Cloud - Development Start Script
# Target: Ubuntu 24.04
# Starts all services with error handling, timeouts, and health checks

echo "=== Edge Cloud - Starting Development Environment ==="
echo "Target OS: Ubuntu 24.04"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="$PROJECT_ROOT/backend/.venv"
LOG_DIR="$PROJECT_ROOT/logs"
PIDS=()

# Configuration
NPM_INSTALL_TIMEOUT=180    # seconds to wait for npm install
SERVICE_START_TIMEOUT=30   # seconds to wait for service port to be available
BACKEND_PORT=8000
SHELL_PORT=4200
MFE_CLUSTER_PORT=4201
MFE_WORKLOAD_PORT=4202

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Create logs directory
mkdir -p "$LOG_DIR"

# Get server IP for display
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

# ============================================================
# Utility Functions
# ============================================================

log_info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

port_in_use() {
    local port=$1
    ss -tlnp 2>/dev/null | grep -q ":${port} " || \
    netstat -tlnp 2>/dev/null | grep -q ":${port} " || \
    lsof -i:$port >/dev/null 2>&1
}

wait_for_port() {
    local port=$1
    local name=$2
    local timeout=$3
    local elapsed=0

    while [ $elapsed -lt $timeout ]; do
        if port_in_use $port; then
            log_success "$name is ready on port $port"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log_warn "$name not responding on port $port after ${timeout}s (may still be starting)"
    return 1
}

npm_install_safe() {
    local dir=$1
    local name=$2
    local log_file="$LOG_DIR/${name}-install.log"

    if [ -d "$dir/node_modules" ] && [ -f "$dir/node_modules/.package-lock.json" ]; then
        log_info "$name: node_modules exists, skipping install."
        return 0
    fi

    # Remove broken node_modules
    if [ -d "$dir/node_modules" ] && [ ! -f "$dir/node_modules/.package-lock.json" ]; then
        log_warn "$name: Incomplete node_modules, removing..."
        rm -rf "$dir/node_modules"
    fi

    log_info "$name: Installing npm dependencies (timeout: ${NPM_INSTALL_TIMEOUT}s)..."

    cd "$dir"

    # Attempt 1: Normal install
    if timeout "$NPM_INSTALL_TIMEOUT" npm install --loglevel=error > "$log_file" 2>&1; then
        log_success "$name: npm install completed."
        return 0
    fi

    local exit_code=$?

    # Permission error? Try to fix and retry
    if grep -qi "permission\|EACCES\|EPERM\|operation was rejected" "$log_file" 2>/dev/null; then
        log_warn "$name: Permission error. Fixing and retrying..."
        sudo chown -R "$(whoami):$(id -gn)" "$dir" "$HOME/.npm" 2>/dev/null
        rm -rf "$dir/node_modules" 2>/dev/null

        if timeout "$NPM_INSTALL_TIMEOUT" npm install --unsafe-perm --loglevel=error > "$log_file" 2>&1; then
            log_success "$name: npm install completed (after fix)."
            return 0
        fi
        exit_code=$?
    fi

    # Show error details
    log_error "$name: npm install FAILED (exit code: $exit_code)"
    log_error "  Log: $log_file"
    echo "  --- Last 10 lines ---"
    tail -10 "$log_file" 2>/dev/null | sed 's/^/  /'
    echo "  ---"
    return 1
}

start_service() {
    local name=$1
    local dir=$2
    local cmd=$3
    local port=$4
    local log_file="$LOG_DIR/${name}.log"

    if port_in_use "$port"; then
        log_warn "Port $port already in use. $name may be running."
        return 1
    fi

    log_info "Starting $name (port $port)..."

    cd "$dir"
    eval "$cmd" > "$log_file" 2>&1 &
    local pid=$!
    PIDS+=($pid)

    sleep 3
    if ! kill -0 $pid 2>/dev/null; then
        log_error "$name failed to start!"
        echo "  --- Last 15 lines of $log_file ---"
        tail -15 "$log_file" 2>/dev/null | sed 's/^/  /'
        echo "  ---"
        return 1
    fi

    log_info "$name started (PID: $pid)"
    echo "$pid" > "$LOG_DIR/${name}.pid"
    return 0
}

cleanup() {
    echo ""
    log_info "Shutting down all services..."
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null && log_info "  Killed PID $pid"
    done
    jobs -p | xargs -r kill 2>/dev/null
    deactivate 2>/dev/null
    log_success "All services stopped."
    exit 0
}

trap cleanup INT TERM EXIT

# ============================================================
# Prerequisites Check
# ============================================================

echo "--- Checking Prerequisites ---"
echo ""

PREREQ_OK=true

command -v python3 &>/dev/null && log_success "Python: $(python3 --version)" || { log_error "Python3 not found"; PREREQ_OK=false; }
command -v node &>/dev/null && log_success "Node: $(node --version)" || { log_error "Node.js not found. Install Node.js 20: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"; PREREQ_OK=false; }
command -v npm &>/dev/null && log_success "npm: $(npm --version)" || { log_error "npm not found"; PREREQ_OK=false; }
python3 -m venv --help &>/dev/null || { log_error "python3-venv missing: sudo apt install python3-venv"; PREREQ_OK=false; }

[ "$PREREQ_OK" = false ] && { log_error "Prerequisites failed."; exit 1; }
echo ""

# ============================================================
# Fix Permissions
# ============================================================

echo "--- Checking Permissions ---"
echo ""

CURRENT_USER=$(whoami)
PROJECT_OWNER=$(stat -c '%U' "$PROJECT_ROOT" 2>/dev/null)

if [ "$PROJECT_OWNER" != "$CURRENT_USER" ]; then
    log_warn "Fixing project ownership ($PROJECT_OWNER → $CURRENT_USER)..."
    sudo chown -R "$CURRENT_USER:$(id -gn)" "$PROJECT_ROOT"
    log_success "Fixed."
fi

if [ -d "$HOME/.npm" ]; then
    NPM_OWNER=$(stat -c '%U' "$HOME/.npm" 2>/dev/null)
    if [ "$NPM_OWNER" != "$CURRENT_USER" ]; then
        sudo chown -R "$CURRENT_USER:$(id -gn)" "$HOME/.npm"
        log_success "npm cache ownership fixed."
    fi
fi

log_success "Permissions OK."
echo ""

# ============================================================
# Backend Setup (Python Virtual Environment)
# ============================================================

echo "--- Setting up Backend ---"
echo ""

if [ ! -d "$VENV_DIR" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR" || { log_error "Failed to create venv"; exit 1; }
    log_success "Venv created: $VENV_DIR"
else
    log_success "Venv exists: $VENV_DIR"
fi

log_info "Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip -q 2>"$LOG_DIR/pip-upgrade.log"
if pip install -r "$PROJECT_ROOT/backend/requirements.txt" -q 2>"$LOG_DIR/pip-install.log"; then
    log_success "Python dependencies installed."
else
    log_error "pip install failed! Check: $LOG_DIR/pip-install.log"
    tail -10 "$LOG_DIR/pip-install.log" | sed 's/^/  /'
    exit 1
fi
echo ""

# Start Backend
start_service "backend" "$PROJECT_ROOT/backend" \
    "source $VENV_DIR/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT" \
    $BACKEND_PORT

wait_for_port $BACKEND_PORT "Backend" $SERVICE_START_TIMEOUT || true
echo ""

# ============================================================
# Frontend Setup
# ============================================================

echo "--- Setting up Frontend ---"
echo ""

FRONTEND_OK=true

npm_install_safe "$PROJECT_ROOT/frontend/shell" "shell" || FRONTEND_OK=false
npm_install_safe "$PROJECT_ROOT/frontend/mfe-cluster" "mfe-cluster" || FRONTEND_OK=false
npm_install_safe "$PROJECT_ROOT/frontend/mfe-workload" "mfe-workload" || FRONTEND_OK=false

echo ""

if [ "$FRONTEND_OK" = false ]; then
    log_warn "Some frontend installs failed."
    read -p "Continue starting available services? [Y/n] " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Nn]$ ]] && { log_info "Aborting."; exit 1; }
fi

# ============================================================
# Start Frontend Services
# ============================================================

echo "--- Starting Frontend Services ---"
echo ""

# Shell uses standard @angular-devkit builder (port configured in angular.json)
if [ -d "$PROJECT_ROOT/frontend/shell/node_modules" ]; then
    start_service "shell" "$PROJECT_ROOT/frontend/shell" \
        "npx ng serve --configuration development" \
        $SHELL_PORT
    sleep 5
else
    log_warn "Shell: Skipped (no node_modules)"
fi

# MFE Cluster uses ngx-build-plus builder (port configured in angular.json)
if [ -d "$PROJECT_ROOT/frontend/mfe-cluster/node_modules" ]; then
    start_service "mfe-cluster" "$PROJECT_ROOT/frontend/mfe-cluster" \
        "npx ng serve --configuration development" \
        $MFE_CLUSTER_PORT
    sleep 5
else
    log_warn "MFE Cluster: Skipped (no node_modules)"
fi

# MFE Workload uses ngx-build-plus builder (port configured in angular.json)
if [ -d "$PROJECT_ROOT/frontend/mfe-workload/node_modules" ]; then
    start_service "mfe-workload" "$PROJECT_ROOT/frontend/mfe-workload" \
        "npx ng serve --configuration development" \
        $MFE_WORKLOAD_PORT
    sleep 5
else
    log_warn "MFE Workload: Skipped (no node_modules)"
fi

echo ""

# ============================================================
# Health Check
# ============================================================

echo "--- Health Check ---"
echo ""

sleep 5

check_svc() {
    if port_in_use $2; then
        log_success "$1: running on port $2"
    else
        log_warn "$1: NOT running (check $LOG_DIR/${1}.log)"
    fi
}

check_svc "backend" $BACKEND_PORT
check_svc "shell" $SHELL_PORT
check_svc "mfe-cluster" $MFE_CLUSTER_PORT
check_svc "mfe-workload" $MFE_WORKLOAD_PORT

echo ""
echo "=== Development Environment Ready ==="
echo ""
echo "Access from this machine:"
echo "  http://localhost:$SHELL_PORT"
echo ""
echo "Access from other machines (LAN):"
echo "  http://$SERVER_IP:$SHELL_PORT"
echo ""
echo "All services:"
echo "  Shell (Host):       http://$SERVER_IP:$SHELL_PORT"
echo "  MFE Cluster:        http://$SERVER_IP:$MFE_CLUSTER_PORT"
echo "  MFE Workload:       http://$SERVER_IP:$MFE_WORKLOAD_PORT"
echo "  Backend API:        http://$SERVER_IP:$BACKEND_PORT"
echo "  API Docs (Swagger): http://$SERVER_IP:$BACKEND_PORT/docs"
echo ""
echo "Logs: $LOG_DIR/"
echo "  tail -f $LOG_DIR/backend.log"
echo "  tail -f $LOG_DIR/shell.log"
echo "  tail -f $LOG_DIR/mfe-cluster.log"
echo "  tail -f $LOG_DIR/mfe-workload.log"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

wait
