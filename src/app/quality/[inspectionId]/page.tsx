import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Thermometer, Droplets, Palette, Calendar, Box, User } from "lucide-react";

interface InspectionDetailProps {
  params: Promise<{ inspectionId: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "\u2014";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function InspectionDetailPage({ params }: InspectionDetailProps) {
  const { inspectionId } = await params;

  const inspection = await prisma.qualityInspection.findUnique({
    where: { id: inspectionId },
    include: {
      container: true,
      inspector: { select: { name: true, email: true } },
    },
  });

  if (!inspection) {
    notFound();
  }

  const defectsList: string[] = (() => {
    if (!inspection.defects) return [];
    try {
      const parsed = JSON.parse(inspection.defects);
      if (Array.isArray(parsed)) return parsed;
      return [String(inspection.defects)];
    } catch {
      return inspection.defects.trim() ? [inspection.defects] : [];
    }
  })();

  return (
    <div data-theme="quality">
      <div className="mb-6">
        <Link
          href="/quality"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Quality Control
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
                {inspection.container?.containerCode ?? "No Container"}
              </h1>
              {inspection.grade && <StatusBadge status={inspection.grade} />}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {inspection.inspector && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  {inspection.inspector.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(inspection.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="defects">
            Defects ({defectsList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inspection Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  label="Grade"
                  value={inspection.grade}
                  icon={<Palette className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Score"
                  value={inspection.score != null ? inspection.score.toFixed(1) : null}
                />
                <DetailRow
                  label="Moisture"
                  value={inspection.moisture != null ? `${inspection.moisture.toFixed(1)}%` : null}
                  icon={<Droplets className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Pulp Temp"
                  value={inspection.pulpTemp != null ? `${inspection.pulpTemp.toFixed(1)}\u00B0C` : null}
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Crown Color"
                  value={inspection.crownColor}
                  icon={<Palette className="h-3.5 w-3.5" />}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  label="Inspector"
                  value={inspection.inspector?.name}
                  icon={<User className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Container"
                  value={inspection.container?.containerCode}
                  icon={<Box className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Created"
                  value={formatDate(inspection.createdAt)}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
                <DetailRow
                  label="Updated"
                  value={formatDate(inspection.updatedAt)}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
              </CardContent>
            </Card>

            {inspection.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inspection.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="defects" className="mt-6">
          {defectsList.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No defects recorded for this inspection.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Defects Found</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2" role="list">
                  {defectsList.map((defect, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 rounded-md border p-3 text-sm"
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive"
                        aria-hidden="true"
                      />
                      {defect}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
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
