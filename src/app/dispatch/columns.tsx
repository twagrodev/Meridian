"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type DispatchRow = {
  id: string;
  week: string | null;
  shipmentId: string;
  blNumber: string | null;
  scheduledDate: string | null;
  destination: string | null;
  status: string;
  legsCount: number;
  createdAt: string;
};

export const dispatchColumns: ColumnDef<DispatchRow>[] = [
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
    accessorKey: "blNumber",
    header: "Shipment BL#",
    cell: ({ row }) => (
      <Link
        href={`/shipments/${row.original.shipmentId}`}
        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.blNumber ?? "—"}
      </Link>
    ),
  },
  {
    accessorKey: "scheduledDate",
    header: "Scheduled Date",
    cell: ({ row }) => {
      if (!row.original.scheduledDate) return "—";
      return new Date(row.original.scheduledDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
  {
    accessorKey: "destination",
    header: "Destination",
    cell: ({ row }) => (
      <Link
        href={`/dispatch/${row.original.id}`}
        className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.destination ?? "—"}
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
    accessorKey: "legsCount",
    header: "Legs",
    cell: ({ row }) => row.original.legsCount,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      return new Date(row.original.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
];
