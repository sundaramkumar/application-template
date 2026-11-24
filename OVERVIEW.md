# Architecture Overview (the big picture)

A 5-minute mental model of how this application template is put together. For file-level
conventions and the "add a feature" checklist, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## The one-sentence idea
A **React single-page app** talks over HTTP/JSON to a **Hono API**, which talks to
**PostgreSQL** — and a **shared package** in the middle holds the types and validation
rules both sides agree on, so the contract is defined exactly once.

## The system at a glance
```
        Browser
          │
          ▼
┌───────────────────┐        HTTP + JSON (cookie auth)        ┌───────────────────┐
│   Frontend (SPA)  │  ───────────────────────────────────▶  │   Backend (API)   │
│  React + Vite     │  ◀───────────────────────────────────  │  Hono on Bun      │
│  TanStack Query   │                                         │  Drizzle ORM      │
└───────────────────┘                                         └─────────┬─────────┘
          │                                                             │
          │            ┌───────────────────────────┐                   ▼
          └──────────▶ │   @shared (the contract)  │ ◀───────   ┌──────────────┐
                       │  types + Zod schemas      │            │  PostgreSQL  │
                       └───────────────────────────┘            └──────────────┘
            both sides import the same types & validation rules
```

Three workspaces, one repo (Bun monorepo): `backend`, `frontend`, `shared`.

## The three pieces
- **Frontend** — renders the UI and holds *no business rules*. It fetches/caches server
  data with TanStack Query, keeps the session in Zustand, and validates forms with the
  shared schemas before sending them.
- **Backend** — owns *all* business rules and data access. It's the only thing that
  touches the database, and it's the authority on validation, auth, and what's allowed.
- **@shared** — the agreement between them: the shape of every request/response and the
  validation rules. Defined once, imported by both, so they can never drift apart.

## How a request flows
```
User submits a form
  → frontend validates with the shared Zod schema (instant feedback)
  → POST /api/... with an httpOnly auth cookie
      → auth middleware verifies the JWT cookie
      → route validates the body with the SAME shared schema
      → controller (thin) calls one service function
      → service runs the business logic + Drizzle queries on PostgreSQL
      → response comes back in a standard envelope { success, data, meta? }
  → TanStack Query caches it and the UI updates
```

## The layering rule (backend)
Each feature is a thin stack — responsibilities never blur:
```
routes        → URL shape + validation       (no logic)
  controller  → translate HTTP ↔ service     (thin glue)
    service   → business logic + DB access    (the real work)
```
Errors are thrown as typed `AppError`s and turned into a consistent JSON error shape by
one global handler.

## Principles that keep it sturdy
- **Typed end-to-end** — one set of types in `@shared`; no duplicated definitions.
- **One schema, both sides** — the same Zod schema validates the form *and* the API.
- **Thin controllers, fat services** — logic lives in one predictable place.
- **The DB layer is honest** — every row carries audit columns; deletes are soft
  (`deleted_at`); schema changes go through committed migrations.
- **Stateless auth** — a signed JWT in an httpOnly cookie; no server session store.
- **Fail safe in the UI** — an error boundary keeps one broken screen from taking down
  the whole app.

## Where things live
| You want to… | Look in |
|---|---|
| Change what the UI looks like | `application/frontend/src/features/<feature>` |
| Change a business rule or query | `application/backend/src/features/<feature>/<feature>.service.ts` |
| Change a request/response shape | `application/shared/src` (types + schemas) |
| Change the database shape | `application/backend/src/db/schema` → generate a migration |
