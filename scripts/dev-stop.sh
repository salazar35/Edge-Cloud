#!/bin/bash
# Edge Cloud - Stop all development services
# Kills processes on dev ports (8000, 4200, 4201, 4202)

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

echo "=== Edge Cloud - Stopping Services ==="
echo ""

kill_port() {
    local port=$1
    local name=$2

    # Try ss first
    local pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u)

    # Fallback to lsof
    if [ -z "$pids" ]; then
        pids=$(lsof -ti:$port 2>/dev/null)
    fi

    if [ -n "$pids" ]; then
        echo -e "${CYAN}Stopping $name (port $port, PIDs: $pids)${NC}"
        echo "$pids" | xargs kill 2>/dev/null
        sleep 1
        # Force kill survivors
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
        done
        echo -e "${GREEN}  Stopped.${NC}"
    else
        echo "  $name (port $port): not running"
    fi
}

kill_port 8000 "Backend (FastAPI)"
kill_port 4200 "Shell (Angular)"
kill_port 4201 "MFE Cluster"
kill_port 4202 "MFE Workload"

# Clean PID files
rm -f "$LOG_DIR"/*.pid 2>/dev/null

echo ""
echo -e "${GREEN}All services stopped.${NC}"
