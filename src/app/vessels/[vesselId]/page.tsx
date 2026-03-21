import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Ship,
  Anchor,
  Flag,
  Box,
  Scale,
  Package,
} from "lucide-react";
import { CONTAINER_TYPE_LABELS } from "@/lib/constants";

interface VesselDetailProps {
  params: Promise<{ vesselId: string }>;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function VesselDetailPage({ params }: VesselDetailProps) {
  const { vesselId } = await params;

  const vessel = await prisma.vessel.findUnique({
    where: { id: vesselId },
    include: {
      containers: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      shipments: {
        where: { deletedAt: null },
        include: {
          producer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vessel || vessel.deletedAt) {
    notFound();
  }

  return (
    <div data-theme="default">
      <div className="mb-6">
        <Link
          href="/vessels"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Vessels
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-[family-name:var(--font-work-sans)]">
                {vessel.name}
              </h1>
              {vessel.carrier && (
                <Badge variant="secondary">{vessel.carrier}</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {vessel.imo && (
                <span className="flex items-center gap-1">
                  <Anchor className="h-3.5 w-3.5" aria-hidden="true" />
                  IMO {vessel.imo}
                </span>
              )}
              {vessel.flag && (
                <span className="flex items-center gap-1">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  {vessel.flag}
                </span>
              )}
              {vessel.currentEta && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  ETA {formatDate(vessel.currentEta)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="containers">
            Containers ({vessel.containers.length})
          </TabsTrigger>
          <TabsTrigger value="shipments">
            Shipments ({vessel.shipments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vessel Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  label="Name"
                  value={vessel.name}
                  icon={<Ship className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="IMO Number"
                  value={vessel.imo}
                  icon={<Anchor className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Flag"
                  value={vessel.flag}
                  icon={<Flag className="h-3.5 w-3.5" />}
                />
                <DetailRow label="Carrier" value={vessel.carrier} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Capacity & Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  label="Capacity (TEU)"
                  value={
                    vessel.capacity != null
                      ? vessel.capacity.toLocaleString()
                      : null
                  }
                />
                <DetailRow
                  label="Current ETA"
                  value={formatDate(vessel.currentEta)}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Containers Assigned"
                  value={String(vessel.containers.length)}
                />
                <DetailRow
                  label="Active Shipments"
                  value={String(vessel.shipments.length)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="containers" className="mt-6">
          {vessel.containers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No containers assigned to this vessel.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vessel.containers.map((container) => (
                <Card key={container.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono font-semibold">
                          {container.containerCode}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {CONTAINER_TYPE_LABELS[container.type] ??
                            container.type}
                        </p>
                      </div>
                      <StatusBadge status={container.status} />
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {container.sealNumber && (
                        <p className="flex items-center gap-1.5">
                          <Package
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Seal: {container.sealNumber}
                        </p>
                      )}
                      {container.grossWeight != null && (
                        <p className="flex items-center gap-1.5">
                          <Scale
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Gross: {container.grossWeight.toLocaleString()} kg
                        </p>
                      )}
                      {container.nettWeight != null && (
                        <p className="flex items-center gap-1.5">
                          <Scale
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Nett: {container.nettWeight.toLocaleString()} kg
                        </p>
                      )}
                      {container.tareWeight != null && (
                        <p className="flex items-center gap-1.5">
                          <Scale
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Tare: {container.tareWeight.toLocaleString()} kg
                        </p>
                      )}
                      {container.boxes != null && (
                        <p className="flex items-center gap-1.5">
                          <Box className="h-3.5 w-3.5" aria-hidden="true" />
                          Boxes: {container.boxes.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shipments" className="mt-6">
          {vessel.shipments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No shipments linked to this vessel.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {vessel.shipments.map((shipment) => (
                <Card key={shipment.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <Link
                        href={`/shipments/${shipment.id}`}
                        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {shipment.blNumber ?? "No BL"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {shipment.producer?.name ?? "No producer"}
                        {shipment.origin && ` · ${shipment.origin}`}
                        {shipment.destination &&
                          ` → ${shipment.destination}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {shipment.eta && (
                        <span className="text-xs text-muted-foreground">
                          ETA {formatDate(shipment.eta)}
                        </span>
                      )}
                      <StatusBadge status={shipment.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
