#!/bin/bash
# Edge Cloud - Fix file permissions for Ubuntu
# Run this FIRST after copying project from Windows to Ubuntu
# Fixes all ownership, file modes, and script executability
# Usage: sudo ./scripts/fix-permissions.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Determine target user (the one who invoked sudo, or current user)
if [ -n "$SUDO_USER" ]; then
    TARGET_USER="$SUDO_USER"
    TARGET_GROUP=$(id -gn "$SUDO_USER")
else
    TARGET_USER=$(whoami)
    TARGET_GROUP=$(id -gn)
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Edge Cloud - Fix Permissions (Windows → Ubuntu) ==="
echo ""
echo "Project root: $PROJECT_ROOT"
echo "Target user:  $TARGET_USER"
echo "Target group: $TARGET_GROUP"
echo ""

# Check if running with sufficient privileges
if [ "$(id -u)" -ne 0 ] && [ "$(stat -c '%U' "$PROJECT_ROOT")" != "$TARGET_USER" ]; then
    echo -e "${YELLOW}[WARN]${NC} You may need to run this script with sudo:"
    echo "  sudo ./scripts/fix-permissions.sh"
    echo ""
fi

# ============================================================
# Step 1: Fix ownership of entire project tree
# ============================================================
echo -e "${CYAN}[1/7]${NC} Fixing ownership of entire project tree..."
if [ "$(id -u)" -eq 0 ]; then
    chown -R "$TARGET_USER:$TARGET_GROUP" "$PROJECT_ROOT"
else
    sudo chown -R "$TARGET_USER:$TARGET_GROUP" "$PROJECT_ROOT" 2>/dev/null || {
        echo -e "${RED}  Failed. Try: sudo $0${NC}"
        exit 1
    }
fi
echo -e "${GREEN}  Done. All files owned by $TARGET_USER:$TARGET_GROUP${NC}"

# ============================================================
# Step 2: Fix directory permissions (755 for dirs)
# ============================================================
echo -e "${CYAN}[2/7]${NC} Setting directory permissions (755)..."
find "$PROJECT_ROOT" -type d -exec chmod 755 {} \;
echo -e "${GREEN}  Done.${NC}"

# ============================================================
# Step 3: Fix file permissions (644 for regular files)
# ============================================================
echo -e "${CYAN}[3/7]${NC} Setting file permissions (644 for all files)..."
find "$PROJECT_ROOT" -type f -exec chmod 644 {} \;
echo -e "${GREEN}  Done.${NC}"

# ============================================================
# Step 4: Make scripts executable (755)
# ============================================================
echo -e "${CYAN}[4/7]${NC} Making shell scripts executable..."
find "$PROJECT_ROOT" -type f -name "*.sh" -exec chmod 755 {} \;
# Also fix any script in scripts/ directory without .sh extension
if [ -d "$PROJECT_ROOT/scripts" ]; then
    find "$PROJECT_ROOT/scripts" -type f -exec chmod 755 {} \;
fi
echo -e "${GREEN}  Done.${NC}"

# ============================================================
# Step 5: Fix line endings (CRLF → LF) for all text files
# ============================================================
echo -e "${CYAN}[5/7]${NC} Converting Windows line endings (CRLF → LF)..."
if command -v dos2unix &>/dev/null; then
    find "$PROJECT_ROOT" -type f \( \
        -name "*.sh" -o -name "*.py" -o -name "*.ts" -o -name "*.js" \
        -o -name "*.json" -o -name "*.html" -o -name "*.scss" -o -name "*.css" \
        -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" -o -name "*.txt" \
        -o -name "*.conf" -o -name "Dockerfile" -o -name ".gitignore" \
        -o -name ".env*" \
    \) -exec dos2unix -q {} \; 2>/dev/null
    echo -e "${GREEN}  Done (using dos2unix).${NC}"
else
    # Fallback: use sed to remove \r
    echo "  dos2unix not found, using sed fallback..."
    find "$PROJECT_ROOT" -type f \( \
        -name "*.sh" -o -name "*.py" -o -name "*.ts" -o -name "*.js" \
        -o -name "*.json" -o -name "*.html" -o -name "*.scss" -o -name "*.css" \
        -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" -o -name "*.txt" \
        -o -name "*.conf" -o -name "Dockerfile" -o -name ".gitignore" \
        -o -name ".env*" \
    \) -exec sed -i 's/\r$//' {} \; 2>/dev/null
    echo -e "${GREEN}  Done (using sed).${NC}"
    echo -e "${YELLOW}  Tip: Install dos2unix for better results: sudo apt install dos2unix${NC}"
fi

# ============================================================
# Step 6: Fix npm-related permissions
# ============================================================
echo -e "${CYAN}[6/7]${NC} Fixing npm cache and node_modules..."

# Fix npm cache
NPM_CACHE_DIR="/home/$TARGET_USER/.npm"
if [ -d "$NPM_CACHE_DIR" ]; then
    if [ "$(id -u)" -eq 0 ]; then
        chown -R "$TARGET_USER:$TARGET_GROUP" "$NPM_CACHE_DIR"
    else
        sudo chown -R "$TARGET_USER:$TARGET_GROUP" "$NPM_CACHE_DIR" 2>/dev/null
    fi
    echo "  Fixed: $NPM_CACHE_DIR"
fi

# Remove all node_modules (they don't transfer well from Windows)
for dir in "$PROJECT_ROOT/frontend/shell" "$PROJECT_ROOT/frontend/mfe-cluster" "$PROJECT_ROOT/frontend/mfe-workload"; do
    if [ -d "$dir/node_modules" ]; then
        rm -rf "$dir/node_modules"
        echo "  Removed: $dir/node_modules (will be reinstalled)"
    fi
    # Remove Angular cache
    if [ -d "$dir/.angular" ]; then
        rm -rf "$dir/.angular"
        echo "  Removed: $dir/.angular"
    fi
done

# Remove Python venv (may have Windows-specific binaries)
if [ -d "$PROJECT_ROOT/backend/.venv" ]; then
    rm -rf "$PROJECT_ROOT/backend/.venv"
    echo "  Removed: backend/.venv (will be recreated)"
fi

# Remove __pycache__
find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
echo "  Cleaned: __pycache__ directories"

echo -e "${GREEN}  Done.${NC}"

# ============================================================
# Step 7: Verify key files
# ============================================================
echo -e "${CYAN}[7/7]${NC} Verifying project structure..."

ISSUES=0

# Check critical files exist
critical_files=(
    "backend/app/main.py"
    "backend/requirements.txt"
    "frontend/shell/package.json"
    "frontend/mfe-cluster/package.json"
    "frontend/mfe-workload/package.json"
    "docker-compose.yml"
    "scripts/dev-start.sh"
)

for f in "${critical_files[@]}"; do
    if [ -f "$PROJECT_ROOT/$f" ]; then
        echo -e "  ${GREEN}✓${NC} $f"
    else
        echo -e "  ${RED}✗${NC} $f (MISSING!)"
        ISSUES=$((ISSUES + 1))
    fi
done

# Verify scripts are executable
for script in "$PROJECT_ROOT"/scripts/*.sh; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        echo -e "  ${GREEN}✓${NC} $(basename $script) (executable)"
    elif [ -f "$script" ]; then
        echo -e "  ${RED}✗${NC} $(basename $script) (NOT executable)"
        ISSUES=$((ISSUES + 1))
    fi
done

echo ""
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}=== All Permissions Fixed Successfully ===${NC}"
else
    echo -e "${YELLOW}=== Fixed with $ISSUES warning(s) ===${NC}"
fi

echo ""
echo "Summary of changes:"
echo "  - All files/dirs owned by $TARGET_USER:$TARGET_GROUP"
echo "  - Directories: 755 (rwxr-xr-x)"
echo "  - Files: 644 (rw-r--r--)"
echo "  - Scripts: 755 (rwxr-xr-x)"
echo "  - Line endings: LF (Unix)"
echo "  - Removed: node_modules, .angular, .venv, __pycache__"
echo ""
echo "Next steps:"
echo "  ./scripts/dev-start.sh"
echo ""
echo "The dev-start script will automatically:"
echo "  1. Create Python venv and install pip packages"
echo "  2. Run npm install for all frontend apps"
echo "  3. Start all services"
