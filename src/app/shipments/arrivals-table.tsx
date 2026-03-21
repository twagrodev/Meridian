"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";
import type { ShipmentRow } from "@/lib/queries/shipment-arrivals";

type SortKey = keyof ShipmentRow;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; header: string; align?: "right" }[] = [
  { key: "week", header: "Week" },
  { key: "lot", header: "Lot" },
  { key: "packingDate", header: "Packing date" },
  { key: "eta", header: "ETA" },
  { key: "etd", header: "ETD" },
  { key: "terminal", header: "Terminal" },
  { key: "vessel", header: "Vessel" },
  { key: "bl", header: "BL" },
  { key: "sealNumbers", header: "Seal number(s)" },
  { key: "t1", header: "T1" },
  { key: "weighing", header: "Weighing" },
  { key: "customsReg", header: "Customs_reg" },
  { key: "carrier", header: "Carrier" },
  { key: "container", header: "Container" },
  { key: "dateIn", header: "Date_in" },
  { key: "dateOut", header: "Date_out" },
  { key: "terminalStatus", header: "Terminal_status" },
  { key: "scan", header: "Scan" },
  { key: "transporter", header: "Transporter" },
  { key: "qcInstructions", header: "QC instructions" },
  { key: "warehouse", header: "Warehouse" },
  { key: "shipper", header: "Shipper" },
  { key: "customer", header: "Customer" },
  { key: "coo", header: "CoO" },
  { key: "brand", header: "Brand" },
  { key: "packageType", header: "Package" },
  { key: "order", header: "Order" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "coi", header: "COI" },
  { key: "productDesc", header: "Product_desc" },
  { key: "mrnArn", header: "MRN/ARN" },
];

export function ArrivalsTable({ data }: { data: ShipmentRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lot");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    if (!search) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      COLUMNS.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search all columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
            aria-label="Search shipment arrivals"
          />
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          Showing {sorted.length} of {data.length} entries
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-max min-w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  className={[
                    "px-2 py-2 font-medium text-muted-foreground whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors",
                    col.align === "right" ? "text-right" : "text-left",
                    i < 2 ? "sticky left-0 z-10 bg-muted/50" : "",
                    i === 0 ? "left-0" : "",
                    i === 1 ? "left-[3.5rem]" : "",
                  ].join(" ")}
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key && (
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr
                key={row.id}
                className={[
                  "border-b transition-colors hover:bg-accent/50",
                  ri % 2 === 0 ? "bg-card" : "bg-muted/20",
                ].join(" ")}
              >
                {COLUMNS.map((col, ci) => {
                  const val = row[col.key];
                  return (
                    <td
                      key={col.key}
                      className={[
                        "px-2 py-1.5 whitespace-nowrap",
                        col.align === "right" ? "text-right tabular-nums" : "",
                        ci < 2 ? "sticky z-10 font-medium" : "",
                        ci === 0 ? "left-0" : "",
                        ci === 1 ? "left-[3.5rem]" : "",
                        ci < 2 && ri % 2 === 0 ? "bg-card" : "",
                        ci < 2 && ri % 2 !== 0 ? "bg-muted/20" : "",
                      ].join(" ")}
                    >
                      {val != null ? String(val) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-muted-foreground">
                  No shipment arrivals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
