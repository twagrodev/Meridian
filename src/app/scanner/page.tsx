import { prisma } from "@/lib/db";
import { ScanLine, Box, Warehouse, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { scanEventColumns, type ScanEventRow } from "./columns";
import { ScannerInput } from "./scanner-input";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [scanEvents, warehouses, todayCount, totalCount, matchedCount, activeWarehouseCount] =
    await Promise.all([
      prisma.scanEvent.findMany({
        where: { createdAt: { gte: start, lt: end } },
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          container: { select: { containerCode: true } },
          warehouse: { select: { name: true } },
        },
      }),
      prisma.warehouse.findMany({
        select: { id: true, name: true },
      }),
      prisma.scanEvent.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.scanEvent.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      prisma.scanEvent.count({
        where: { containerId: { not: null }, createdAt: { gte: start, lt: end } },
      }),
      prisma.warehouse.count(),
    ]);

  const rows: ScanEventRow[] = scanEvents.map((s) => ({
    id: s.id,
    week: "W" + getISOWeekNumber(s.createdAt),
    scannedCode: s.scannedCode,
    scanType: s.scanType,
    containerCode: s.container?.containerCode ?? null,
    warehouseName: s.warehouse?.name ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div data-theme="quality">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
          Warehouse Scanner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Record barcode, QR, and RFID scans for container tracking
        </p>
      </div>

      <div className="mb-6">
        <ScannerInput warehouses={warehouses} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Scans Today"
          value={todayCount}
          subtitle="Since midnight"
          icon={<ScanLine className="h-5 w-5" />}
        />
        <KpiCard
          title="Matched Containers"
          value={matchedCount}
          subtitle="Successfully identified"
          icon={<Box className="h-5 w-5" />}
        />
        <KpiCard
          title="Warehouses"
          value={activeWarehouseCount}
          subtitle="Active locations"
          icon={<Warehouse className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Scans"
          value={totalCount}
          subtitle="All time"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={scanEventColumns}
        data={rows}
        searchKey="scannedCode"
        searchPlaceholder="Search by scanned code..."
      />
    </div>
  );
}
