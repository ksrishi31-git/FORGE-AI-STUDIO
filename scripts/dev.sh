#!/usr/bin/env bash
# Full local development stack: Docker infrastructure + API + web.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f docker/.env ]; then
  cp docker/.env.example docker/.env
fi

echo "==> Starting infrastructure (PostgreSQL, Redis)"
docker compose -f docker/docker-compose.yml up -d postgres redis

cleanup() {
  echo
  echo "==> Stopping infrastructure"
  docker compose -f docker/docker-compose.yml stop
}
trap cleanup EXIT

echo "==> Starting API (http://localhost:8000/api/v1/docs)"
bash scripts/dev-api.sh &
API_PID=$!

echo "==> Starting web (http://localhost:3000)"
bash scripts/dev-web.sh &
WEB_PID=$!

wait "$API_PID" "$WEB_PID"
