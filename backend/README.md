# CRM Backend

Bun + Hono REST API for the CRM system. Handles authentication, full CRUD for 10 CRM modules, dynamic custom fields, server-side formula evaluation, and interactive API docs.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Bun | Runtime + package manager |
| Hono | HTTP framework |
| @hono/zod-openapi | Typed routes + auto OpenAPI 3.1 spec |
| @scalar/hono-api-reference | Interactive API docs at `/docs` |
| PostgreSQL | Primary database |
| Drizzle ORM | TypeScript-first ORM with JSONB support |
| Zod | Request/response validation |
| jose | JWT signing and verification (HS256) |
| bcryptjs | Password hashing |
| quickjs-emscripten | WASM formula sandbox (no native deps) |

---

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL 14+

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
bun install
```

### 2. Configure environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/crm
JWT_SECRET=your-minimum-32-character-secret-here
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Set up the database

```bash
# Generate SQL migration files from schema
bun run db:generate

# Apply migrations to your PostgreSQL database
bun run db:migrate

# Seed 10 system modules + 135 system fields
bun run db:seed
```

### 4. Start the server

```bash
bun run dev
# Server at http://localhost:3000
# API docs at http://localhost:3000/docs
```

---

## Scripts

```bash
bun run dev          # Start with hot reload
bun run build        # Build to dist/
bun run db:generate  # Generate SQL migration files (drizzle-kit)
bun run db:migrate   # Apply migrations to database
bun run db:seed      # Seed system modules and fields
bun run db:studio    # Open Drizzle Studio (visual database browser)
```

---

## Project Structure

```
backend/src/
├── index.ts                   # Entry point — Bun.serve()
├── app.ts                     # Hono app factory, middleware, route mounting
│
├── config/
│   └── env.ts                 # Zod-validated environment variables
│
├── db/
│   ├── index.ts               # postgres.js pool + Drizzle instance (singleton)
│   ├── schema/
│   │   ├── users.ts           # users table
│   │   ├── modules.ts         # modules, module_fields, form_layouts, formula_fields
│   │   ├── records.ts         # 10 module tables (leads, contacts, deals, ...)
│   │   └── index.ts           # barrel export
│   ├── migrations/            # drizzle-kit generated SQL files
│   └── seed.ts                # seeds all system modules and fields (idempotent)
│
├── lib/
│   ├── response.ts            # ok(), created(), noContent(), paginated(), fail()
│   ├── errors.ts              # AppError class + badRequest, notFound, conflict, ...
│   ├── pagination.ts          # parsePagination(), buildMeta(), getOffset()
│   ├── filters.ts             # parseFilters() → Drizzle WHERE conditions
│   └── logger.ts              # Structured JSON logger
│
├── middleware/
│   ├── auth.ts                # verifyJWT → c.set('user', payload)
│   ├── error-handler.ts       # AppError → JSON; unknown → 500
│   └── request-logger.ts      # Logs method, path, status, duration
│
├── features/
│   ├── auth/
│   │   ├── auth.routes.ts     # POST /register, POST /login, GET /me
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts    # hashPassword, verifyPassword, signToken
│   │   └── auth.schema.ts     # Zod: RegisterSchema, LoginSchema
│   │
│   ├── records/
│   │   ├── records.routes.ts  # /api/:module — full CRUD + bulk delete
│   │   ├── records.controller.ts
│   │   ├── records.service.ts # Orchestrates repo + formula augmentation
│   │   ├── records.repository.ts  # Generic engine for all 10 modules
│   │   └── records.schema.ts  # Zod: ListQuerySchema, RecordBodySchema
│   │
│   └── settings/
│       ├── settings.routes.ts # /api/settings/* — fields, layout, formula fields
│       ├── settings.controller.ts
│       ├── settings.service.ts
│       ├── settings.repository.ts
│       └── settings.schema.ts
│
├── services/
│   └── formula.service.ts     # quickjs-emscripten sandbox, computeFormulaFields()
│
└── types/
    ├── hono.types.ts           # JwtPayload, HonoVariables
    ├── api.types.ts            # ApiResponse<T>, PaginatedMeta, FilterParam
    └── module.types.ts         # ModuleKey, ModuleField, FormLayout, FormulaField
```

---

## API Reference

Interactive docs with live try-it at **http://localhost:3000/docs**

### Auth

```
POST /api/auth/register   { name, email, password }  → 201 { token, user }
POST /api/auth/login      { email, password }         → 200 { token, user }
GET  /api/auth/me         Bearer token                → 200 { user }
```

### Records (require `Authorization: Bearer <token>`)

```
GET    /api/:module                       Paginated list with formula results
POST   /api/:module                       Create record
GET    /api/:module/:id                   Get record (includes _fx)
PUT    /api/:module/:id                   Update record
DELETE /api/:module/:id                   Delete record
DELETE /api/:module      { ids: [] }      Bulk delete
```

**Supported modules:** `leads`, `contacts`, `accounts`, `deals`, `activities`, `products`, `quotes`, `orders`, `invoices`, `campaigns`

**List query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `10` | Records per page (max 100) |
| `sort` | `created_at` | Field to sort by |
| `order` | `desc` | `asc` or `desc` |
| `filters` | — | JSON array of filter objects |

**Filter format:**
```json
[
  { "field": "lead_status", "op": "eq", "value": "New" },
  { "field": "first_name",  "op": "contains", "value": "John" }
]
```

**Filter operators:** `eq`, `neq`, `contains`, `starts_with`, `ends_with`, `gt`, `gte`, `lt`, `lte`, `is_empty`, `not_empty`

### Settings

```
GET    /api/settings/modules                                All modules + fields
POST   /api/settings/modules                                Create custom module

GET    /api/settings/modules/:key/fields                    Field definitions
POST   /api/settings/modules/:key/fields                    Add custom field
PUT    /api/settings/modules/:key/fields/:fieldKey          Update field
DELETE /api/settings/modules/:key/fields/:fieldKey          Delete custom field (not system)

GET    /api/settings/modules/:key/layout                    Form layout JSON
PUT    /api/settings/modules/:key/layout                    Save form layout

GET    /api/settings/modules/:key/formula-fields            Formula column list
POST   /api/settings/modules/:key/formula-fields            Add formula column
PUT    /api/settings/modules/:key/formula-fields/:id        Update formula column
DELETE /api/settings/modules/:key/formula-fields/:id        Delete formula column
```

### Response Envelope

```json
{ "success": true, "data": { ... } }

{ "success": true, "data": [...],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }

{ "success": false,
  "error": { "code": "NOT_FOUND", "message": "Lead not found" } }
```

### HTTP Status Codes

| Status | When |
|--------|------|
| 200 | GET, PUT success |
| 201 | POST success |
| 204 | DELETE success |
| 400 | Validation failure / bad JSON |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role |
| 404 | Record not found |
| 409 | Duplicate key conflict |
| 500 | Unhandled server error |

---

## Database Schema

### Metadata tables

```
users          — id, email (unique), name, password, role, created_at
modules        — key (PK), name, system, icon, color
module_fields  — id, module_key, key, label, type, required, system, options (jsonb), sort_order
form_layouts   — module_key (PK), sections (jsonb), updated_at
formula_fields — id, module_key, name, mode, expression, sort_order
```

### Module record tables (10 tables)

Each table follows the same pattern: typed system field columns + `custom_data JSONB` for custom fields + audit columns.

```sql
-- Example: leads
CREATE TABLE leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   TEXT,
  last_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  lead_status  TEXT NOT NULL DEFAULT 'New',
  -- ... other system fields
  owner_id     UUID REFERENCES users(id),
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_data  JSONB NOT NULL DEFAULT '{}'
);
```

The API merges system columns and `custom_data` into a single flat object. Callers never need to handle the split.

---

## Formula Evaluation

Formula fields are evaluated server-side in a QuickJS WASM sandbox via `quickjs-emscripten`.

- **Formula mode** — single expression using field names as variables: `amount * probability / 100`
- **Script mode** — full JavaScript with `row` (current record) and `rows` (all records) as globals

Constraints per evaluation: **500ms timeout**, **8MB memory limit**. Returns `#ERR` on timeout or runtime error. No host filesystem or network access from within the sandbox.

Results are returned as `_fx: { [formulaFieldId]: value }` on every record in GET responses.

---

## Architecture

```
HTTP Request
  → Hono Router       (path matching, Zod body validation)
  → Controller        (parse params/body, call service)
  → Service           (business logic, formula augmentation)
  → Repository        (Drizzle ORM queries)
  → PostgreSQL
```

**Generic records engine** — `records.repository.ts` handles all 10 modules via two maps:

- `TABLES` — maps `ModuleKey` to the Drizzle table object
- `SYSTEM_FIELDS` — maps `ModuleKey` to a `Set<string>` of system column names

On write, the request body is split: known system fields go to typed columns, everything else merges into `custom_data` JSONB. On read, `flattenRecord()` merges them back into one flat object.

---

## Health Check

```
GET /health  →  200  { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```
