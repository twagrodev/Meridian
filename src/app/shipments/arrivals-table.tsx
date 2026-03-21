"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, ArrowUp, ArrowDown, Filter, X, Check,
  FolderOpen, FileCheck, ExternalLink, Truck, Route, Pencil,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { EditShipmentSheet } from "./edit-sheet";
import { ColumnManagerButton } from "./column-manager";
import type { ShipmentRow } from "@/lib/queries/shipment-arrivals";
import type { ColumnPreference } from "@/lib/actions/column-prefs";

type SortKey = keyof ShipmentRow;
type SortDir = "asc" | "desc";

interface ColDef { key: SortKey; header: string; align?: "right"; defaultWidth: number }

// All 31 columns in default order
export const ALL_COLUMNS: ColDef[] = [
  { key: "week", header: "Week", defaultWidth: 50 },
  { key: "lot", header: "Lot", defaultWidth: 60 },
  { key: "packingDate", header: "Packing date", defaultWidth: 85 },
  { key: "eta", header: "ETA", defaultWidth: 90 },
  { key: "etd", header: "ETD", defaultWidth: 90 },
  { key: "terminal", header: "Terminal", defaultWidth: 65 },
  { key: "vessel", header: "Vessel", defaultWidth: 200 },
  { key: "bl", header: "BL", defaultWidth: 130 },
  { key: "sealNumbers", header: "Seal number(s)", defaultWidth: 150 },
  { key: "t1", header: "T1", defaultWidth: 40 },
  { key: "weighing", header: "Weighing", defaultWidth: 65 },
  { key: "customsReg", header: "Customs_reg", defaultWidth: 80 },
  { key: "carrier", header: "Carrier", defaultWidth: 80 },
  { key: "container", header: "Container", defaultWidth: 110 },
  { key: "dateIn", header: "Date_in", defaultWidth: 60 },
  { key: "dateOut", header: "Date_out", defaultWidth: 65 },
  { key: "terminalStatus", header: "Terminal_status", defaultWidth: 120 },
  { key: "scan", header: "Scan", defaultWidth: 42 },
  { key: "transporter", header: "Transporter", defaultWidth: 85 },
  { key: "qcInstructions", header: "QC instructions", defaultWidth: 120 },
  { key: "warehouse", header: "Warehouse", defaultWidth: 80 },
  { key: "shipper", header: "Shipper", defaultWidth: 80 },
  { key: "customer", header: "Customer", defaultWidth: 80 },
  { key: "coo", header: "CoO", defaultWidth: 42 },
  { key: "brand", header: "Brand", defaultWidth: 110 },
  { key: "packageType", header: "Package", defaultWidth: 80 },
  { key: "order", header: "Order", defaultWidth: 60 },
  { key: "amount", header: "Amount", align: "right", defaultWidth: 60 },
  { key: "coi", header: "COI", defaultWidth: 150 },
  { key: "productDesc", header: "Product_desc", defaultWidth: 220 },
  { key: "mrnArn", header: "MRN/ARN", defaultWidth: 170 },
];

// Map header label → ColDef for preference resolution
const COL_BY_HEADER = new Map(ALL_COLUMNS.map((c) => [c.header, c]));

export function buildDefaultPrefs(): ColumnPreference[] {
  return ALL_COLUMNS.map((c) => ({ key: c.header, visible: true }));
}

// ── Lot Grouping ─────────────────────────────────────────────

interface LotGroup {
  lot: number;
  rows: ShipmentRow[];
  mergedRow: ShipmentRow;
  isMultiLine: boolean;
}

function buildLotGroups(rows: ShipmentRow[]): LotGroup[] {
  const map = new Map<number, ShipmentRow[]>();
  const order: number[] = [];
  for (const row of rows) {
    if (!map.has(row.lot)) {
      map.set(row.lot, []);
      order.push(row.lot);
    }
    map.get(row.lot)!.push(row);
  }
  return order.map((lot) => {
    const groupRows = map.get(lot)!;
    const first = groupRows[0];
    const isMultiLine = groupRows.length > 1;
    const mergedRow: ShipmentRow = isMultiLine
      ? {
          ...first,
          brand: "mix",
          amount: groupRows.reduce((sum, r) => sum + (r.amount ?? 0), 0),
          productDesc: `${groupRows.length} lines`,
        }
      : first;
    return { lot, rows: groupRows, mergedRow, isMultiLine };
  });
}

// ── Column Filter Dropdown ───────────────────────────────────

function ColumnFilter({
  columnKey, allValues, selected, onchange,
}: {
  columnKey: string; allValues: string[]; selected: Set<string>;
  onchange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isFiltered = selected.size < allValues.length;
  const filtered = filterText
    ? allValues.filter((v) => v.toLowerCase().includes(filterText.toLowerCase()))
    : allValues;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={[
          "ml-0.5 inline-flex items-center justify-center rounded p-0.5 transition-colors",
          "hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          isFiltered ? "text-white" : "text-white/50 hover:text-white/80",
        ].join(" ")}
        aria-label={`Filter ${columnKey}`}
        aria-expanded={open}
      >
        <Filter className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-56 rounded-md border bg-popover text-popover-foreground shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text" placeholder="Search..." value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full rounded border border-input bg-transparent py-1 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Search filter values"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 border-b text-xs">
            <button type="button" onClick={() => onchange(new Set(allValues))} className="text-primary hover:underline">Select all</button>
            <span className="text-muted-foreground">|</span>
            <button type="button" onClick={() => onchange(new Set())} className="text-primary hover:underline">Clear</button>
            {isFiltered && <><span className="text-muted-foreground">|</span><span className="text-muted-foreground">{selected.size}/{allValues.length}</span></>}
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map((val) => (
              <label key={val} className="flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer hover:bg-accent transition-colors">
                <span className={["flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border", selected.has(val) ? "bg-primary border-primary text-primary-foreground" : "border-input"].join(" ")}>
                  {selected.has(val) && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className="truncate">{val || "(empty)"}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Column Resize Handle ─────────────────────────────────────

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const startX = useRef(0);
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    startX.current = e.clientX;
    function onMouseMove(ev: MouseEvent) { onResize(ev.clientX - startX.current); startX.current = ev.clientX; }
    function onMouseUp() { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }
  return (
    <div onMouseDown={onMouseDown} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-40" role="separator" aria-orientation="vertical" />
  );
}

// ── Main Table ───────────────────────────────────────────────

export function ArrivalsTable({
  data,
  initialColumnPrefs,
}: {
  data: ShipmentRow[];
  initialColumnPrefs: ColumnPreference[] | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lot");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [selectedLot, setSelectedLot] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [columnPrefs, setColumnPrefs] = useState<ColumnPreference[]>(
    () => initialColumnPrefs ?? buildDefaultPrefs()
  );

  // Resolve prefs → visible ColDefs in order, merging with ALL_COLUMNS
  const visibleColumns = useMemo(() => {
    const cols: ColDef[] = [];
    for (const pref of columnPrefs) {
      if (!pref.visible) continue;
      const def = COL_BY_HEADER.get(pref.key);
      if (def) cols.push(def);
    }
    // Append any new columns not in saved prefs
    for (const def of ALL_COLUMNS) {
      if (!columnPrefs.some((p) => p.key === def.header)) {
        cols.push(def);
      }
    }
    return cols;
  }, [columnPrefs]);

  const [colWidths, setColWidths] = useState<number[]>(() => visibleColumns.map((c) => c.defaultWidth));

  // Re-sync widths when visible columns change
  useEffect(() => {
    setColWidths(visibleColumns.map((c) => c.defaultWidth));
  }, [visibleColumns]);

  // If sorting by a column that became hidden, clear sort
  useEffect(() => {
    if (!visibleColumns.some((c) => c.key === sortKey)) {
      setSortKey(visibleColumns[0]?.key ?? "lot");
    }
  }, [visibleColumns, sortKey]);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const syncing = useRef(false);

  const handleTopScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (tableScrollRef.current && topScrollRef.current) tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    syncing.current = false;
  }, []);
  const handleTableScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (topScrollRef.current && tableScrollRef.current) topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    syncing.current = false;
  }, []);

  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  function resizeCol(index: number, delta: number) {
    setColWidths((prev) => { const next = [...prev]; next[index] = Math.max(30, next[index] + delta); return next; });
  }
  const stickyLeft0 = 0;
  const stickyLeft1 = colWidths[0];
  const [hoveredLot, setHoveredLot] = useState<number | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // Column filter unique values (always from full data)
  const uniqueValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of ALL_COLUMNS) {
      const vals = new Set<string>();
      for (const row of data) { const v = row[col.key]; vals.add(v != null ? String(v) : ""); }
      map[col.key] = Array.from(vals).sort((a, b) => a.localeCompare(b));
    }
    return map;
  }, [data]);

  function getFilterSelected(key: string): Set<string> { return columnFilters[key] ?? new Set(uniqueValues[key]); }
  function setFilter(key: string, sel: Set<string>) { setColumnFilters((prev) => ({ ...prev, [key]: sel })); }
  const hasActiveFilters = Object.entries(columnFilters).some(([key, sel]) => sel.size < (uniqueValues[key]?.length ?? 0));
  function clearAllFilters() { setColumnFilters({}); }

  // Filter always against ALL original rows (so search finds non-first rows of multi-line lots)
  const filtered = useMemo(() => {
    let rows = data;
    for (const [key, sel] of Object.entries(columnFilters)) {
      const allVals = uniqueValues[key];
      if (!allVals || sel.size >= allVals.length) continue;
      rows = rows.filter((row) => sel.has(row[key as SortKey] != null ? String(row[key as SortKey]) : ""));
    }
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((row) => ALL_COLUMNS.some((col) => { const v = row[col.key]; return v != null && String(v).toLowerCase().includes(term); }));
    }
    return rows;
  }, [data, search, columnFilters, uniqueValues]);

  // Lot-aware sorting: sort groups by the first row's sort value, keep rows within a group together
  const sortedGroups = useMemo(() => {
    const groups = buildLotGroups(filtered);
    groups.sort((a, b) => {
      const rowA = isCollapsed ? a.mergedRow : a.rows[0];
      const rowB = isCollapsed ? b.mergedRow : b.rows[0];
      const av = rowA[sortKey]; const bv = rowB[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return groups;
  }, [filtered, sortKey, sortDir, isCollapsed]);

  // Always render all rows — animate collapsed ones via CSS transitions
  const displayRows = useMemo(() => {
    const rows: Array<{
      row: ShipmentRow;
      displayRow: ShipmentRow; // may have merged Brand/Amount when collapsed
      lot: number;
      isMultiLine: boolean;
      posInGroup: "only" | "first" | "middle" | "last";
      isCollapsedRow: boolean; // true = this row should be hidden when collapsed
    }> = [];
    for (const group of sortedGroups) {
      for (let i = 0; i < group.rows.length; i++) {
        const pos = group.rows.length === 1 ? "only" as const
          : i === 0 ? "first" as const
          : i === group.rows.length - 1 ? "last" as const
          : "middle" as const;
        // First row of a multi-line group shows merged values when collapsed
        const displayRow = (i === 0 && group.isMultiLine && isCollapsed)
          ? group.mergedRow
          : group.rows[i];
        rows.push({
          row: group.rows[i],
          displayRow,
          lot: group.lot,
          isMultiLine: group.isMultiLine,
          posInGroup: pos,
          isCollapsedRow: isCollapsed && group.isMultiLine && i > 0,
        });
      }
    }
    return rows;
  }, [sortedGroups, isCollapsed]);

  const visibleRowCount = displayRows.filter((r) => !r.isCollapsedRow).length;
  const totalRowCount = data.length;

  // Clear selection if lot is no longer visible
  useEffect(() => {
    if (selectedLot != null && !sortedGroups.some((g) => g.lot === selectedLot)) {
      setSelectedLot(null);
    }
  }, [sortedGroups, selectedLot]);

  const selectedGroup = selectedLot != null ? sortedGroups.find((g) => g.lot === selectedLot) : null;
  const selectedRow = selectedGroup?.rows[0] ?? null;

  function toggleSelectLot(lot: number) {
    setSelectedLot((prev) => (prev === lot ? null : lot));
  }

  // Keyboard: ArrowUp/Down moves between lot groups, Escape deselects
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setSelectedLot(null); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const currentIdx = selectedLot != null ? sortedGroups.findIndex((g) => g.lot === selectedLot) : -1;
      let nextIdx: number;
      if (e.key === "ArrowDown") nextIdx = currentIdx < sortedGroups.length - 1 ? currentIdx + 1 : 0;
      else nextIdx = currentIdx > 0 ? currentIdx - 1 : sortedGroups.length - 1;
      setSelectedLot(sortedGroups[nextIdx].lot);
      // Scroll the first row of the group into view
      let rowIdx = 0;
      for (let i = 0; i < nextIdx; i++) rowIdx += isCollapsed ? 1 : sortedGroups[i].rows.length;
      const el = tbodyRef.current?.children[rowIdx];
      if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }

  // Action handlers
  function handleDocuments() { if (selectedRow) router.push(`/documents?lot=${selectedRow.lot}`); }
  function handleCustoms() { if (selectedRow) router.push(`/customs?lot=${selectedRow.lot}`); }
  function handleTraces() { if (selectedRow) toast.info(`TRACES integration coming soon — Lot ${selectedRow.lot}, Container ${selectedRow.container ?? "N/A"}`); }
  function handleTrucking() { if (selectedRow) toast.info(`Trucking status — Lot ${selectedRow.lot}, Container ${selectedRow.container ?? "N/A"}, Transporter: ${selectedRow.transporter ?? "N/A"}`); }
  function handleDispatch() { if (selectedRow) router.push(`/dispatch?lot=${selectedRow.lot}`); }
  function handleEdit() { if (selectedRow) setEditOpen(true); }

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Compact toggle */}
          <button
            type="button"
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isCollapsed
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                : "border border-input bg-transparent hover:bg-accent text-foreground",
            ].join(" ")}
            onClick={() => setIsCollapsed((v) => !v)}
            title="Merge multi-brand containers into single rows"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {isCollapsed ? "Compact" : "Expanded"}
          </button>

          <ColumnManagerButton prefs={columnPrefs} onChange={setColumnPrefs} />

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
          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}

          {/* Action buttons */}
          <div
            className={["flex flex-wrap items-center gap-1.5 transition-all duration-150",
              selectedRow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none h-0 overflow-hidden",
            ].join(" ")}
            aria-hidden={!selectedRow}
          >
            <span className="h-5 w-px bg-border mx-1" aria-hidden="true" />
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleDocuments}><FolderOpen className="h-3.5 w-3.5" /> Documents</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCustoms}><FileCheck className="h-3.5 w-3.5" /> Customs</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleTraces}><ExternalLink className="h-3.5 w-3.5" /> TRACES</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleTrucking}><Truck className="h-3.5 w-3.5" /> Trucking</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleDispatch}><Route className="h-3.5 w-3.5" /> Dispatch</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          {selectedRow && <span className="font-medium text-primary mr-2">Lot {selectedRow.lot}</span>}
          Showing {visibleRowCount}{isCollapsed ? " (compact)" : ""} of {totalRowCount} entries
        </p>
      </div>

      {/* Top scrollbar */}
      <div ref={topScrollRef} onScroll={handleTopScroll} className="overflow-x-scroll rounded-t-lg border-x border-t" style={{ height: 12 }}>
        <div style={{ width: totalWidth, height: 1 }} />
      </div>

      {/* Table */}
      <div ref={tableScrollRef} onScroll={handleTableScroll} className="rounded-b-lg border overflow-x-scroll overflow-y-auto" style={{ maxHeight: "calc(100vh - 15rem)" }}>
        <table className="text-xs border-collapse text-foreground" style={{ width: totalWidth, tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-20">
            <tr>
              {visibleColumns.map((col, i) => {
                const isSticky = i < 2;
                const filterSel = getFilterSelected(col.key);
                const allVals = uniqueValues[col.key] ?? [];
                const isColFiltered = filterSel.size < allVals.length;
                return (
                  <th key={col.key}
                    className={["relative px-2 py-2.5 font-medium text-white select-none border-b border-r border-green-900/30",
                      col.align === "right" ? "text-right" : "text-left", isSticky ? "z-30" : ""].join(" ")}
                    style={{ width: colWidths[i], minWidth: colWidths[i], maxWidth: colWidths[i],
                      position: isSticky ? "sticky" : undefined, left: i === 0 ? stickyLeft0 : i === 1 ? stickyLeft1 : undefined,
                      backgroundColor: "#2D6A4F" }}>
                    <span className="inline-flex items-center gap-0.5 overflow-hidden">
                      <span className="cursor-pointer hover:text-white/80 transition-colors truncate" onClick={() => handleSort(col.key)}>{col.header}</span>
                      {sortKey === col.key && (sortDir === "asc"
                        ? <ArrowUp className="h-3 w-3 shrink-0 text-white" />
                        : <ArrowDown className="h-3 w-3 shrink-0 text-white" />)}
                      <ColumnFilter columnKey={col.key} allValues={allVals} selected={filterSel} onchange={(next) => setFilter(col.key, next)} />
                      {isColFiltered && <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />}
                    </span>
                    <ResizeHandle onResize={(delta) => resizeCol(i, delta)} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {(() => {
              // Pre-compute group index per lot for alternating colors by group (not by row)
              const lotGroupIndex = new Map<number, number>();
              let groupIdx = 0;
              for (const g of sortedGroups) {
                lotGroupIndex.set(g.lot, groupIdx);
                groupIdx++;
              }
              return displayRows.map(({ displayRow, lot, isMultiLine, posInGroup, isCollapsedRow }, ri) => {
              const isEven = (lotGroupIndex.get(lot) ?? 0) % 2 === 0;
              const isSelected = lot === selectedLot;
              const hidden = isCollapsedRow;

              const isHovered = !hidden && !isSelected && lot === hoveredLot;
              const rowBg = isSelected
                ? "#ffffff"
                : isHovered
                  ? "#e8f5e9"
                  : isEven ? "var(--color-card, hsl(var(--card)))" : "var(--color-muted, hsl(var(--muted)))";

              // Group borders (expanded, multi-line)
              const thickTop = !isCollapsed && isMultiLine && (posInGroup === "first" || posInGroup === "only");
              const thickBottom = !isCollapsed && isMultiLine && (posInGroup === "last" || posInGroup === "only");
              const thinInternal = !isCollapsed && isMultiLine && (posInGroup === "middle" || posInGroup === "last");

              // Selection borders
              const isFirstOfSel = isSelected && (posInGroup === "first" || posInGroup === "only" || isCollapsed);
              const isLastOfSel = isSelected && (posInGroup === "last" || posInGroup === "only" || isCollapsed);
              const isMidOfSel = isSelected && !isFirstOfSel && !isLastOfSel;

              return (
                <tr
                  key={displayRow.id}
                  onClick={() => !hidden && toggleSelectLot(lot)}
                  onMouseEnter={() => !hidden && setHoveredLot(lot)}
                  onMouseLeave={() => setHoveredLot((prev) => (prev === lot ? null : prev))}
                  className={[
                    "cursor-pointer",
                    // Selection borders
                    isFirstOfSel && !hidden ? "border-t-2 border-t-primary" : "",
                    isLastOfSel && !hidden ? "border-b-2 border-b-primary" : "",
                    isMidOfSel && !hidden ? "border-t border-border/30" : "",
                    // Non-selected group borders
                    !isSelected && !hidden && thickTop ? "border-t-2 border-t-foreground/25" : "",
                    !isSelected && !hidden && thickBottom ? "border-b-2 border-b-foreground/25" : "",
                    !isSelected && !hidden && !thickBottom ? "border-b border-border" : "",
                    !isSelected && !hidden && thinInternal && !thickTop ? "border-t border-border/30" : "",
                  ].join(" ")}
                  style={{
                    backgroundColor: hidden ? "transparent" : rowBg,
                    ...(isSelected && !hidden ? {
                      boxShadow: "inset 2px 0 0 hsl(var(--primary)), inset -2px 0 0 hsl(var(--primary))",
                    } : {}),
                  }}
                  aria-selected={isSelected && !hidden}
                  aria-hidden={hidden}
                >
                  {visibleColumns.map((col, ci) => {
                    const val = displayRow[col.key];
                    const isSticky = ci < 2;
                    return (
                      <td key={col.key}
                        className={[
                          "border-r border-border overflow-hidden",
                          isSticky ? "z-10" : "",
                        ].join(" ")}
                        style={{
                          width: colWidths[ci], minWidth: colWidths[ci], maxWidth: colWidths[ci],
                          padding: 0,
                          ...(isSticky && !hidden ? { position: "sticky" as const, left: ci === 0 ? stickyLeft0 : stickyLeft1, backgroundColor: rowBg } : {}),
                          ...(isSticky && hidden ? { position: "sticky" as const, left: ci === 0 ? stickyLeft0 : stickyLeft1, backgroundColor: "transparent" } : {}),
                        }}>
                        {/* Animated inner div for smooth collapse/expand */}
                        <div
                          className={[
                            "overflow-hidden whitespace-nowrap text-ellipsis text-foreground transition-all duration-300 ease-in-out",
                            col.align === "right" ? "text-right tabular-nums" : "",
                          ].join(" ")}
                          style={{
                            maxHeight: hidden ? 0 : "1.75rem",
                            opacity: hidden ? 0 : 1,
                            padding: hidden ? "0 0.5rem" : "0.25rem 0.5rem",
                          }}
                        >
                          {val != null ? String(val) : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            });
            })()}
            {displayRows.every((r) => r.isCollapsedRow) && displayRows.length > 0 ? null : displayRows.length === 0 && (
              <tr><td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-muted-foreground">No shipment arrivals found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit sheet */}
      {selectedRow && (
        <EditShipmentSheet
          row={selectedRow}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  );
}
