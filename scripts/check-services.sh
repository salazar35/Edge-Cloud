#!/bin/bash
# Edge Cloud - Service Health Checker
# Quickly diagnoses which services are running and identifies issues

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

echo "=== Edge Cloud - Service Health Check ==="
echo "Server IP: ${SERVER_IP:-localhost}"
echo ""

check_port() {
    local name=$1
    local port=$2
    local log_file="$LOG_DIR/${name}.log"

    if ss -tlnp 2>/dev/null | grep -q ":${port} " || lsof -i:$port >/dev/null 2>&1; then
        local pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1)
        echo -e "${GREEN}[RUNNING]${NC} $name → http://${SERVER_IP:-localhost}:$port (PID: ${pid:-?})"
    else
        echo -e "${RED}[STOPPED]${NC} $name (port $port)"
        if [ -f "$log_file" ]; then
            echo -e "  ${YELLOW}Last 5 lines of log:${NC}"
            tail -5 "$log_file" 2>/dev/null | sed 's/^/    /'
        fi
        echo ""
    fi
}

echo "--- Services ---"
check_port "backend" 8000
check_port "shell" 4200
check_port "mfe-cluster" 4201
check_port "mfe-workload" 4202

echo ""
echo "--- Python Virtual Environment ---"
VENV_DIR="$PROJECT_ROOT/backend/.venv"
if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/python" ]; then
    echo -e "${GREEN}[OK]${NC} venv: $VENV_DIR"
    echo "  Python: $($VENV_DIR/bin/python --version 2>&1)"
    echo "  Packages: $($VENV_DIR/bin/pip list 2>/dev/null | wc -l) installed"
else
    echo -e "${RED}[MISSING]${NC} venv not found at $VENV_DIR"
    echo "  Fix: python3 -m venv $VENV_DIR && source $VENV_DIR/bin/activate && pip install -r backend/requirements.txt"
fi

echo ""
echo "--- Node Modules ---"
for app in shell mfe-cluster mfe-workload; do
    dir="$PROJECT_ROOT/frontend/$app"
    if [ -d "$dir/node_modules" ] && [ -f "$dir/node_modules/.package-lock.json" ]; then
        pkg_count=$(ls "$dir/node_modules" 2>/dev/null | wc -l)
        echo -e "${GREEN}[OK]${NC} frontend/$app ($pkg_count packages)"
    elif [ -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}[PARTIAL]${NC} frontend/$app (incomplete install)"
        echo "  Fix: cd $dir && rm -rf node_modules && npm install"
    else
        echo -e "${RED}[MISSING]${NC} frontend/$app"
        echo "  Fix: cd $dir && npm install"
    fi
done

echo ""
echo "--- Backend API Test ---"
if curl -s --max-time 3 http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend API responding"
    curl -s http://localhost:8000/api/health 2>/dev/null | python3 -m json.tool 2>/dev/null | sed 's/^/  /'
else
    echo -e "${RED}[FAIL]${NC} Backend API not responding on :8000"
fi

echo ""
echo "--- Quick Fix Commands ---"
if ! ss -tlnp 2>/dev/null | grep -q ":8000 "; then
    echo "  Backend:      cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
fi
if ! ss -tlnp 2>/dev/null | grep -q ":4200 "; then
    echo "  Shell:        cd frontend/shell && npx ng serve --configuration development"
fi
if ! ss -tlnp 2>/dev/null | grep -q ":4201 "; then
    echo "  MFE Cluster:  cd frontend/mfe-cluster && npx ng serve --configuration development"
fi
if ! ss -tlnp 2>/dev/null | grep -q ":4202 "; then
    echo "  MFE Workload: cd frontend/mfe-workload && npx ng serve --configuration development"
fi

echo ""
echo "Logs directory: $LOG_DIR/"
