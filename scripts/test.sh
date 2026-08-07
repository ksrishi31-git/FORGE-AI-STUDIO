#!/usr/bin/env bash
# Backend tests + frontend lint/typecheck.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Backend: pytest"
if [ -x "$ROOT/backend/.venv/Scripts/python" ]; then
  "$ROOT/backend/.venv/Scripts/python" -m pytest "$ROOT/backend/tests" -q
else
  "$ROOT/backend/.venv/bin/python" -m pytest "$ROOT/backend/tests" -q
fi

echo "==> Backend: ruff"
if [ -x "$ROOT/backend/.venv/Scripts/python" ]; then
  "$ROOT/backend/.venv/Scripts/python" -m ruff check "$ROOT/backend/app" "$ROOT/backend/tests"
else
  "$ROOT/backend/.venv/bin/python" -m ruff check "$ROOT/backend/app" "$ROOT/backend/tests"
fi

echo "==> Frontend: eslint"
npm run lint --prefix "$ROOT/frontend"

echo "==> Frontend: typecheck"
npm run typecheck --prefix "$ROOT/frontend"

echo "==> All checks passed."
