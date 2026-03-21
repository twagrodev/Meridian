import { prisma } from "@/lib/db";
import Link from "next/link";
import { KpiCard } from "@/components/shared/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package, Ship, FileText, ClipboardCheck, FileCheck, Truck, ScanBarcode,
} from "lucide-react";
import { parseWeekParams, getWeekDateRange, formatWeekLabel } from "@/lib/week-utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [
    shipmentCount,
    inTransitCount,
    vesselCount,
    containerCount,
    documentCount,
    pendingDocsCount,
    inspectionCount,
    customsPendingCount,
    dispatchCount,
    scanCount,
    recentShipments,
  ] = await Promise.all([
    prisma.shipment.count({ where: { deletedAt: null, eta: { gte: start, lt: end } } }),
    prisma.shipment.count({ where: { deletedAt: null, status: "IN_TRANSIT", eta: { gte: start, lt: end } } }),
    prisma.vessel.count({ where: { deletedAt: null, currentEta: { gte: start, lt: end } } }),
    prisma.container.count({ where: { deletedAt: null } }),
    prisma.document.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
    prisma.document.count({ where: { deletedAt: null, docStatus: { in: ["UPLOADED", "PROCESSING"] }, createdAt: { gte: start, lt: end } } }),
    prisma.qualityInspection.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.customsDeclaration.count({ where: { status: "PENDING", createdAt: { gte: start, lt: end } } }),
    prisma.dispatchPlan.count({ where: { scheduledDate: { gte: start, lt: end } } }),
    prisma.scanEvent.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.shipment.findMany({
      where: { deletedAt: null, eta: { gte: start, lt: end } },
      include: { vessel: { select: { name: true } }, producer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {weekLabel} &middot; AgroFair Meridian logistics overview
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Shipments"
          value={shipmentCount}
          subtitle={`${inTransitCount} in transit`}
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          title="Vessels"
          value={vesselCount}
          subtitle={`${containerCount} containers`}
          icon={<Ship className="h-5 w-5" />}
        />
        <KpiCard
          title="Documents"
          value={documentCount}
          subtitle={`${pendingDocsCount} pending review`}
          icon={<FileText className="h-5 w-5" />}
        />
        <KpiCard
          title="Inspections"
          value={inspectionCount}
          subtitle={`${customsPendingCount} customs pending`}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentShipments.map((s) => (
              <Link
                key={s.id}
                href={`/shipments/${s.id}`}
                className="flex items-center justify-between rounded-md p-2 hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div>
                  <p className="text-sm font-medium">{s.blNumber ?? "No BL"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.producer?.name} &middot; {s.vessel?.name}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{s.status}</span>
              </Link>
            ))}
            <Link
              href="/shipments"
              className="block text-center text-sm text-primary hover:underline pt-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              View all shipments
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Shipments", href: "/shipments", icon: Package },
                { label: "Vessels", href: "/vessels", icon: Ship },
                { label: "Documents", href: "/documents", icon: FileText },
                { label: "Quality", href: "/quality", icon: ClipboardCheck },
                { label: "Customs", href: "/customs", icon: FileCheck },
                { label: "Dispatch", href: "/dispatch", icon: Truck },
                { label: "Scanner", href: "/scanner", icon: ScanBarcode },
              ].map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
