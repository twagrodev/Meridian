import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Ship, Box } from "lucide-react";
import { DOC_TYPES } from "@/lib/constants";
import { ProcessDocumentButton } from "../process-button";

interface DocumentDetailProps {
  params: Promise<{ documentId: string }>;
}

const docTypeLabels: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TYPES).map(([label, code]) => [code, label])
);

function formatDate(date: Date | null): string {
  if (!date) return "\u2014";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentDetailPage({ params }: DocumentDetailProps) {
  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      shipment: {
        include: {
          producer: { select: { name: true } },
        },
      },
      container: true,
      uploadedBy: { select: { name: true, email: true } },
    },
  });

  if (!document || document.deletedAt) {
    notFound();
  }

  const docTypeLabel = document.docType
    ? docTypeLabels[document.docType] ?? document.docType
    : "Unclassified";

  let extractedFields: Record<string, unknown> | null = null;
  if (document.extractedFields) {
    try {
      extractedFields = JSON.parse(document.extractedFields);
    } catch {
      extractedFields = null;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/documents"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Documents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
                {document.originalName}
              </h1>
              <StatusBadge status={document.docStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {docTypeLabel}
            </p>
          </div>
          {(document.docStatus === "UPLOADED" || document.docStatus === "FAILED") && (
            <ProcessDocumentButton documentId={document.id} />
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="linked">Linked Entities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="File Name" value={document.fileName} />
                <DetailRow label="Document Type" value={docTypeLabel} />
                <DetailRow label="MIME Type" value={document.mimeType} />
                <DetailRow label="File Size" value={formatFileSize(document.fileSize)} />
                <DetailRow
                  label="Confidence"
                  value={
                    document.confidence != null
                      ? `${(document.confidence * 100).toFixed(1)}%`
                      : null
                  }
                />
                <DetailRow label="Uploaded By" value={document.uploadedBy?.name} />
                <DetailRow label="Created" value={formatDate(document.createdAt)} />
              </CardContent>
            </Card>

            {extractedFields && Object.keys(extractedFields).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(extractedFields).map(([key, value]) => (
                    <DetailRow
                      key={key}
                      label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      value={value != null ? String(value) : null}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {!extractedFields && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Fields</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    No extracted data available for this document.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="linked" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {document.shipment ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Ship className="h-4 w-4" aria-hidden="true" />
                    Linked Shipment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="BL Number">
                    <Link
                      href={`/shipments/${document.shipment.id}`}
                      className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {document.shipment.blNumber ?? "No BL"}
                    </Link>
                  </DetailRow>
                  <DetailRow label="Status">
                    <StatusBadge status={document.shipment.status} />
                  </DetailRow>
                  <DetailRow label="Origin" value={document.shipment.origin} />
                  <DetailRow label="Destination" value={document.shipment.destination} />
                  {document.shipment.producer && (
                    <DetailRow label="Producer" value={document.shipment.producer.name} />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Ship className="h-4 w-4" aria-hidden="true" />
                    Linked Shipment
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    No shipment linked to this document.
                  </p>
                </CardContent>
              </Card>
            )}

            {document.container ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Box className="h-4 w-4" aria-hidden="true" />
                    Linked Container
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    label="Container Code"
                    value={document.container.containerCode}
                  />
                  <DetailRow label="Type" value={document.container.type} />
                  {document.container.sealNumber && (
                    <DetailRow label="Seal Number" value={document.container.sealNumber} />
                  )}
                  {document.container.grossWeight != null && (
                    <DetailRow
                      label="Gross Weight"
                      value={`${document.container.grossWeight.toLocaleString()} kg`}
                    />
                  )}
                  {document.container.boxes != null && (
                    <DetailRow
                      label="Boxes"
                      value={document.container.boxes.toLocaleString()}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Box className="h-4 w-4" aria-hidden="true" />
                    Linked Container
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    No container linked to this document.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null | undefined;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children ?? <span className="font-medium">{value ?? "\u2014"}</span>}
    </div>
  );
}
