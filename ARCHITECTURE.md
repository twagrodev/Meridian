# Architecture — AgroFair Meridian

## Overview

Meridian is a full-stack Next.js 16 application using the App Router. It follows a modular design where each logistics function (shipments, vessels, customs, etc.) is a separate route with its own page, server actions, and validation schemas.

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js 16 App Router | Server components for data fetching, server actions for mutations |
| SQLite + Prisma 7 | Zero-config local development; PostgreSQL-ready for production |
| Auth.js v5 JWT | Stateless auth, no session table needed, credentials provider |
| shadcn/ui + Tailwind v4 | Accessible components, CSS-first theme system via `@theme` |
| @tanstack/react-table | Headless table with sorting, filtering, pagination |
| 5-palette theme system | Module-specific visual identity via CSS custom properties |

## Project Structure

```
meridian/
├── prisma/
│   ├── schema.prisma          # 14 database models
│   ├── seed.ts                # Demo data (users, vessels, shipments)
│   └── migrations/            # SQLite migrations
├── prisma.config.ts           # Prisma 7 datasource config
├── src/
│   ├── proxy.ts               # Auth proxy (replaces middleware in Next.js 16)
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, providers, app shell)
│   │   ├── globals.css        # Tailwind v4 @theme with 5 palettes
│   │   ├── page.tsx           # Redirect to /shipments
│   │   ├── (auth)/login/      # Login page (outside app shell)
│   │   ├── shipments/         # Shipment Ledger (Phase 1)
│   │   │   ├── page.tsx       # List view with KPIs + DataTable
│   │   │   ├── columns.tsx    # Column definitions
│   │   │   ├── new-shipment-dialog.tsx
│   │   │   └── [shipmentId]/page.tsx  # Detail with tabs
│   │   ├── vessels/           # Placeholder
│   │   ├── dispatch/          # Placeholder
│   │   ├── customs/           # Placeholder
│   │   ├── documents/         # Placeholder
│   │   ├── quality/           # Placeholder
│   │   ├── transport/         # Placeholder
│   │   ├── scanner/           # Placeholder
│   │   ├── integrations/      # Placeholder
│   │   ├── tracking/[lotId]/  # Public tracking page
│   │   └── api/auth/          # Auth.js API routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (Button, Table, etc.)
│   │   ├── layout/            # AppShell, Sidebar, Header, Providers
│   │   └── shared/            # DataTable, StatusBadge, KpiCard
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # Auth.js configuration
│   │   ├── constants.ts       # DOC_TYPES, statuses, carriers (from AgroDash)
│   │   ├── utils.ts           # cn() helper
│   │   ├── actions/           # Server actions
│   │   │   ├── audit.ts       # Audit logging
│   │   │   └── shipment-actions.ts
│   │   └── validations/       # Zod schemas
│   │       └── shipment.ts
│   └── types/
│       ├── index.ts           # Domain types, RBAC matrix
│       └── next-auth.d.ts     # Auth.js type augmentation
```

## Data Model

14 Prisma models organized around the shipment lifecycle:

```
User ──────────────────┐
Producer ──────────┐   │
Vessel ──────────┐ │   │
                 │ │   │
Container ───────┤ │   │
  │              │ │   │
ShipmentContainer│ │   │ (join table)
  │              │ │   │
Shipment ────────┴─┴───┘
  │
  ├── Document
  ├── CustomsDeclaration
  ├── DispatchPlan → TransportLeg
  └── AuditLog

QualityInspection → Container
ScanEvent → Container, Warehouse
```

## Authentication & Authorization

- **Auth.js v5** with credentials provider and JWT strategy
- **Proxy** (`src/proxy.ts`) redirects unauthenticated requests to `/login`
- **RBAC** defined in `src/types/index.ts` — 4 roles across 9 modules
- Server actions check authorization via `auth()` session helper

## Theme System

Five color palettes applied via `data-theme` attribute on module wrapper divs:

1. **Default/Meridian** — Green/lime (#526600, #95b70d) with Work Sans
2. **Shipments** — Forest green/amber (#2D6A4F, #FFB800) with Manrope
3. **Customs** — Green/yellow (#008a4e, #ffcc00) with Work Sans
4. **Quality/Scanner** — Gold/green (#745b00, #006d37) with Manrope
5. **Transport** — Olive/yellow (#4C6B1F, #EAB308) with Work Sans

CSS custom properties (`--primary`, `--theme-accent`, etc.) resolve per theme context.

## Server Actions Pattern

All mutations follow:
1. Authenticate via `auth()`
2. Validate input with Zod schema
3. Execute Prisma mutation
4. Write audit log entry
5. Call `revalidatePath()` to refresh data

## Phase Roadmap

- **Phase 0** ✅ Foundation (scaffold, auth, DB, layout, themes)
- **Phase 1** ✅ Shipment Ledger (CRUD, DataTable, detail page, audit)
- **Phase 2** 🔜 Vessels & Containers
- **Phase 3** 🔜 Document Management
- **Phase 4** 🔜 Quality Control
- **Phase 5** 🔜 Customs Dashboard
- **Phase 6** 🔜 Dispatch & Transport
- **Phase 7** 🔜 Warehouse Scanner
- **Phase 8** 🔜 Integrations
- **Phase 9** 🔜 Polish & Testing
