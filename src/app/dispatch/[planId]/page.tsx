import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, MapPin, Truck, Ship, Train, Plane } from "lucide-react";
import { TRANSPORT_MODE_LABELS } from "@/lib/constants";

interface DispatchDetailProps {
  params: Promise<{ planId: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "\u2014";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null): string {
  if (!date) return "\u2014";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const modeIcons: Record<string, React.ReactNode> = {
  SEA: <Ship className="h-4 w-4" />,
  ROAD: <Truck className="h-4 w-4" />,
  RAIL: <Train className="h-4 w-4" />,
  AIR: <Plane className="h-4 w-4" />,
};

export default async function DispatchDetailPage({ params }: DispatchDetailProps) {
  const { planId } = await params;

  const plan = await prisma.dispatchPlan.findUnique({
    where: { id: planId },
    include: {
      shipment: {
        include: {
          producer: { select: { name: true } },
          vessel: { select: { name: true } },
        },
      },
      transportLegs: {
        orderBy: { departureTime: "asc" },
      },
    },
  });

  if (!plan) {
    notFound();
  }

  return (
    <div data-theme="default">
      <div className="mb-6">
        <Link
          href="/dispatch"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dispatch
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-[family-name:var(--font-work-sans)]">
                {plan.shipment.blNumber ?? "No BL"} &rarr; {plan.destination ?? "TBD"}
              </h1>
              <StatusBadge status={plan.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Scheduled: {formatDate(plan.scheduledDate)}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="legs">
            Transport Legs ({plan.transportLegs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dispatch Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  label="Scheduled Date"
                  value={formatDate(plan.scheduledDate)}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
                <DetailRow label="Status" value={plan.status} />
                <DetailRow
                  label="Destination"
                  value={plan.destination}
                  icon={<MapPin className="h-3.5 w-3.5" />}
                />
                <DetailRow label="Transport Legs" value={String(plan.transportLegs.length)} />
                {plan.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{plan.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Shipment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="BL Number" value={plan.shipment.blNumber} />
                <DetailRow label="Producer" value={plan.shipment.producer?.name} />
                <DetailRow label="Vessel" value={plan.shipment.vessel?.name} />
                <DetailRow label="Route" value={`${plan.shipment.origin ?? "?"} \u2192 ${plan.shipment.destination ?? "?"}`} />
                <div className="pt-2">
                  <Link
                    href={`/shipments/${plan.shipment.id}`}
                    className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    View Shipment Details
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="legs" className="mt-6">
          {plan.transportLegs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No transport legs defined yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {plan.transportLegs.map((leg, idx) => (
                <Card key={leg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        {modeIcons[leg.mode] ?? <Truck className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            Leg {idx + 1}: {TRANSPORT_MODE_LABELS[leg.mode] ?? leg.mode}
                          </p>
                          <StatusBadge status={leg.status} />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p>Carrier: {leg.carrier ?? "\u2014"}</p>
                          <p>Tracking: {leg.trackingRef ?? "\u2014"}</p>
                          <p>From: {leg.origin ?? "\u2014"}</p>
                          <p>To: {leg.destination ?? "\u2014"}</p>
                          <p>Departure: {formatDateTime(leg.departureTime)}</p>
                          <p>Arrival: {formatDateTime(leg.arrivalTime)}</p>
                        </div>
                      </div>
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
      <span className="font-medium">{value ?? "\u2014"}</span>
    </div>
  );
}
