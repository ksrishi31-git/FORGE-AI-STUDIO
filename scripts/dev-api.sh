#!/usr/bin/env bash
# Start the backend API in development (auto-reload) mode.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

if [ -x ".venv/Scripts/python" ]; then
  PY=".venv/Scripts/python"
else
  PY=".venv/bin/python"
fi

exec "$PY" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
