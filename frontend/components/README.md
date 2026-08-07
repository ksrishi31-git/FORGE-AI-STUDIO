# Components

Reusable UI components layer (FAD §3).

## Layout

- `components/layout/` — AppShell, Sidebar, Topbar, Breadcrumb, PageHeader
- `components/ui/` — shadcn/ui primitives (added via `npx shadcn add …`)

## Rules

1. Primitives live in `components/ui` (shadcn-generated, no business logic).
2. Feature components live in `features/`, composed from primitives.
3. Components never call services directly — they use hooks from `hooks/`.

This directory is intentionally empty in Phase 3.1 (project foundation).
