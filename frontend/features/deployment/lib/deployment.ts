/**
 * Deployment Center reference data (Phase 3.9).
 *
 * These are platform facts (the repo's own build/run commands and the
 * docker-compose topology), not generated content — the center pairs them with
 * the pipeline's deployment-plan artifact for a complete operational view.
 */

export interface BuildCommand {
  command: string;
  description: string;
}

export const BUILD_COMMANDS: BuildCommand[] = [
  { command: "npm install", description: "Install frontend dependencies." },
  { command: "pip install -r backend/requirements.txt", description: "Install backend dependencies." },
  { command: "alembic upgrade head", description: "Apply database migrations." },
  { command: "npx next build", description: "Production build of the web app." },
  { command: "docker compose up -d", description: "Start the full stack in containers." },
];

export interface EnvVariable {
  name: string;
  description: string;
  secret: boolean;
}

export const ENV_VARIABLES: EnvVariable[] = [
  { name: "DATABASE_URL", description: "SQLAlchemy async connection string.", secret: true },
  { name: "SECRET_KEY", description: "Token signing secret (>= 32 bytes).", secret: true },
  { name: "REDIS_URL", description: "Redis connection for cache/queues; empty disables.", secret: false },
  { name: "LLM_API_KEY", description: "Model provider key; empty falls back to the deterministic engine.", secret: true },
  { name: "CORS_ORIGINS", description: "JSON array of allowed browser origins.", secret: false },
  { name: "NEXT_PUBLIC_API_URL", description: "Browser-facing API origin (empty = same-origin proxy).", secret: false },
  { name: "NEXT_PUBLIC_AUTH_COOKIE", description: "Refresh-token cookie name.", secret: false },
  { name: "LOG_LEVEL", description: "Backend logging verbosity (INFO/DEBUG).", secret: false },
];

export interface ChecklistItem {
  id: string;
  label: string;
}

export const DEPLOYMENT_CHECKLIST: ChecklistItem[] = [
  { id: "env", label: "Environment variables set from the example template" },
  { id: "migrate", label: "Database migrations applied on the target host" },
  { id: "build", label: "Production images built and tagged" },
  { id: "health", label: "Health and readiness probes pass" },
  { id: "tls", label: "HTTPS termination configured at the edge" },
  { id: "backup", label: "Database backups scheduled" },
  { id: "rollback", label: "Previous image retained for rollback" },
  { id: "secrets", label: "No secrets committed to the repository" },
];

/** docker-compose export (mirrors docker/docker-compose.yml — repo topology). */
export const COMPOSE_TEMPLATE = `# ForgeAI Studio — production-style stack
name: forgeai-studio

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-forgeai}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-forgeai}
      POSTGRES_DB: \${POSTGRES_DB:-forgeai}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-forgeai}"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    environment:
      APP_ENV: production
      DATABASE_URL: postgresql+asyncpg://\${POSTGRES_USER:-forgeai}:\${POSTGRES_PASSWORD:-forgeai}@postgres:5432/\${POSTGRES_DB:-forgeai}
      REDIS_URL: redis://redis:6379/0
      CORS_ORIGINS: '["https://app.example.com"]'
      LOG_LEVEL: INFO
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    environment:
      NEXT_PUBLIC_API_URL: ""
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  pg_data:
  redis_data:
`;
