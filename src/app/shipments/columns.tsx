"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type ShipmentRow = {
  id: string;
  blNumber: string | null;
  lotNumber: string | null;
  producerName: string | null;
  vesselName: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  eta: string | null;
};

export const shipmentColumns: ColumnDef<ShipmentRow>[] = [
  {
    accessorKey: "blNumber",
    header: "BL #",
    cell: ({ row }) => (
      <Link
        href={`/shipments/${row.original.id}`}
        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.blNumber ?? "—"}
      </Link>
    ),
  },
  {
    accessorKey: "lotNumber",
    header: "Lot",
    cell: ({ row }) => row.original.lotNumber ?? "—",
  },
  {
    accessorKey: "producerName",
    header: "Producer",
    cell: ({ row }) => row.original.producerName ?? "—",
  },
  {
    accessorKey: "vesselName",
    header: "Vessel",
    cell: ({ row }) => row.original.vesselName ?? "—",
  },
  {
    accessorKey: "origin",
    header: "Origin",
    cell: ({ row }) => row.original.origin ?? "—",
  },
  {
    accessorKey: "destination",
    header: "Destination",
    cell: ({ row }) => row.original.destination ?? "—",
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
    accessorKey: "eta",
    header: "ETA",
    cell: ({ row }) => {
      if (!row.original.eta) return "—";
      return new Date(row.original.eta).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
];
