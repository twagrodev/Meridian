"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type InspectionRow = {
  id: string;
  week: string | null;
  containerCode: string | null;
  grade: string | null;
  score: number | null;
  moisture: number | null;
  pulpTemp: number | null;
  crownColor: string | null;
  inspectorName: string | null;
  createdAt: string;
};

export const inspectionColumns: ColumnDef<InspectionRow>[] = [
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
    accessorKey: "containerCode",
    header: "Container",
    cell: ({ row }) => (
      <Link
        href={`/quality/${row.original.id}`}
        className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.original.containerCode ?? "\u2014"}
      </Link>
    ),
  },
  {
    accessorKey: "grade",
    header: "Grade",
    cell: ({ row }) =>
      row.original.grade ? (
        <StatusBadge status={row.original.grade} />
      ) : (
        "\u2014"
      ),
    filterFn: (row, _id, filterValue) => {
      if (!filterValue) return true;
      return row.original.grade === filterValue;
    },
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) =>
      row.original.score != null ? row.original.score.toFixed(1) : "\u2014",
  },
  {
    accessorKey: "moisture",
    header: "Moisture %",
    cell: ({ row }) =>
      row.original.moisture != null
        ? `${row.original.moisture.toFixed(1)}%`
        : "\u2014",
  },
  {
    accessorKey: "pulpTemp",
    header: "Pulp Temp",
    cell: ({ row }) =>
      row.original.pulpTemp != null
        ? `${row.original.pulpTemp.toFixed(1)}\u00B0C`
        : "\u2014",
  },
  {
    accessorKey: "crownColor",
    header: "Crown Color",
    cell: ({ row }) => row.original.crownColor ?? "\u2014",
  },
  {
    accessorKey: "inspectorName",
    header: "Inspector",
    cell: ({ row }) => row.original.inspectorName ?? "\u2014",
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
