"use client";

import { type ColumnDef } from "@tanstack/react-table";

export type ScanEventRow = {
  id: string;
  week: string | null;
  scannedCode: string;
  scanType: string;
  containerCode: string | null;
  warehouseName: string | null;
  createdAt: string;
};

export const scanEventColumns: ColumnDef<ScanEventRow>[] = [
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
    accessorKey: "scannedCode",
    header: "Scanned Code",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.scannedCode}</span>
    ),
  },
  {
    accessorKey: "scanType",
    header: "Type",
    cell: ({ row }) => {
      const typeLabels: Record<string, string> = {
        BARCODE: "Barcode",
        QR: "QR Code",
        RFID: "RFID",
      };
      return typeLabels[row.original.scanType] ?? row.original.scanType;
    },
  },
  {
    accessorKey: "containerCode",
    header: "Container Match",
    cell: ({ row }) => {
      if (!row.original.containerCode) {
        return <span className="text-muted-foreground">No match</span>;
      }
      return (
        <span className="font-mono text-sm text-green-700">
          {row.original.containerCode}
        </span>
      );
    },
  },
  {
    accessorKey: "warehouseName",
    header: "Warehouse",
    cell: ({ row }) => row.original.warehouseName ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Timestamp",
    cell: ({ row }) => {
      return new Date(row.original.createdAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
];
