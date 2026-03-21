import { existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { ProcessAllButton } from "./process-button";
import { DocumentExplorer, type ShipmentFolder, type DocItem, type CustomsItem, type ExplorerData } from "./document-explorer";
import { parseWeekParams, getWeekDateRange, formatWeekLabel } from "@/lib/week-utils";
import { DOC_TYPES } from "@/lib/constants";

const docTypeLabels: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TYPES).map(([label, code]) => [code, label])
);

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { week, year } = parseWeekParams(params);
  const { start, end } = getWeekDateRange(week, year);
  const weekLabel = formatWeekLabel(week, year);

  const [documents, shipments, containers, customsDeclarations] = await Promise.all([
    prisma.document.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lt: end } },
      include: {
        shipment: {
          select: {
            id: true,
            blNumber: true,
            status: true,
            vessel: { select: { name: true } },
            producer: { select: { name: true } },
          },
        },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shipment.findMany({
      where: { deletedAt: null },
      select: { id: true, blNumber: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.container.findMany({
      where: { deletedAt: null },
      select: { id: true, containerCode: true },
      orderBy: { containerCode: "asc" },
    }),
    prisma.customsDeclaration.findMany({
      include: { shipment: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build a customs lookup by shipmentId
  const customsByShipment = new Map<string, CustomsItem[]>();
  for (const c of customsDeclarations) {
    const list = customsByShipment.get(c.shipment.id) ?? [];
    list.push({
      id: c.id,
      declarationNumber: c.declarationNumber,
      status: c.status,
      submittedAt: c.submittedAt?.toISOString() ?? null,
      clearedAt: c.clearedAt?.toISOString() ?? null,
      releasedAt: c.releasedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    });
    customsByShipment.set(c.shipment.id, list);
  }

  // Build doc items and group by shipment
  const uploadsDir = join(process.cwd(), "uploads");
  const folderMap = new Map<string, ShipmentFolder>();
  const unlinked: DocItem[] = [];

  for (const d of documents) {
    const docItem: DocItem = {
      id: d.id,
      originalName: d.originalName,
      fileName: d.fileName,
      docType: d.docType,
      docTypeLabel: d.docType ? docTypeLabels[d.docType] ?? d.docType : null,
      docStatus: d.docStatus,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      createdAt: d.createdAt.toISOString(),
      hasFile: existsSync(join(uploadsDir, d.fileName)),
    };

    if (d.shipment) {
      const sid = d.shipment.id;
      if (!folderMap.has(sid)) {
        folderMap.set(sid, {
          shipmentId: sid,
          blNumber: d.shipment.blNumber,
          vesselName: d.shipment.vessel?.name ?? null,
          producerName: d.shipment.producer?.name ?? null,
          status: d.shipment.status,
          documents: [],
          customs: customsByShipment.get(sid) ?? [],
        });
      }
      folderMap.get(sid)!.documents.push(docItem);
    } else {
      unlinked.push(docItem);
    }
  }

  const explorerData: ExplorerData = {
    folders: Array.from(folderMap.values()),
    unlinked,
  };

  const total = documents.length;
  const classified = documents.filter((d) => d.docStatus === "CLASSIFIED" || d.docStatus === "MATCHED").length;
  const pending = documents.filter((d) => d.docStatus === "UPLOADED" || d.docStatus === "PROCESSING").length;
  const failed = documents.filter((d) => d.docStatus === "FAILED").length;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-manrope)]">
            Document Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {weekLabel} &middot; Upload &amp; browse shipment documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProcessAllButton count={pending} />
          <UploadDocumentDialog shipments={shipments} containers={containers} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Documents"
          value={total}
          subtitle="This week"
          icon={<FileText className="h-5 w-5" />}
        />
        <KpiCard
          title="Classified"
          value={classified}
          subtitle="Classified or matched"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending Review"
          value={pending}
          subtitle="Uploaded or processing"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Failed"
          value={failed}
          subtitle="Requires attention"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <DocumentExplorer data={explorerData} />
    </div>
  );
}
