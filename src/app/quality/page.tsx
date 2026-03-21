import { prisma } from "@/lib/db";
import { ClipboardCheck, Award, BarChart3, XCircle } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable } from "@/components/shared/DataTable";
import { inspectionColumns, type InspectionRow } from "./columns";
import { NewInspectionDialog } from "./new-inspection-dialog";
import { parseWeekParams, getWeekDateRange, formatWeekLabel, getISOWeekNumber } from "@/lib/week-utils";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [inspections, containers] = await Promise.all([
    prisma.qualityInspection.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        container: { select: { containerCode: true } },
        inspector: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.container.findMany({
      where: { deletedAt: null },
      select: { id: true, containerCode: true },
    }),
  ]);

  const rows: InspectionRow[] = inspections.map((i) => ({
    id: i.id,
    week: "W" + getISOWeekNumber(i.createdAt),
    containerCode: i.container?.containerCode ?? null,
    grade: i.grade,
    score: i.score,
    moisture: i.moisture,
    pulpTemp: i.pulpTemp,
    crownColor: i.crownColor,
    inspectorName: i.inspector?.name ?? null,
    createdAt: i.createdAt.toISOString(),
  }));

  const total = inspections.length;
  const premium = inspections.filter((i) => i.grade === "PREMIUM").length;
  const rejected = inspections.filter((i) => i.grade === "REJECTED").length;
  const scores = inspections
    .map((i) => i.score)
    .filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : "\u2014";

  return (
    <div data-theme="quality">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
          Quality Control
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; Inspect, grade, and track banana quality across all containers
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Inspections"
          value={total}
          subtitle="All inspections recorded"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <KpiCard
          title="Premium"
          value={premium}
          subtitle="Top quality grade"
          icon={<Award className="h-5 w-5" />}
        />
        <KpiCard
          title="Average Score"
          value={avgScore}
          subtitle="Across scored inspections"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <KpiCard
          title="Rejected"
          value={rejected}
          subtitle="Below quality standards"
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <DataTable
        columns={inspectionColumns}
        data={rows}
        searchKey="containerCode"
        searchPlaceholder="Search by container code..."
        toolbar={<NewInspectionDialog containers={containers} />}
      />
    </div>
  );
}
