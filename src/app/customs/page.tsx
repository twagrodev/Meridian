import { prisma } from "@/lib/db";
import { FileText, Clock, Search, CheckCircle } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { declarationColumns, type DeclarationRow } from "./columns";
import { NewDeclarationDialog } from "./new-declaration-dialog";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function CustomsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [declarations, shipments] = await Promise.all([
    prisma.customsDeclaration.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        shipment: { select: { id: true, blNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shipment.findMany({
      where: { deletedAt: null },
      select: { id: true, blNumber: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: DeclarationRow[] = declarations.map((d) => ({
    id: d.id,
    week: "W" + getISOWeekNumber(d.createdAt),
    declarationNumber: d.declarationNumber,
    shipmentId: d.shipment.id,
    shipmentBlNumber: d.shipment.blNumber,
    status: d.status,
    submittedAt: d.submittedAt?.toISOString() ?? null,
    clearedAt: d.clearedAt?.toISOString() ?? null,
    releasedAt: d.releasedAt?.toISOString() ?? null,
  }));

  const total = declarations.length;
  const pending = declarations.filter((d) => d.status === "PENDING").length;
  const underReview = declarations.filter((d) => d.status === "UNDER_REVIEW").length;
  const cleared = declarations.filter((d) => d.status === "CLEARED").length;

  return (
    <div data-theme="customs">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Customs Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Track customs declarations, clearance status, and compliance
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Declarations"
          value={total}
          subtitle="All declarations"
          icon={<FileText className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending"
          value={pending}
          subtitle="Awaiting submission"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Under Review"
          value={underReview}
          subtitle="Being reviewed"
          icon={<Search className="h-5 w-5" />}
        />
        <KpiCard
          title="Cleared"
          value={cleared}
          subtitle="Customs cleared"
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={declarationColumns}
        data={rows}
        searchKey="declarationNumber"
        searchPlaceholder="Search by declaration number..."
        toolbar={<NewDeclarationDialog shipments={shipments} />}
      />
    </div>
  );
}
