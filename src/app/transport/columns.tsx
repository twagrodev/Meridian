"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TRANSPORT_MODE_LABELS } from "@/lib/constants";

export type TransportLegRow = {
  id: string;
  week: string | null;
  trackingRef: string | null;
  mode: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  status: string;
};

export const transportColumns: ColumnDef<TransportLegRow>[] = [
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
    accessorKey: "trackingRef",
    header: "Tracking Ref",
    cell: ({ row }) => (
      <span className="font-medium font-mono">
        {row.original.trackingRef ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "mode",
    header: "Mode",
    cell: ({ row }) => TRANSPORT_MODE_LABELS[row.original.mode] ?? row.original.mode,
  },
  {
    accessorKey: "carrier",
    header: "Carrier",
    cell: ({ row }) => row.original.carrier ?? "—",
  },
  {
    id: "route",
    header: "Route",
    cell: ({ row }) => {
      const origin = row.original.origin ?? "—";
      const dest = row.original.destination ?? "—";
      return (
        <span>
          {origin} <span className="text-muted-foreground" aria-label="to">&rarr;</span> {dest}
        </span>
      );
    },
  },
  {
    accessorKey: "departureTime",
    header: "Departure",
    cell: ({ row }) => {
      if (!row.original.departureTime) return "—";
      return new Date(row.original.departureTime).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
  {
    accessorKey: "arrivalTime",
    header: "Arrival",
    cell: ({ row }) => {
      if (!row.original.arrivalTime) return "—";
      return new Date(row.original.arrivalTime).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
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
];
