#!/bin/bash
# Environment Switching Script
# .env dosyalarını kolayca değiştir ve uygulamayı yeniden başlat

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./scripts/switch-env.sh [dev|preprod|production]"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./scripts/switch-env.sh dev        # Switch to dev environment"
    echo "  ./scripts/switch-env.sh preprod    # Switch to preprod environment"
    echo "  ./scripts/switch-env.sh production # Switch to production environment"
}

if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

ENV=$1

case $ENV in
    dev|development)
        ENV_FILE=".env.dev"
        PROFILE="dev"
        ;;
    preprod|pre-prod|preproduction)
        ENV_FILE=".env.preprod"
        PROFILE="preprod"
        ;;
    prod|production)
        ENV_FILE=".env.production"
        PROFILE="production"
        ;;
    *)
        echo -e "${RED}Error: Invalid environment '$ENV'${NC}"
        print_usage
        exit 1
        ;;
esac

# Check if env file exists
if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Switching to $ENV environment...${NC}"

# Copy env file to API directory
cp "$PROJECT_ROOT/$ENV_FILE" "$API_DIR/.env"
echo -e "${GREEN}✅ Copied $ENV_FILE to apps/api/.env${NC}"

# Stop current docker services
echo -e "${YELLOW}🛑 Stopping current docker services...${NC}"
cd "$PROJECT_ROOT"
docker-compose down > /dev/null 2>&1 || true

# Start appropriate docker profile
if [ "$PROFILE" = "dev" ]; then
    echo -e "${YELLOW}🚀 Starting dev services (PostgreSQL + MinIO + Redis)...${NC}"
    docker-compose --profile dev up -d
elif [ "$PROFILE" = "preprod" ] || [ "$PROFILE" = "production" ]; then
    echo -e "${YELLOW}🚀 Starting $PROFILE services (PostgreSQL only)...${NC}"
    docker-compose up -d postgres
fi

echo -e "${GREEN}✅ Docker services started${NC}"

# Show next steps
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Backend'i yeniden başlat:"
echo "   cd apps/api"
if [ "$PROFILE" = "dev" ]; then
    echo "   export FLASK_ENV=development"
else
    echo "   export FLASK_ENV=production"
fi
echo "   flask run --port 5000"
echo ""
echo "2. Frontend'i yeniden başlat:"
echo "   cd apps/web"
echo "   npm run dev"
echo ""
echo -e "${GREEN}🎉 Environment switched to: $ENV${NC}"
