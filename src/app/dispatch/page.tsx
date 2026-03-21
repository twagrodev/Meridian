import { prisma } from "@/lib/db";
import { ClipboardList, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { dispatchColumns, type DispatchRow } from "./columns";
import { NewDispatchDialog } from "./new-dispatch-dialog";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [plans, shipments] = await Promise.all([
    prisma.dispatchPlan.findMany({
      where: { scheduledDate: { gte: start, lt: end } },
      include: {
        shipment: { select: { id: true, blNumber: true } },
        _count: { select: { transportLegs: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shipment.findMany({
      where: { deletedAt: null },
      select: { id: true, blNumber: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: DispatchRow[] = plans.map((p) => ({
    id: p.id,
    week: p.scheduledDate ? "W" + getISOWeekNumber(p.scheduledDate) : null,
    shipmentId: p.shipmentId,
    blNumber: p.shipment.blNumber,
    scheduledDate: p.scheduledDate?.toISOString() ?? null,
    destination: p.destination,
    status: p.status,
    legsCount: p._count.transportLegs,
    createdAt: p.createdAt.toISOString(),
  }));

  const total = plans.length;
  const planned = plans.filter((p) => p.status === "PLANNED").length;
  const inProgress = plans.filter((p) => p.status === "IN_PROGRESS").length;
  const completed = plans.filter((p) => p.status === "COMPLETED").length;

  return (
    <div data-theme="default">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-work-sans)]">
          Dispatch Planning
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Plan and coordinate dispatch schedules for shipment deliveries
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Plans"
          value={total}
          subtitle="All dispatch plans"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard
          title="Planned"
          value={planned}
          subtitle="Awaiting confirmation"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="In Progress"
          value={inProgress}
          subtitle="Currently dispatching"
          icon={<Loader2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Completed"
          value={completed}
          subtitle="Successfully delivered"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={dispatchColumns}
        data={rows}
        searchKey="destination"
        searchPlaceholder="Search by destination..."
        toolbar={<NewDispatchDialog shipments={shipments} />}
      />
    </div>
  );
}
