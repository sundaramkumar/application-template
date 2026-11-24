# CRM Frontend

React 19 SPA for the CRM system. Provides a full UI for managing 10 CRM modules with dynamic custom fields, drag-and-drop form layout designer, formula columns, and charts.

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| TypeScript | ~6 | Type safety |
| Vite | 8 | Dev server + bundler |
| Tailwind CSS | 3 | Utility-first styling |
| @hello-pangea/dnd | 18 | Drag-and-drop (form layout designer) |
| Recharts | 3 | Charts on Reports screen |
| Lucide React | latest | Icons |

---

## Prerequisites

- [Bun](https://bun.sh) v1.0+ (or Node.js 18+)
- Backend running at `http://localhost:3000` (see `../backend/README.md`)

---

## Getting Started

```bash
cd frontend
bun install
bun run dev
```

App runs at **http://localhost:5173**

---

## Scripts

```bash
bun run dev       # Start dev server with HMR
bun run build     # Type-check + production build → dist/
bun run preview   # Preview production build locally
bun run lint      # ESLint
```

---

## Project Structure

```
frontend/src/
├── screens/               # Full-page views
│   ├── Dashboard.tsx      # Overview stats and charts
│   ├── Leads.tsx          # Leads module (list + create/edit)
│   ├── Deals.tsx          # Deals module with pipeline view
│   ├── Quotes.tsx         # Quotes module
│   ├── Orders.tsx         # Orders module
│   ├── Invoices.tsx       # Invoices module
│   ├── GenericModule.tsx  # Reusable screen for remaining modules
│   ├── Reports.tsx        # Charts and analytics
│   ├── Automations.tsx    # Automation rules UI
│   └── Settings.tsx       # Module fields, form layout, formula fields
│
├── components/            # Shared UI components
│   ├── DynamicForm.tsx    # Renders forms from layout JSON + field definitions
│   ├── RecordTable.tsx    # Sortable, filterable table with formula columns
│   ├── FormLayoutDesigner.tsx  # Drag-and-drop form builder
│   ├── Sidebar.tsx        # App navigation
│   └── ...
│
├── contexts/              # React context providers
│   ├── ModuleContext.tsx  # Active module state
│   └── ThemeContext.tsx   # Light/dark theme
│
├── types/                 # TypeScript interfaces
│   ├── formula.ts         # FormulaField type
│   ├── layout.ts          # FormLayout, FormSection types
│   └── ...
│
└── data/                  # Temporary mock data (to be removed after API integration)
```

---

## Screens

| Screen | Nav Key | Description |
|--------|---------|-------------|
| Dashboard | `dashboard` | KPI cards + activity charts |
| Leads | `leads` | Lead pipeline with status filtering |
| Contacts | `contacts` | Contact list linked to accounts |
| Accounts | `accounts` | Company records |
| Deals | `deals` | Deal stages and probability |
| Activities | `activities` | Calls, meetings, tasks |
| Products | `products` | Product catalog |
| Quotes | `quotes` | Quote builder |
| Orders | `orders` | Order management |
| Invoices | `invoices` | Invoice tracking |
| Campaigns | `campaigns` | Marketing campaigns |
| Reports | `reports` | Charts and analytics |
| Automations | `automations` | Automation rules |
| Settings | `settings` | Field config, form layout, formula fields |

---

## Key Components

### DynamicForm
Renders a form from a `FormLayout` JSON (sections + fields). Reads field definitions to determine input type (text, dropdown, boolean, currency, etc.). Used for creating and editing records across all modules.

### RecordTable
Generic table component. Reads `row._fx` for formula column values returned from the API. Supports column sorting and inline filter UI.

### FormLayoutDesigner
Drag-and-drop builder (powered by @hello-pangea/dnd). Allows users to organize fields into named sections and reorder them. Layout is saved via the Settings API and persists across sessions.

---

## Settings Screen

Accessible via sidebar → Settings. Tabs per module:

- **Form Layout** — drag fields into sections, reorder, save
- **Formula Fields** — add computed columns (formula or script mode, runs server-side)
- **Custom Modules** — create additional modules beyond the 10 system defaults

---

## Environment

No `.env` file needed for development — the API base URL defaults to `http://localhost:3000`. To override (e.g. for staging), create `frontend/.env.local`:

```env
VITE_API_URL=https://your-backend-url
```

---

## Build Output

```bash
bun run build
# Output → frontend/dist/
# Entry  → frontend/dist/index.html
```

Deploy `dist/` to any static host (Vercel, Netlify, S3 + CloudFront, etc.). Set the backend URL via `VITE_API_URL` at build time.
