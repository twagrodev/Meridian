"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DOC_TYPES } from "@/lib/constants";

export type DocumentRow = {
  id: string;
  week: string | null;
  originalName: string;
  docType: string | null;
  docStatus: string;
  shipmentId: string | null;
  blNumber: string | null;
  uploadedByName: string | null;
  createdAt: string;
};

const docTypeLabels: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TYPES).map(([label, code]) => [code, label])
);

export const documentColumns: ColumnDef<DocumentRow>[] = [
  {
    accessorKey: "week",
    header: "Week",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-muted-foreground">
        {row.original.week ?? "\u2014"}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "originalName",
    header: "Document",
    cell: ({ row }) => (
      <Link
        href={`/documents/${row.original.id}`}
        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.originalName}
      </Link>
    ),
  },
  {
    accessorKey: "docType",
    header: "Type",
    cell: ({ row }) => {
      const code = row.original.docType;
      if (!code) return <span className="text-muted-foreground">Unclassified</span>;
      return docTypeLabels[code] ?? code;
    },
  },
  {
    accessorKey: "docStatus",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.docStatus} />,
    filterFn: (row, _id, filterValue) => {
      if (!filterValue) return true;
      return row.original.docStatus === filterValue;
    },
  },
  {
    accessorKey: "blNumber",
    header: "Shipment",
    cell: ({ row }) => {
      if (!row.original.shipmentId || !row.original.blNumber) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <Link
          href={`/shipments/${row.original.shipmentId}`}
          className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {row.original.blNumber}
        </Link>
      );
    },
  },
  {
    accessorKey: "uploadedByName",
    header: "Uploaded By",
    cell: ({ row }) => row.original.uploadedByName ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      return new Date(row.original.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
];
