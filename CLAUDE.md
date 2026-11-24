# CLAUDE.md

Application template — Bun monorepo (`backend`, `frontend`,
`shared`) with users, roles/RBAC, audit logs and API keys; duplicated to
start new projects.

**Read [ARCHITECTURE.md](./ARCHITECTURE.md) first** — it defines the layering, the
shared-schema validation pattern, DB conventions (audit / soft-delete / migrations),
and the "add a feature" checklist. Follow it.

## Fast facts
- Stack: Bun + Hono + Drizzle (PostgreSQL via `Bun.sql`) · React 19 + Vite + TanStack
  Query + Zustand + Tailwind · Zod 4 schemas shared in `@shared`.
- Backend `:3005`, frontend `:5175`. Auth = JWT in an httpOnly `app_token` cookie.
- Default login after seed: `admin` / `admin123`.

## Commands (from repo root)
- `bun run dev` · `bun run typecheck` · `bun run build` · `bun run lint`
- `bun run db:generate` → review SQL → `bun run db:migrate` · `bun run seed`

## Conventions that bite if ignored
- Validate with the **shared** Zod schema (`@shared`) via `zValidator(..., zHook)` —
  don't hand-roll per-feature schemas.
- Backend layering: `routes → controller → service`. Controllers stay thin; all DB
  access + business logic in services; throw `AppError`s.
- Respect soft-delete: queries filter `deleted_at IS NULL`; deletes set `deleted_at`.
- After schema edits, generate + apply a migration (don't hand-edit the DB).
- Run `bun run typecheck` (uses the real app tsconfig, not the root references file)
  before committing.
