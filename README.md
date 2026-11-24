# Application template

A reusable starter — users, roles & permissions (RBAC), audit logs and API keys — built
on a Bun + Hono + Drizzle (PostgreSQL) backend and a React 19 + Vite frontend, organized
as a Bun monorepo. Duplicate this repo to start a new project.

## Stack
- **Backend** — Bun, Hono, Drizzle ORM on **PostgreSQL** via Bun's native `Bun.sql`,
  JWT auth (httpOnly cookie) with `jose` + `bcryptjs`, validation with **Zod 4**.
- **Frontend** — React 19, Vite, TanStack Query, Zustand, Tailwind, react-hook-form.
- **Shared** — `@application/shared` (imported as `@shared`): the single source of truth for
  the API contract used by **both** backend and frontend.

## Layout
```
application/
  backend/    Hono API  (port 3005)
  frontend/   React SPA (port 5175)
  shared/     @shared — the shared API contract (see below)
```

## Shared contract (`@shared`)
Everything the frontend and backend must agree on lives in `application/shared/src` and is
imported via the `@shared` alias — no duplicated type definitions across sides:

- `types/common.types.ts` — **common API types**: `ApiResponse<T>`, `ApiError`,
  `PaginatedResponse<T>`, `PaginatedMeta`, `ListQueryParams`, and the filter types.
- `types/*.types.ts` — entity types (`User`, `Role`, `AuthUser`, …).
- `schemas/*.schema.ts` — Zod request schemas; the backend validates with them
  (`zValidator`) and the frontend validates the same forms with them (`zodResolver`).

## Prerequisites
- [Bun](https://bun.sh) ≥ 1.3
- PostgreSQL ≥ 14 running locally

## Setup
```bash
# 1. Install all workspaces from the repo root
bun install

# 2. Create the database
createdb application    # or: psql -c 'CREATE DATABASE application'

# 3. Configure the backend
cp application/backend/.env.example application/backend/.env
#   set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/application
#   set a JWT_SECRET (≥ 32 chars)

# 4. Apply migrations + seed an admin user
bun run db:migrate
bun run seed            # creates roles (Admin, User) + admin / admin123
```

## Run
```bash
bun run dev             # backend (:3005) + frontend (:5175)
# or individually:
bun run dev:backend
bun run dev:frontend
```
Log in at http://localhost:5175 with **admin / admin123** (change it).

## Common scripts (run from repo root)
| Script | What it does |
|---|---|
| `bun run dev` | Start backend + frontend |
| `bun run typecheck` | `tsc` across all workspaces |
| `bun run build` | Production build of each package |
| `bun run lint` | ESLint across workspaces |
| `bun run db:generate` | Generate a Drizzle migration from schema changes |
| `bun run db:migrate` | Apply pending migrations |
| `bun run seed` | Seed roles + admin user |

## Docs
- [OVERVIEW.md](./OVERVIEW.md) — the big-picture architecture in 5 minutes.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — conventions and how to add a feature.
