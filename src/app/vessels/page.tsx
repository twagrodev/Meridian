import { prisma } from "@/lib/db";
import { Ship, Anchor, Box, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { vesselColumns, type VesselRow } from "./columns";
import { NewVesselDialog } from "./new-vessel-dialog";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function VesselsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [vessels, containerCount, totalCapacity] = await Promise.all([
    prisma.vessel.findMany({
      where: { deletedAt: null, currentEta: { gte: start, lt: end } },
      include: {
        containers: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.container.count({ where: { deletedAt: null } }),
    prisma.vessel.aggregate({
      where: { deletedAt: null, capacity: { not: null } },
      _sum: { capacity: true },
    }),
  ]);

  const rows: VesselRow[] = vessels.map((v) => ({
    id: v.id,
    week: v.currentEta ? "W" + getISOWeekNumber(v.currentEta) : null,
    name: v.name,
    imo: v.imo,
    flag: v.flag,
    carrier: v.carrier,
    capacity: v.capacity,
    currentEta: v.currentEta?.toISOString() ?? null,
    containerCount: v.containers.length,
  }));

  const total = vessels.length;
  const activeVessels = vessels.filter((v) => v.currentEta !== null).length;

  return (
    <div data-theme="default">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-work-sans)]">
          Vessels & Containers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Manage vessels, track capacity, and monitor container assignments
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Vessels"
          value={total}
          subtitle="Registered vessels"
          icon={<Ship className="h-5 w-5" />}
        />
        <KpiCard
          title="Active Vessels"
          value={activeVessels}
          subtitle="With scheduled ETA"
          icon={<Anchor className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Containers"
          value={containerCount}
          subtitle="Across all vessels"
          icon={<Box className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Capacity"
          value={totalCapacity._sum.capacity?.toLocaleString() ?? "0"}
          subtitle="TEU combined"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={vesselColumns}
        data={rows}
        searchKey="name"
        searchPlaceholder="Search by vessel name..."
        toolbar={<NewVesselDialog />}
      />
    </div>
  );
}
