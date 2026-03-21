import { prisma } from "@/lib/db";
import { Package, Ship, Anchor, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { shipmentColumns, type ShipmentRow } from "./columns";
import { NewShipmentDialog } from "./new-shipment-dialog";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [shipments, producers, vessels] = await Promise.all([
    prisma.shipment.findMany({
      where: { deletedAt: null, eta: { gte: start, lt: end } },
      include: {
        producer: { select: { name: true } },
        vessel: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.producer.findMany({ select: { id: true, name: true } }),
    prisma.vessel.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  const rows: ShipmentRow[] = shipments.map((s) => ({
    id: s.id,
    week: s.eta ? "W" + getISOWeekNumber(s.eta) : null,
    blNumber: s.blNumber,
    lotNumber: s.lotNumber,
    producerName: s.producer?.name ?? null,
    vesselName: s.vessel?.name ?? null,
    origin: s.origin,
    destination: s.destination,
    status: s.status,
    eta: s.eta?.toISOString() ?? null,
  }));

  const total = shipments.length;
  const inTransit = shipments.filter((s) => s.status === "IN_TRANSIT").length;
  const atPort = shipments.filter((s) => s.status === "AT_PORT").length;
  const customsHold = shipments.filter((s) => s.status === "CUSTOMS_HOLD").length;

  return (
    <div data-theme="shipments">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
          Shipment Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Track all banana import shipments from origin to delivery
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Shipments"
          value={total}
          subtitle="All active shipments"
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          title="In Transit"
          value={inTransit}
          subtitle="Currently on water"
          icon={<Ship className="h-5 w-5" />}
        />
        <KpiCard
          title="At Port"
          value={atPort}
          subtitle="Awaiting processing"
          icon={<Anchor className="h-5 w-5" />}
        />
        <KpiCard
          title="Customs Hold"
          value={customsHold}
          subtitle="Requires attention"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={shipmentColumns}
        data={rows}
        searchKey="blNumber"
        searchPlaceholder="Search by BL number..."
        toolbar={<NewShipmentDialog producers={producers} vessels={vessels} />}
      />
    </div>
  );
}
