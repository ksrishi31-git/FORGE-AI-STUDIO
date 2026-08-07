#!/usr/bin/env bash
# Start the frontend in development mode.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec npm run dev --prefix "$ROOT/frontend"
