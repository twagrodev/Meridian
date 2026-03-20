# Meridian — AgroFair Logistics Platform

A full-stack banana-import logistics dashboard built with Next.js 16, designed to replace AgroDash with a modern, unified platform covering shipments, vessels, customs, documents, quality control, and warehouse operations.

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Or on Windows: run `start_meridian.bat`

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| ops@agrofair.nl | meridian2026 | Operations Manager |
| logistics@agrofair.nl | meridian2026 | Logistics Coordinator |
| customs@agrofair.nl | meridian2026 | Customs Specialist |
| docs@agrofair.nl | meridian2026 | Document Clerk |

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Database:** SQLite via Prisma 7 (PostgreSQL-ready)
- **Auth:** Auth.js v5 (JWT sessions)
- **Tables:** @tanstack/react-table v8
- **Language:** TypeScript 5

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Shipments | Active | Central shipment ledger with CRUD, search, and detail views |
| Vessels | Planned | Vessel tracking and container management |
| Dispatch | Planned | Dispatch planning and scheduling |
| Customs | Planned | Customs declarations and clearance tracking |
| Documents | Planned | Document upload, OCR, classification |
| Quality | Planned | QC inspections and grading |
| Transport | Planned | Multi-modal transport tracking |
| Scanner | Planned | Mobile warehouse barcode scanning |
| Integrations | Planned | Google Sheets, OCR, QCOne |

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# SQLite (default)
DATABASE_URL="file:./dev.db"

# PostgreSQL (with Docker)
# DATABASE_URL="postgresql://meridian:meridian@localhost:5432/meridian"

AUTH_SECRET="your-secret-here"
```

### PostgreSQL with Docker

```bash
docker compose up -d
# Update DATABASE_URL in .env to PostgreSQL connection string
npx prisma migrate dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:migrate` | Run database migrations |
| `npm run db:reset` | Reset database |

## License

Proprietary — AgroFair BV
