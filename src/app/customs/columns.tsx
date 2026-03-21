"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type DeclarationRow = {
  id: string;
  week: string | null;
  declarationNumber: string | null;
  shipmentId: string;
  shipmentBlNumber: string | null;
  status: string;
  submittedAt: string | null;
  clearedAt: string | null;
  releasedAt: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const declarationColumns: ColumnDef<DeclarationRow>[] = [
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
    accessorKey: "declarationNumber",
    header: "Declaration #",
    cell: ({ row }) => (
      <Link
        href={`/customs/${row.original.id}`}
        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.declarationNumber ?? "\u2014"}
      </Link>
    ),
  },
  {
    accessorKey: "shipmentBlNumber",
    header: "Shipment BL#",
    cell: ({ row }) => (
      <Link
        href={`/shipments/${row.original.shipmentId}`}
        className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.shipmentBlNumber ?? "\u2014"}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, _id, filterValue) => {
      if (!filterValue) return true;
      return row.original.status === filterValue;
    },
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => formatDate(row.original.submittedAt),
  },
  {
    accessorKey: "clearedAt",
    header: "Cleared",
    cell: ({ row }) => formatDate(row.original.clearedAt),
  },
  {
    accessorKey: "releasedAt",
    header: "Released",
    cell: ({ row }) => formatDate(row.original.releasedAt),
  },
];
