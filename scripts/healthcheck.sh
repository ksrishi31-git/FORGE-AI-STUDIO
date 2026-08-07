#!/usr/bin/env bash
# Verify the API health endpoint.
set -euo pipefail

URL="${HEALTH_URL:-http://localhost:8000/api/v1/health}"

echo "==> GET $URL"
curl -fsS "$URL"
echo
