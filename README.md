# ForgeAI Studio

Enterprise multi-agent software engineering platform — transforms plain-English
business requirements into production-ready applications through a governed
pipeline of ten specialized AI agents.

**Phase 3.1 — Project Foundation.** This repository contains the initialized
frontend, backend, Docker topology, and engineering tooling. Feature phases
(auth, database models, agent orchestration, UI) follow per the finalized
design documents in `docs/`.

## Architecture

| Layer | Stack | Reference |
|---|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · Zod · React Hook Form · Framer Motion · Lucide | `docs/FAD.md` |
| Backend | FastAPI · SQLAlchemy · Alembic · PostgreSQL · Redis · LangGraph · LangChain · ChromaDB · Loguru · Pydantic | `docs/BAD.md`, `docs/MAD.md` |
| Deployment | Docker · Docker Compose (Vercel / Render in production) | `docs/DAD.md` |

## Prerequisites

- Node.js ≥ 20 and npm ≥ 10
- Python ≥ 3.12
- Docker with Compose v2 (for the full stack)
- Git Bash or a POSIX shell on Windows

## Quickstart

```bash
# 1. Install backend (virtualenv) and frontend dependencies
npm run setup

# 2. Start everything (Postgres + Redis via Docker, API, web)
npm run dev

# API docs: http://localhost:8000/api/v1/docs
# Web:      http://localhost:3000
```

### Individual services

```bash
npm run dev:api    # backend only (uvicorn --reload on :8000)
npm run dev:web    # frontend only (next dev on :3000)
docker compose -f docker/docker-compose.yml up -d postgres redis
```

### Health check

```bash
npm run health          # curl /api/v1/health
# -> {"status":"healthy","service":"ForgeAI Studio","version":"1.0.0"}
```

### Validation

```bash
npm run test            # backend pytest + ruff, frontend eslint + typecheck
npm run format          # frontend prettier
```

## Repository structure

```
forgeai-studio/
├── frontend/            # Next.js 15 application (app router, components,
│                        #   features, hooks, lib, providers, services,
│                        #   styles, types, public)
├── backend/             # FastAPI service (app: api, core, config, database,
│                        #   models, schemas, services, agents, memory, tools;
│                        #   alembic/, tests/)
├── docker/              # Dockerfiles, compose topology, env template
├── scripts/             # setup / dev / test / health helpers
├── docs/                # finalized design documents index
└── package.json         # monorepo orchestration
```

## Configuration

- **Backend:** `backend/.env.example` → `.env`; consumed by the shared
  configuration module `backend/app/config/settings.py` (single source of
  truth for the API and all workers).
- **Frontend:** `frontend/.env.example` → `.env.local`; validated with Zod in
  `frontend/lib/config/env.ts`. Empty `NEXT_PUBLIC_API_URL` enables the
  same-origin proxy (`next.config.ts` rewrites) for containerized runs.
- **Docker:** `docker/.env.example` → `docker/.env`.

## Error & logging conventions

- Every non-2xx response uses the standard envelope
  `{"error": {"code", "message", "details?", "request_id", "path", "ts"}}`
  (`backend/app/core/errors.py`), mirrored by the typed client
  (`frontend/services/http-client.ts`).
- Structured loguru logging with correlation ids and secret redaction
  (`backend/app/core/logging.py`); `X-Request-Id` is propagated end-to-end.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 3.1 | Project foundation (this baseline) | Complete |
| 3.2 | Authentication & user management (JWT, sessions, RBAC, auth UI) | Complete |
| 3.3+ | Database models, agent orchestration, features | Planned |

## License

Proprietary — internal use only.
