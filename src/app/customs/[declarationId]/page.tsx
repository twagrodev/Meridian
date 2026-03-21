import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, FileText, Ship } from "lucide-react";

interface DeclarationDetailProps {
  params: Promise<{ declarationId: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "\u2014";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function DeclarationDetailPage({ params }: DeclarationDetailProps) {
  const { declarationId } = await params;

  const declaration = await prisma.customsDeclaration.findUnique({
    where: { id: declarationId },
    include: {
      shipment: {
        select: {
          id: true,
          blNumber: true,
          origin: true,
          destination: true,
          status: true,
        },
      },
    },
  });

  if (!declaration) {
    notFound();
  }

  const timelineEvents = [
    { label: "Created", date: declaration.createdAt, icon: FileText },
    { label: "Submitted", date: declaration.submittedAt, icon: Calendar },
    { label: "Cleared", date: declaration.clearedAt, icon: Calendar },
    { label: "Released", date: declaration.releasedAt, icon: Calendar },
  ];

  return (
    <div data-theme="customs">
      <div className="mb-6">
        <Link
          href="/customs"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Customs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {declaration.declarationNumber ?? "No Declaration #"}
              </h1>
              <StatusBadge status={declaration.status} />
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Ship className="h-3.5 w-3.5" aria-hidden="true" />
                <Link
                  href={`/shipments/${declaration.shipment.id}`}
                  className="hover:underline"
                >
                  {declaration.shipment.blNumber ?? "No BL"}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Declaration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Declaration #" value={declaration.declarationNumber} />
                <DetailRow label="Status" value={declaration.status} />
                <DetailRow label="Created" value={formatDate(declaration.createdAt)} />
                <DetailRow label="Updated" value={formatDate(declaration.updatedAt)} />
                {declaration.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{declaration.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Shipment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  label="BL Number"
                  value={declaration.shipment.blNumber}
                  icon={<Ship className="h-3.5 w-3.5" />}
                />
                <DetailRow label="Origin" value={declaration.shipment.origin} />
                <DetailRow label="Destination" value={declaration.shipment.destination} />
                <DetailRow label="Shipment Status" value={declaration.shipment.status} />
                <div className="pt-2">
                  <Link
                    href={`/shipments/${declaration.shipment.id}`}
                    className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    View Shipment Details
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Declaration Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {timelineEvents.map((event, index) => {
                  const isCompleted = event.date !== null;
                  const isLast = index === timelineEvents.length - 1;
                  const IconComponent = event.icon;

                  return (
                    <div key={event.label} className="relative flex gap-4 pb-8 last:pb-0">
                      {!isLast && (
                        <div
                          className={`absolute left-4 top-8 h-full w-px ${
                            isCompleted ? "bg-primary" : "bg-border"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isCompleted
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-sm font-medium ${
                          isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {event.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.date ? formatDate(event.date) : "Not yet"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
