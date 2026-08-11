#!/bin/bash
# Edge Cloud - Ubuntu 24.04 Setup Script
# Run this once after cloning/copying the project to set up all prerequisites
# Usage: sudo ./scripts/setup-ubuntu.sh

set -e

echo "=== Edge Cloud - Ubuntu 24.04 Setup ==="
echo ""

# Determine target user
if [ -n "$SUDO_USER" ]; then
    TARGET_USER="$SUDO_USER"
    TARGET_HOME="/home/$SUDO_USER"
else
    TARGET_USER=$(whoami)
    TARGET_HOME="$HOME"
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Project: $PROJECT_ROOT"
echo "User:    $TARGET_USER"
echo ""

# [1/6] Update system
echo "[1/6] Updating system packages..."
apt update && apt upgrade -y

# [2/6] Install Python 3 + venv + pip + dev tools
echo "[2/6] Installing Python 3, venv, pip, and build tools..."
apt install -y python3 python3-venv python3-pip python3-dev build-essential dos2unix

# [3/6] Install Node.js 20 LTS
echo "[3/6] Installing Node.js 20 LTS..."
if ! command -v node &>/dev/null || [[ "$(node --version)" == v18* ]]; then
    # Remove old Node.js if present
    apt remove -y nodejs 2>/dev/null
    rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "  Installed: $(node --version)"
else
    echo "  Already installed: $(node --version)"
fi

# [4/6] Install Docker (optional)
echo "[4/6] Installing Docker..."
if ! command -v docker &>/dev/null; then
    apt install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    usermod -aG docker "$TARGET_USER"
    echo "  Docker installed. Re-login for group to take effect."
else
    echo "  Already installed: $(docker --version)"
fi

# [5/6] Fix permissions & line endings
echo "[5/6] Fixing permissions and line endings..."

# Ownership
chown -R "$TARGET_USER:$(id -gn $TARGET_USER)" "$PROJECT_ROOT"

# Fix line endings (Windows CRLF → Unix LF)
find "$PROJECT_ROOT" -type f \( \
    -name "*.sh" -o -name "*.py" -o -name "*.ts" -o -name "*.js" \
    -o -name "*.json" -o -name "*.html" -o -name "*.scss" -o -name "*.css" \
    -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" -o -name "*.txt" \
    -o -name "*.conf" -o -name "Dockerfile" -o -name ".gitignore" \
    -o -name ".env*" \
\) -exec dos2unix -q {} \; 2>/dev/null

# Make scripts executable
find "$PROJECT_ROOT/scripts" -type f -exec chmod 755 {} \;

# Fix npm cache if exists
if [ -d "$TARGET_HOME/.npm" ]; then
    chown -R "$TARGET_USER:$(id -gn $TARGET_USER)" "$TARGET_HOME/.npm"
fi

echo "  Permissions and line endings fixed."

# [6/6] Install project dependencies
echo "[6/6] Installing project dependencies..."

VENV_DIR="$PROJECT_ROOT/backend/.venv"

# Remove old venv/node_modules (may be from Windows)
rm -rf "$VENV_DIR" 2>/dev/null
rm -rf "$PROJECT_ROOT/frontend/shell/node_modules" 2>/dev/null
rm -rf "$PROJECT_ROOT/frontend/mfe-cluster/node_modules" 2>/dev/null
rm -rf "$PROJECT_ROOT/frontend/mfe-workload/node_modules" 2>/dev/null

# Create Python venv and install deps
echo "  Creating Python virtual environment..."
sudo -u "$TARGET_USER" python3 -m venv "$VENV_DIR"
sudo -u "$TARGET_USER" bash -c "source $VENV_DIR/bin/activate && pip install --upgrade pip -q && pip install -r $PROJECT_ROOT/backend/requirements.txt -q"
echo "  Python dependencies installed."

# Install npm dependencies for all frontend apps
for app in shell mfe-cluster mfe-workload; do
    echo "  Installing npm deps for frontend/$app..."
    cd "$PROJECT_ROOT/frontend/$app"
    sudo -u "$TARGET_USER" npm install --loglevel=error 2>&1 | tail -5
done

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Installed:"
echo "  Python:  $(python3 --version)"
echo "  Node.js: $(node --version)"
echo "  npm:     $(npm --version)"
echo "  Docker:  $(docker --version 2>/dev/null || echo 'Re-login required')"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_ROOT"
echo "  ./scripts/dev-start.sh"
echo ""

SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "After starting, access from browser:"
echo "  http://${SERVER_IP:-localhost}:4200"
