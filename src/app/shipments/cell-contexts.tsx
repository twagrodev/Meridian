"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ClipboardList, ExternalLink, Ship, FolderOpen, Copy } from "lucide-react";
import { toast } from "sonner";
import type { ShipmentRow } from "@/lib/queries/shipment-arrivals";

export interface CellAction {
  label: string;
  icon: ReactNode;
  onClick: (row: ShipmentRow, router: ReturnType<typeof useRouter>) => void;
}

export interface CellContext {
  columnKey: string;
  label: string;
  statusPanel?: (row: ShipmentRow) => ReactNode;
  actions: CellAction[];
}

// ── T1 Context ──────────────────────────────────────────────

function T1StatusBadge({ row }: { row: ShipmentRow }) {
  const val = row.t1;
  let label: string;
  let cls: string;

  switch (val) {
    case "NVT":
      label = "Not applicable";
      cls = "bg-gray-100 text-gray-600 border-gray-200";
      break;
    case "T1":
      label = "T1 Required";
      cls = "bg-yellow-50 text-yellow-700 border-yellow-300";
      break;
    case "Issued":
      label = "Issued";
      cls = "bg-blue-50 text-blue-700 border-blue-300";
      break;
    case "Submitted":
      label = "Submitted";
      cls = "bg-orange-50 text-orange-700 border-orange-300";
      break;
    case "Cleared":
      label = "Cleared";
      cls = "bg-green-50 text-green-700 border-green-300";
      break;
    default:
      label = val ?? "Unknown";
      cls = "bg-gray-100 text-gray-600 border-gray-200";
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

const T1_CONTEXT: CellContext = {
  columnKey: "t1",
  label: "T1 Actions",
  statusPanel: (row) => <T1StatusBadge row={row} />,
  actions: [
    {
      label: "DVA Aankomst",
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
      onClick: (row) => toast.info(`DVA Aankomst for Lot ${row.lot}, Container ${row.container ?? "N/A"}`),
    },
    {
      label: "DVA Vertrek",
      icon: <ClipboardList className="h-3.5 w-3.5" />,
      onClick: (row) => toast.info(`DVA Vertrek for Lot ${row.lot}, Container ${row.container ?? "N/A"}`),
    },
  ],
};

// ── BL Context ──────────────────────────────────────────────

function BLStatusPanel({ row }: { row: ShipmentRow }) {
  async function copyBl() {
    const bl = row.bl;
    if (!bl) return;
    try {
      await navigator.clipboard.writeText(bl);
      toast.success(`Copied BL ${bl}`);
    } catch {
      toast.error("Press Ctrl+C to copy");
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs font-medium">{row.bl ?? "—"}</span>
      {row.bl && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); copyBl(); }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Copy BL number"
        >
          <Copy className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

const BL_CONTEXT: CellContext = {
  columnKey: "bl",
  label: "BL Actions",
  statusPanel: (row) => <BLStatusPanel row={row} />,
  actions: [
    {
      label: "Carrier website",
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onClick: (row) => toast.info(`Opening carrier website for ${row.carrier ?? "Unknown"} — BL ${row.bl ?? "N/A"}`),
    },
    {
      label: "Portbase",
      icon: <Ship className="h-3.5 w-3.5" />,
      onClick: (row) => toast.info(`Opening Portbase for BL ${row.bl ?? "N/A"}`),
    },
    {
      label: "Documents",
      icon: <FolderOpen className="h-3.5 w-3.5" />,
      onClick: (row, router) => router.push(`/documents?bl=${row.bl ?? ""}`),
    },
  ],
};

// ── Registry ────────────────────────────────────────────────

export const CELL_CONTEXTS: Record<string, CellContext> = {
  t1: T1_CONTEXT,
  bl: BL_CONTEXT,
};

export function getCellContext(columnKey: string): CellContext | undefined {
  return CELL_CONTEXTS[columnKey];
}

export function hasCellContext(columnKey: string): boolean {
  return columnKey in CELL_CONTEXTS;
}
