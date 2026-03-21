import { Package, Ship, Anchor, Box } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { getShipmentArrivals, getAvailableWeeks } from "@/lib/queries/shipment-arrivals";
import { ArrivalsTable } from "./arrivals-table";
import { WeekFilter } from "./week-filter";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const weekParam = params.week ? Number(params.week) : undefined;

  const [rows, weeks] = await Promise.all([
    getShipmentArrivals(weekParam),
    getAvailableWeeks(),
  ]);

  const uniqueLots = new Set(rows.map((r) => r.lot)).size;
  const uniqueContainers = new Set(rows.map((r) => r.container).filter(Boolean)).size;
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const uniqueVessels = new Set(rows.map((r) => r.vessel).filter(Boolean)).size;

  const weekLabel = weekParam ? `Week ${weekParam}` : `All weeks (${weeks.join(", ")})`;

  return (
    <div data-theme="shipments">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
            Shipment Arrivals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {weekLabel} &middot; Banana import shipment tracker
          </p>
        </div>
        <WeekFilter weeks={weeks} current={weekParam ?? null} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Lots"
          value={uniqueLots}
          subtitle={`${rows.length} line items`}
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          title="Containers"
          value={uniqueContainers}
          subtitle="Unique containers"
          icon={<Box className="h-5 w-5" />}
        />
        <KpiCard
          title="Boxes"
          value={totalAmount.toLocaleString()}
          subtitle="Total box count"
          icon={<Anchor className="h-5 w-5" />}
        />
        <KpiCard
          title="Vessels"
          value={uniqueVessels}
          subtitle="Distinct vessels"
          icon={<Ship className="h-5 w-5" />}
        />
      </div>

      <ArrivalsTable data={rows} />
    </div>
  );
}
