# Changelog

## [0.1.0] - 2026-03-20

### Phase 0: Foundation
- Scaffolded Next.js 16 with TypeScript, Tailwind CSS v4, and App Router
- Installed and configured shadcn/ui (Base UI primitives)
- Set up Prisma 7 with SQLite (libsql adapter) — 14 database models
- Implemented Auth.js v5 with credentials provider and JWT sessions
- Created 4 demo users (OPS_MANAGER, LOGISTICS_COORD, CUSTOMS_SPEC, DOC_CLERK)
- Built root layout with Work Sans, Manrope, and Inter fonts
- Implemented 5-palette theme system via CSS custom properties and `data-theme`
- Created sidebar navigation with 9 module links
- Built header with user profile dropdown
- Created placeholder pages for all 9 modules
- Seeded database: 4 users, 5 producers, 8 vessels, 20 containers, 25 shipments

### Phase 1: Shipment Ledger
- Built reusable `DataTable` component with sorting, filtering, and pagination
- Created `StatusBadge` and `KpiCard` shared components
- Implemented shipment list page with 4 KPI cards and sortable data table
- Built shipment detail page with tabs: Overview, Containers, Documents, Timeline
- Created "New Shipment" dialog with form validation (Zod)
- Implemented server actions: createShipment, updateShipment, deleteShipment
- Added audit logging for all shipment mutations
- Ported DOC_TYPES and EXTRACTION_FIELDS from AgroDash to TypeScript constants
- Applied Shipments theme (#2D6A4F / #FFB800, Manrope font)

### Infrastructure
- Created `docker-compose.yml` for PostgreSQL 16 (ready when Docker is installed)
- Added `.env.example` with configuration documentation
- Created `start_meridian.bat` and `build_meridian.bat` startup scripts
- Set up proxy.ts (Next.js 16 replacement for middleware.ts)
- Configured RBAC matrix for 4 roles across 9 modules
