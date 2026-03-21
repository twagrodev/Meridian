"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type VesselRow = {
  id: string;
  week: string | null;
  name: string;
  imo: string | null;
  flag: string | null;
  carrier: string | null;
  capacity: number | null;
  currentEta: string | null;
  containerCount: number;
};

export const vesselColumns: ColumnDef<VesselRow>[] = [
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/vessels/${row.original.id}`}
        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "imo",
    header: "IMO",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.imo ?? "—"}</span>
    ),
  },
  {
    accessorKey: "flag",
    header: "Flag",
    cell: ({ row }) => row.original.flag ?? "—",
  },
  {
    accessorKey: "carrier",
    header: "Carrier",
    cell: ({ row }) => row.original.carrier ?? "—",
  },
  {
    accessorKey: "capacity",
    header: "Capacity",
    cell: ({ row }) =>
      row.original.capacity != null
        ? row.original.capacity.toLocaleString()
        : "—",
  },
  {
    accessorKey: "currentEta",
    header: "ETA",
    cell: ({ row }) => {
      if (!row.original.currentEta) return "—";
      return new Date(row.original.currentEta).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
  {
    accessorKey: "containerCount",
    header: "Containers",
    cell: ({ row }) => row.original.containerCount,
  },
];
