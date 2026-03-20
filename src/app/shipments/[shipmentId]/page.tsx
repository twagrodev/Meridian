import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Ship, User } from "lucide-react";

interface ShipmentDetailProps {
  params: Promise<{ shipmentId: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ShipmentDetailPage({ params }: ShipmentDetailProps) {
  const { shipmentId } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      producer: true,
      vessel: true,
      createdBy: { select: { name: true, email: true } },
      containers: {
        include: {
          container: true,
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!shipment || shipment.deletedAt) {
    notFound();
  }

  return (
    <div data-theme="shipments">
      <div className="mb-6">
        <Link
          href="/shipments"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shipments
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
                {shipment.blNumber ?? "No BL"}
              </h1>
              <StatusBadge status={shipment.status} />
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {shipment.producer && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  {shipment.producer.name}
                </span>
              )}
              {shipment.vessel && (
                <span className="flex items-center gap-1">
                  <Ship className="h-3.5 w-3.5" aria-hidden="true" />
                  {shipment.vessel.name}
                </span>
              )}
              {shipment.lotNumber && (
                <Badge variant="secondary">{shipment.lotNumber}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="containers">
            Containers ({shipment.containers.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({shipment.documents.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline ({shipment.auditLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="BL Number" value={shipment.blNumber} />
                <DetailRow label="Lot Number" value={shipment.lotNumber} />
                <DetailRow label="Incoterms" value={shipment.incoterms} />
                <DetailRow label="Created by" value={shipment.createdBy?.name} />
                <DetailRow label="Created" value={formatDate(shipment.createdAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Route & Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Origin" value={shipment.origin} icon={<MapPin className="h-3.5 w-3.5" />} />
                <DetailRow label="Destination" value={shipment.destination} icon={<MapPin className="h-3.5 w-3.5" />} />
                <DetailRow label="ETD" value={formatDate(shipment.etd)} icon={<Calendar className="h-3.5 w-3.5" />} />
                <DetailRow label="ETA" value={formatDate(shipment.eta)} icon={<Calendar className="h-3.5 w-3.5" />} />
                <DetailRow label="Actual Arrival" value={formatDate(shipment.actualArrival)} />
              </CardContent>
            </Card>

            {shipment.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{shipment.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="containers" className="mt-6">
          {shipment.containers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No containers linked to this shipment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shipment.containers.map(({ container }) => (
                <Card key={container.id}>
                  <CardContent className="p-4">
                    <p className="font-mono font-semibold">{container.containerCode}</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>Type: {container.type}</p>
                      {container.sealNumber && <p>Seal: {container.sealNumber}</p>}
                      {container.grossWeight && <p>Gross: {container.grossWeight.toLocaleString()} kg</p>}
                      {container.boxes && <p>Boxes: {container.boxes.toLocaleString()}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {shipment.documents.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No documents linked to this shipment yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {shipment.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{doc.originalName}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.docType ?? "Unclassified"} &middot; {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={doc.docStatus} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {shipment.auditLogs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No audit trail entries yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {shipment.auditLogs.map((log) => {
                const meta = log.metadata ? JSON.parse(log.metadata) : null;
                return (
                  <Card key={log.id}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="text-xs font-bold">{log.action[0]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {log.user?.name ?? "System"} &middot;{" "}
                          <span className="font-normal text-muted-foreground">
                            {log.action} {log.entityType}
                          </span>
                        </p>
                        {meta && (
                          <p className="mt-1 text-xs text-muted-foreground font-mono">
                            {JSON.stringify(meta)}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {log.createdAt.toLocaleString("en-GB")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
