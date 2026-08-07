#!/usr/bin/env bash
# ForgeAI Studio — one-time environment setup.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Backend: creating virtual environment"
python -m venv backend/.venv

if [ -x "backend/.venv/Scripts/python" ]; then
  PY="backend/.venv/Scripts/python"
else
  PY="backend/.venv/bin/python"
fi

echo "==> Backend: installing dependencies"
"$PY" -m pip install --upgrade pip
"$PY" -m pip install -r backend/requirements-dev.txt

echo "==> Backend: environment file"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "    created backend/.env (review before running)"
fi

echo "==> Frontend: installing dependencies"
npm install --prefix frontend

echo "==> Frontend: environment file"
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "    created frontend/.env.local (review before running)"
fi

echo "==> Setup complete."
echo "    Start the full stack with:  npm run dev"
echo "    Start individually with:    npm run dev:api | npm run dev:web"
