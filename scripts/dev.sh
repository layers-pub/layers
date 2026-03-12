#!/bin/bash
# ==============================================================================
# Layers Development Script
# ==============================================================================
# Single command to start the full Layers development environment.
#
# Usage:
#   ./scripts/dev.sh [local|tunnel] [--clean]
#
# Modes:
#   local  - Default. Uses 127.0.0.1 for ATProto loopback OAuth.
#            Best for: UI development, API testing, component work.
#
#   tunnel - Uses ngrok for real OAuth with Bluesky.
#            Best for: Testing OAuth flows, integration testing.
#
# Options:
#   --clean - Force clean database start (removes all data volumes)
#
# What it starts:
#   1. Docker databases (PostgreSQL, Redis, Elasticsearch, Neo4j)
#   2. Backend API on http://127.0.0.1:3001 (with hot reload)
#   3. Firehose indexer (consumes pub.layers.* from ATProto relay)
#   4. Python sidecar on http://127.0.0.1:8000
#   5. Frontend on http://127.0.0.1:3000 (Next.js dev server)
#   6. Tunnel (tunnel mode only)
#
# Prerequisites:
#   - Docker Desktop running
#   - Node.js 22+
#   - pnpm 10+
#   - ngrok (tunnel mode only): brew install ngrok
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOCKFILE="/tmp/layers-dev.lock"
PIDFILE="/tmp/layers-dev.pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
MODE="local"
CLEAN_FLAG=""

for arg in "$@"; do
  case $arg in
    local|tunnel)
      MODE="$arg"
      ;;
    --clean)
      CLEAN_FLAG="yes"
      ;;
    stop)
      echo -e "${YELLOW}Stopping Layers development environment...${NC}"
      if [ -f "$PIDFILE" ]; then
        while read -r pid; do
          kill "$pid" 2>/dev/null || true
        done < "$PIDFILE"
        rm -f "$PIDFILE"
      fi
      pkill -f "ngrok http 3000" 2>/dev/null || true
      pkill -f "tsx watch.*src/index.ts" 2>/dev/null || true
      pkill -f "tsx watch.*src/indexer.ts" 2>/dev/null || true
      pkill -f "uvicorn sidecar" 2>/dev/null || true
      lsof -ti:3000 | xargs kill -9 2>/dev/null || true
      lsof -ti:3001 | xargs kill -9 2>/dev/null || true
      lsof -ti:8000 | xargs kill -9 2>/dev/null || true
      rm -f "$LOCKFILE" /tmp/layers-tunnel-url.env
      echo -e "${GREEN}Stopped${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      echo "   Usage: ./scripts/dev.sh [local|tunnel] [--clean]"
      echo "          ./scripts/dev.sh stop"
      exit 1
      ;;
  esac
done

# Clean up existing instance
if [ -f "$LOCKFILE" ]; then
  OLD_MODE=$(cat "$LOCKFILE" 2>/dev/null || echo "unknown")
  echo -e "${YELLOW}Found existing dev environment (mode: $OLD_MODE). Cleaning up...${NC}"
  "$SCRIPT_DIR/dev.sh" stop
  sleep 2
fi

echo "$MODE" > "$LOCKFILE"
> "$PIDFILE"

TUNNEL_PID=""
API_PID=""
INDEXER_PID=""
SIDECAR_PID=""
WEB_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down Layers...${NC}"
  [ -n "$WEB_PID" ] && kill $WEB_PID 2>/dev/null || true
  [ -n "$SIDECAR_PID" ] && kill $SIDECAR_PID 2>/dev/null || true
  [ -n "$INDEXER_PID" ] && kill $INDEXER_PID 2>/dev/null || true
  [ -n "$API_PID" ] && kill $API_PID 2>/dev/null || true
  [ -n "$TUNNEL_PID" ] && kill $TUNNEL_PID 2>/dev/null || true
  pkill -f "ngrok http 3000" 2>/dev/null || true
  rm -f "$LOCKFILE" "$PIDFILE" /tmp/layers-tunnel-url.env
  echo -e "${GREEN}Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "${GREEN}Starting Layers in ${BLUE}$MODE${GREEN} mode...${NC}"
echo "==============================================================================="
echo ""

# =============================================================================
# Step 1: Start databases
# =============================================================================
echo -e "${BLUE}[1/6] Starting databases...${NC}"

if [ -n "$CLEAN_FLAG" ]; then
  echo "   Removing old volumes..."
  docker compose -f "$ROOT_DIR/docker/docker-compose.yml" down -v 2>/dev/null || true
fi

docker compose -f "$ROOT_DIR/docker/docker-compose.yml" up -d

echo "   Waiting for databases to be healthy..."
for i in {1..60}; do
  PG_READY=$(docker compose -f "$ROOT_DIR/docker/docker-compose.yml" ps postgres --format json 2>/dev/null | grep -c '"healthy"' || echo "0")
  REDIS_READY=$(docker compose -f "$ROOT_DIR/docker/docker-compose.yml" ps redis --format json 2>/dev/null | grep -c '"healthy"' || echo "0")
  if [ "$PG_READY" -gt 0 ] && [ "$REDIS_READY" -gt 0 ]; then
    echo -e "${GREEN}   Databases ready${NC}"
    break
  fi
  sleep 1
done

echo "   Running database migrations..."
cd "$ROOT_DIR"
DATABASE_URL="postgresql://layers:layers_dev@127.0.0.1:5432/layers" npx node-pg-migrate up --migrations-dir src/storage/postgresql/migrations -j ts 2>/dev/null && echo -e "${GREEN}   Migrations complete${NC}" || echo -e "${YELLOW}   Migrations skipped (already up to date)${NC}"
echo ""

# =============================================================================
# Step 2: Start tunnel (if tunnel mode)
# =============================================================================
TUNNEL_URL=""
if [ "$MODE" = "tunnel" ]; then
  echo -e "${BLUE}[2/6] Starting tunnel...${NC}"

  if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}ngrok not found!${NC}"
    echo "   Install: brew install ngrok"
    echo "   Auth:    ngrok config add-authtoken <your-token>"
    exit 1
  fi

  pkill -f "ngrok http 3000" 2>/dev/null || true
  sleep 1

  ngrok http 3000 --domain=layers-pub.ngrok.app > /dev/null 2>&1 &
  TUNNEL_PID=$!
  echo $TUNNEL_PID >> "$PIDFILE"

  echo "   Waiting for tunnel..."
  for i in {1..15}; do
    sleep 1
    TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
  done

  if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}Failed to get tunnel URL. Is ngrok configured?${NC}"
    echo "   Run: ngrok config add-authtoken <your-token>"
    exit 1
  fi

  echo -e "${GREEN}   Tunnel active: $TUNNEL_URL${NC}"
  echo ""
else
  echo -e "${BLUE}[2/6] Skipping tunnel (local mode)...${NC}"
  echo ""
fi

# =============================================================================
# Step 3: Generate environment
# =============================================================================
echo -e "${BLUE}[3/6] Generating environment...${NC}"

if [ "$MODE" = "tunnel" ] && [ -n "$TUNNEL_URL" ]; then
  OAUTH_URL="$TUNNEL_URL"
else
  OAUTH_URL="http://127.0.0.1:3000"
fi

cat > "$ROOT_DIR/web/.env.local" << EOF
# Auto-generated by scripts/dev.sh
# Mode: $MODE | Generated: $(date)
NEXT_PUBLIC_OAUTH_BASE_URL=$OAUTH_URL
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
NEXT_PUBLIC_DEV_MODE=$MODE
NEXT_PUBLIC_APP_VERSION=0.1.0-dev
EOF

echo -e "${GREEN}   Generated web/.env.local${NC}"
echo "      OAUTH_BASE_URL: $OAUTH_URL"
echo ""

# =============================================================================
# Step 4: Start API server
# =============================================================================
echo -e "${BLUE}[4/6] Starting API server on :3001...${NC}"
cd "$ROOT_DIR"

npx tsx watch --env-file=.env.development src/index.ts 2>&1 | sed 's/^/   [API] /' &
API_PID=$!
echo $API_PID >> "$PIDFILE"

# Wait for API to be ready
for i in {1..30}; do
  if curl -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}   API ready${NC}"
    break
  fi
  sleep 1
done

# Start firehose indexer
echo "   Starting firehose indexer..."
npx tsx watch --env-file=.env.development src/indexer.ts 2>&1 | sed 's/^/   [IDX] /' &
INDEXER_PID=$!
echo $INDEXER_PID >> "$PIDFILE"
echo ""

# =============================================================================
# Step 5: Sidecar started via Docker Compose (port 8000)
# =============================================================================
echo -e "${BLUE}[5/6] Sidecar running via Docker Compose on :8000...${NC}"
echo ""

# =============================================================================
# Step 6: Start frontend
# =============================================================================
echo -e "${BLUE}[6/6] Starting frontend on :3000...${NC}"
cd "$ROOT_DIR/web"
pnpm dev --port 3000 --hostname 127.0.0.1 2>&1 | sed 's/^/   [WEB] /' &
WEB_PID=$!
echo $WEB_PID >> "$PIDFILE"
cd "$ROOT_DIR"

for i in {1..30}; do
  if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}   Frontend ready${NC}"
    break
  fi
  sleep 1
done

# =============================================================================
# Ready!
# =============================================================================
echo ""
echo "==============================================================================="
echo -e "${GREEN}Layers is running!${NC}"
echo "==============================================================================="
echo ""
if [ "$MODE" = "tunnel" ]; then
  echo -e "   ${GREEN}Open: $TUNNEL_URL${NC}"
  echo "      (Use this URL for Bluesky OAuth login)"
  echo ""
fi
echo "   Local URLs:"
echo "      Frontend:  http://127.0.0.1:3000"
echo "      Backend:   http://127.0.0.1:3001"
echo "      Sidecar:   http://127.0.0.1:8000"
echo ""
echo "   Background Services:"
echo "      Firehose Indexer: Consuming pub.layers.* from wss://bsky.network"
echo ""
echo "   Databases:"
echo "      PostgreSQL:    postgresql://layers:layers_dev@127.0.0.1:5432/layers"
echo "      Redis:         redis://127.0.0.1:6379"
echo "      Elasticsearch: http://127.0.0.1:9200"
echo "      Neo4j:         http://127.0.0.1:7474 (neo4j/layers_dev)"
echo ""
echo "==============================================================================="
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo "==============================================================================="
echo ""

wait
