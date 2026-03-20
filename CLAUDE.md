@AGENTS.md

# Meridian — AgroFair Logistics Platform

## Quick Start

```bash
npm install
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev
```

Or use `start_meridian.bat` on Windows.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** shadcn/ui (Base UI primitives) + Tailwind CSS v4
- **Database:** SQLite via Prisma 7 + libsql adapter (PostgreSQL-ready via Docker)
- **Auth:** Auth.js v5 (credentials provider, JWT sessions)
- **Tables:** @tanstack/react-table v8

## Key Conventions

### Next.js 16 Breaking Changes
- `middleware.ts` is renamed to `proxy.ts` — export `proxy()` not `middleware()`
- shadcn/ui uses Base UI (not Radix) — no `asChild` prop
- `useSearchParams()` must be in a `<Suspense>` boundary
- Prisma v7: `url` in `prisma.config.ts` (not in schema.prisma), client needs `adapter` arg

### Prisma v7
- Config in `prisma.config.ts` with `datasource.url`
- Client uses `PrismaLibSql` adapter (note lowercase 'q': `PrismaLibSql`, not `PrismaLibSQL`)
- Seed runs with `npx tsx prisma/seed.ts`

### Theme System
5 palettes via `data-theme` attribute:
- Default/Meridian: `#526600` / `#95b70d` (Work Sans)
- Shipments: `#2D6A4F` / `#FFB800` (Manrope)
- Customs: `#008a4e` / `#ffcc00` (Work Sans)
- Quality/Scanner: `#745b00` / `#006d37` (Manrope)
- Transport: `#4C6B1F` / `#EAB308` (Work Sans)

### Auth
- 4 demo users: ops/logistics/customs/docs @agrofair.nl (password: meridian2026)
- Roles: OPS_MANAGER, LOGISTICS_COORD, CUSTOMS_SPEC, DOC_CLERK
- RBAC matrix in `src/types/index.ts`

## Project Structure

```
src/app/           — App Router pages (one per module)
src/components/ui/ — shadcn/ui primitives
src/components/layout/ — Sidebar, Header, AppShell, Providers
src/components/shared/ — DataTable, StatusBadge, KpiCard
src/lib/           — db.ts, auth.ts, constants.ts
src/lib/actions/   — Server Actions (shipment-actions, audit)
src/lib/validations/ — Zod schemas
src/types/         — TypeScript types, RBAC, next-auth augmentation
prisma/            — Schema, migrations, seed
```

## Database

14 tables: User, Vessel, Container, Shipment, ShipmentContainer, Producer, Document, CustomsDeclaration, QualityInspection, DispatchPlan, TransportLeg, Warehouse, AuditLog, ScanEvent.

Seed data: 4 users, 5 producers, 8 vessels, 20 containers, 25 shipments.

## Build Commands

- `npm run dev` — development server (port 3000)
- `npm run build` — production build
- `npm run db:seed` — seed the database
- `npm run db:studio` — open Prisma Studio
