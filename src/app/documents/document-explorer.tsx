"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  FolderClosed,
  FileText,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  FileWarning,
  Ship,
  Search,
  ExternalLink,
  Download,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

export type DocItem = {
  id: string;
  originalName: string;
  fileName: string;
  docType: string | null;
  docTypeLabel: string | null;
  docStatus: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  hasFile: boolean;
};

export type CustomsItem = {
  id: string;
  declarationNumber: string | null;
  status: string;
  submittedAt: string | null;
  clearedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export type ShipmentFolder = {
  shipmentId: string;
  blNumber: string | null;
  vesselName: string | null;
  producerName: string | null;
  status: string;
  documents: DocItem[];
  customs: CustomsItem[];
};

export type ExplorerData = {
  folders: ShipmentFolder[];
  unlinked: DocItem[];
};

// --- Required doc types for a banana import shipment ---

const REQUIRED_DOC_GROUPS = [
  { label: "Bill of Lading", codes: ["BL"] },
  { label: "Arrival Notice", codes: ["AN"] },
  { label: "Invoice", codes: ["INV", "FT-INV", "INV-OD"] },
  { label: "Packing List", codes: ["PL"] },
  { label: "EUR1", codes: ["EUR1"] },
  { label: "Weighing Certificate", codes: ["WC"] },
  { label: "Certificate of Inspection", codes: ["COI"] },
];

// --- Helpers ---

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", {
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

function isPdf(mimeType: string | null): boolean {
  return mimeType === "application/pdf";
}

// --- Selection types ---

type Selection =
  | { type: "none" }
  | { type: "shipment"; folder: ShipmentFolder }
  | { type: "document"; doc: DocItem; folder: ShipmentFolder | null };

// --- Component ---

export function DocumentExplorer({ data }: { data: ExplorerData }) {
  const [selection, setSelection] = useState<Selection>({ type: "none" });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(data.folders.slice(0, 3).map((f) => f.shipmentId))
  );
  const [searchTerm, setSearchTerm] = useState("");

  function toggleFolder(shipmentId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(shipmentId)) next.delete(shipmentId);
      else next.add(shipmentId);
      return next;
    });
  }

  function selectShipment(folder: ShipmentFolder) {
    setSelection({ type: "shipment", folder });
    if (!expandedFolders.has(folder.shipmentId)) {
      toggleFolder(folder.shipmentId);
    }
  }

  function selectDocument(doc: DocItem, folder: ShipmentFolder | null) {
    setSelection({ type: "document", doc, folder });
  }

  const filteredFolders = data.folders.filter((f) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      f.blNumber?.toLowerCase().includes(term) ||
      f.vesselName?.toLowerCase().includes(term) ||
      f.producerName?.toLowerCase().includes(term) ||
      f.documents.some((d) => d.originalName.toLowerCase().includes(term))
    );
  });

  const filteredUnlinked = data.unlinked.filter((d) => {
    if (!searchTerm) return true;
    return d.originalName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex gap-4 h-[calc(100vh-15rem)]">
      {/* Left panel — folder tree */}
      <div className="w-80 shrink-0 flex flex-col rounded-lg border bg-card">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-sm"
              aria-label="Search documents"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5" aria-label="Document folders">
            {filteredFolders.map((folder) => {
              const isExpanded = expandedFolders.has(folder.shipmentId);
              const isSelected =
                selection.type === "shipment" &&
                selection.folder.shipmentId === folder.shipmentId;
              const docTypes = folder.documents.map((d) => d.docType);
              const missingCount = REQUIRED_DOC_GROUPS.filter(
                (g) => !g.codes.some((c) => docTypes.includes(c))
              ).length;

              return (
                <div key={folder.shipmentId}>
                  <button
                    type="button"
                    onClick={() => selectShipment(folder)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                      "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isSelected && "bg-accent font-semibold"
                    )}
                    aria-expanded={isExpanded}
                  >
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(folder.shipmentId);
                      }}
                      className="shrink-0 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFolder(folder.shipmentId);
                        }
                      }}
                      aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </span>
                    {isExpanded ? (
                      <FolderOpen className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
                    ) : (
                      <FolderClosed className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate font-mono text-xs">
                      {folder.blNumber ?? "No BL"}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{folder.documents.length}</span>
                      {missingCount > 0 && (
                        <span className="text-orange-600" title={`${missingCount} missing`}>
                          !{missingCount}
                        </span>
                      )}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-5 border-l pl-2 space-y-0.5">
                      {folder.documents.map((doc) => {
                        const isDocSelected =
                          selection.type === "document" &&
                          selection.doc.id === doc.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => selectDocument(doc, folder)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-left transition-colors",
                              "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                              isDocSelected && "bg-accent font-semibold"
                            )}
                          >
                            <FileText
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                isPdf(doc.mimeType) ? "text-red-500" : "text-blue-500"
                              )}
                              aria-hidden="true"
                            />
                            <span className="truncate">{doc.originalName}</span>
                            <span className="ml-auto text-muted-foreground shrink-0">
                              {doc.docTypeLabel ?? doc.docType ?? ""}
                            </span>
                          </button>
                        );
                      })}
                      {folder.customs.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-dashed">
                          {folder.customs.map((c) => (
                            <Link
                              key={c.id}
                              href={`/customs/${c.id}`}
                              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              <Ship className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                              <span className="truncate font-mono">
                                {c.declarationNumber ?? "No MRN"}
                              </span>
                              <StatusBadge status={c.status} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unlinked documents */}
            {filteredUnlinked.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <UnlinkedSection
                  documents={filteredUnlinked}
                  selection={selection}
                  onSelect={(doc) => selectDocument(doc, null)}
                />
              </div>
            )}

            {filteredFolders.length === 0 && filteredUnlinked.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No documents found
              </p>
            )}
          </nav>
        </ScrollArea>
      </div>

      {/* Right panel — detail/preview */}
      <div className="flex-1 min-w-0">
        {selection.type === "none" && (
          <OverviewPanel folders={data.folders} unlinked={data.unlinked} />
        )}
        {selection.type === "shipment" && (
          <ShipmentPanel folder={selection.folder} onSelectDoc={(doc) => selectDocument(doc, selection.folder)} />
        )}
        {selection.type === "document" && (
          <DocumentPanel doc={selection.doc} folder={selection.folder} />
        )}
      </div>
    </div>
  );
}

// --- Unlinked Section ---

function UnlinkedSection({
  documents,
  selection,
  onSelect,
}: {
  documents: DocItem[];
  selection: Selection;
  onSelect: (doc: DocItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <FolderClosed className="h-4 w-4 text-gray-500" aria-hidden="true" />
        <span className="text-muted-foreground">Unlinked</span>
        <span className="ml-auto text-xs text-muted-foreground">{documents.length}</span>
      </button>
      {expanded && (
        <div className="ml-5 border-l pl-2 space-y-0.5">
          {documents.map((doc) => {
            const isSelected =
              selection.type === "document" && selection.doc.id === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelect(doc)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-left transition-colors",
                  "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isSelected && "bg-accent font-semibold"
                )}
              >
                <FileText
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isPdf(doc.mimeType) ? "text-red-500" : "text-blue-500"
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{doc.originalName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Overview Panel ---

function OverviewPanel({
  folders,
  unlinked,
}: {
  folders: ShipmentFolder[];
  unlinked: DocItem[];
}) {
  const totalDocs = folders.reduce((a, f) => a + f.documents.length, 0) + unlinked.length;
  const totalMissing = folders.reduce((a, f) => {
    const docTypes = f.documents.map((d) => d.docType);
    return a + REQUIRED_DOC_GROUPS.filter((g) => !g.codes.some((c) => docTypes.includes(c))).length;
  }, 0);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-3">
        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" aria-hidden="true" />
        <div>
          <p className="text-lg font-medium">Document Explorer</p>
          <p className="text-sm text-muted-foreground">
            {folders.length} shipments &middot; {totalDocs} documents &middot;{" "}
            <span className={totalMissing > 0 ? "text-orange-600" : "text-emerald-600"}>
              {totalMissing} missing
            </span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Select a shipment to view its document checklist and customs history,
          or click a document to preview it.
        </p>
      </div>
    </div>
  );
}

// --- Shipment Panel (missing docs + customs history) ---

function ShipmentPanel({
  folder,
  onSelectDoc,
}: {
  folder: ShipmentFolder;
  onSelectDoc: (doc: DocItem) => void;
}) {
  const docTypes = folder.documents.map((d) => d.docType);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-2">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-mono">
              {folder.blNumber ?? "No BL"}
            </h2>
            <StatusBadge status={folder.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[folder.vesselName, folder.producerName].filter(Boolean).join(" \u00B7 ")}
          </p>
        </div>

        {/* Document Checklist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {REQUIRED_DOC_GROUPS.map((group) => {
              const matchingDocs = folder.documents.filter((d) =>
                group.codes.includes(d.docType ?? "")
              );
              const isPresent = matchingDocs.length > 0;

              return (
                <div key={group.label}>
                  <div className="flex items-center gap-2 py-1">
                    {isPresent ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-orange-500 shrink-0" aria-hidden="true" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        isPresent ? "text-foreground" : "text-orange-600 font-medium"
                      )}
                    >
                      {group.label}
                    </span>
                    {!isPresent && (
                      <span className="text-xs text-orange-500 ml-auto">Missing</span>
                    )}
                  </div>
                  {matchingDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onSelectDoc(doc)}
                      className="ml-6 flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <FileText
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isPdf(doc.mimeType) ? "text-red-500" : "text-blue-500"
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.originalName}</span>
                      <StatusBadge status={doc.docStatus} />
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Other docs that don't fit required groups */}
            {folder.documents
              .filter(
                (d) =>
                  !REQUIRED_DOC_GROUPS.some((g) =>
                    g.codes.includes(d.docType ?? "")
                  )
              )
              .map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelectDoc(doc)}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <FileWarning className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
                  <span className="text-sm">{doc.docTypeLabel ?? "Other"}</span>
                  <span className="text-muted-foreground truncate ml-2">
                    {doc.originalName}
                  </span>
                  <StatusBadge status={doc.docStatus} />
                </button>
              ))}
          </CardContent>
        </Card>

        {/* Customs History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="h-4 w-4" aria-hidden="true" />
              Customs History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {folder.customs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No customs declarations for this shipment.
              </p>
            ) : (
              <div className="space-y-3">
                {folder.customs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customs/${c.id}`}
                          className="font-mono text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {c.declarationNumber ?? "No MRN"}
                        </Link>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Created: {formatDate(c.createdAt)}</span>
                        {c.submittedAt && <span>Submitted: {formatDate(c.submittedAt)}</span>}
                        {c.clearedAt && (
                          <span className="text-emerald-600">
                            Cleared: {formatDate(c.clearedAt)}
                          </span>
                        )}
                        {c.releasedAt && (
                          <span className="text-green-600">
                            Released: {formatDate(c.releasedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/customs/${c.id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`View declaration ${c.declarationNumber}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// --- Document Panel (detail + PDF preview) ---

function DocumentPanel({
  doc,
  folder,
}: {
  doc: DocItem;
  folder: ShipmentFolder | null;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{doc.originalName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={doc.docStatus} />
              <span className="text-sm text-muted-foreground">
                {doc.docTypeLabel ?? doc.docType ?? "Unclassified"}
              </span>
              {folder && (
                <>
                  <span className="text-muted-foreground">&middot;</span>
                  <Link
                    href={`/shipments/${folder.shipmentId}`}
                    className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {folder.blNumber ?? "No BL"}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {doc.hasFile && (
              <>
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Open
                </a>
                <a
                  href={`/api/documents/${doc.id}/file`}
                  download={doc.originalName}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download
                </a>
              </>
            )}
            <Link
              href={`/documents/${doc.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Details
            </Link>
          </div>
        </div>

        {/* Metadata */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File name</span>
                <span className="font-medium font-mono text-xs">{doc.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium">{formatFileSize(doc.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{doc.mimeType ?? "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="font-medium">{formatDate(doc.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        {doc.hasFile && isPdf(doc.mimeType) ? (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <object
                data={`/api/documents/${doc.id}/file`}
                type="application/pdf"
                className="w-full h-[600px]"
                aria-label={`PDF preview of ${doc.originalName}`}
              >
                <div className="flex items-center justify-center h-[600px] bg-muted/30">
                  <div className="text-center space-y-2">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      PDF preview not available in your browser.
                    </p>
                    <a
                      href={`/api/documents/${doc.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Open in new tab
                    </a>
                  </div>
                </div>
              </object>
            </CardContent>
          </Card>
        ) : doc.hasFile ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type ({doc.mimeType}).
                </p>
                <a
                  href={`/api/documents/${doc.id}/file`}
                  download={doc.originalName}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Download to view
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <FileWarning className="h-8 w-8 text-muted-foreground/50 mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  No file uploaded &mdash; metadata record only.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
