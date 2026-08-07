# Features

Feature modules (FAD §3) — one folder per product area: dashboard, projects,
agent workspace, architecture, code, memory, documentation, deployments,
settings.

## Rules

1. A feature owns its components, hooks, and queries; it imports services
   from `services/` and primitives from `components/ui`.
2. Features never import from other features directly — shared logic moves
   to `lib/` or `services/`.

This directory is intentionally empty in Phase 3.1 (project foundation).
