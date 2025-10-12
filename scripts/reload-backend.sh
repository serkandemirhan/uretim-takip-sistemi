#!/bin/bash
# Backend Reload Script
# .env değişikliklerini yüklemek için backend'i yeniden başlatır

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Reloading backend with new environment variables...${NC}"

# Check if .env exists
if [ ! -f "$API_DIR/.env" ]; then
    echo -e "${RED}Error: apps/api/.env not found!${NC}"
    echo "Run: cp .env.dev apps/api/.env (or .env.preprod)"
    exit 1
fi

# Find and kill Flask process
echo -e "${YELLOW}🛑 Stopping Flask process...${NC}"
pkill -f "flask run" || true
pkill -f "python.*flask" || true

# Wait a moment
sleep 2

echo -e "${GREEN}✅ Backend stopped${NC}"
echo ""
echo -e "${BLUE}📋 Start backend with:${NC}"
echo "  cd apps/api"
echo "  source venv/bin/activate  # if using venv"
echo "  flask run --port 5000"
echo ""
echo -e "${BLUE}Or use gunicorn for production:${NC}"
echo "  gunicorn app:app --bind 0.0.0.0:5000"
