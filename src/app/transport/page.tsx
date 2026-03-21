import { prisma } from "@/lib/db";
import { Truck, Ship, Route, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { transportColumns, type TransportLegRow } from "./columns";
import { NewLegDialog } from "./new-leg-dialog";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function TransportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [legs, dispatchPlans] = await Promise.all([
    prisma.transportLeg.findMany({
      where: { departureTime: { gte: start, lt: end } },
      include: {
        dispatchPlan: {
          include: {
            shipment: { select: { id: true, blNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispatchPlan.findMany({
      include: {
        shipment: { select: { id: true, blNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: TransportLegRow[] = legs.map((l) => ({
    id: l.id,
    week: l.departureTime ? "W" + getISOWeekNumber(l.departureTime) : null,
    trackingRef: l.trackingRef,
    mode: l.mode,
    carrier: l.carrier,
    origin: l.origin,
    destination: l.destination,
    departureTime: l.departureTime?.toISOString() ?? null,
    arrivalTime: l.arrivalTime?.toISOString() ?? null,
    status: l.status,
  }));

  const planOptions = dispatchPlans.map((p) => ({
    id: p.id,
    destination: p.destination,
    blNumber: p.shipment.blNumber,
  }));

  const total = legs.length;
  const bySea = legs.filter((l) => l.mode === "SEA").length;
  const byRoad = legs.filter((l) => l.mode === "ROAD").length;
  const inTransit = legs.filter((l) => l.status === "IN_PROGRESS").length;

  return (
    <div data-theme="transport">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-work-sans)]">
          Transport Legs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Track multi-modal transport movements across the supply chain
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Legs"
          value={total}
          subtitle="All transport segments"
          icon={<Route className="h-5 w-5" />}
        />
        <KpiCard
          title="By Sea"
          value={bySea}
          subtitle="Ocean freight legs"
          icon={<Ship className="h-5 w-5" />}
        />
        <KpiCard
          title="By Road"
          value={byRoad}
          subtitle="Trucking legs"
          icon={<Truck className="h-5 w-5" />}
        />
        <KpiCard
          title="In Transit"
          value={inTransit}
          subtitle="Currently moving"
          icon={<Loader2 className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={transportColumns}
        data={rows}
        searchKey="trackingRef"
        searchPlaceholder="Search by tracking reference..."
        toolbar={<NewLegDialog dispatchPlans={planOptions} />}
      />
    </div>
  );
}
