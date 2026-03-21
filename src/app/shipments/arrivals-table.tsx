"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, ArrowUp, ArrowDown, Filter, X, Check,
  FolderOpen, FileCheck, ExternalLink, Truck, Route, Pencil,
  ChevronsUpDown, Clock, Package, Ship, Anchor, Box, PanelTopClose, PanelTop, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { EditShipmentSheet } from "./edit-sheet";
import { ColumnManagerButton } from "./column-manager";
import { getCellContext, hasCellContext } from "./cell-contexts";
import { TrafficLight, getTrafficTooltip, worstStatus, INLINE_TRAFFIC_COLUMNS, STATUS_ONLY_COLUMNS } from "@/components/shared/TrafficLight";
import type { ShipmentRow } from "@/lib/queries/shipment-arrivals";
import type { ColumnPreference } from "@/lib/actions/column-prefs";

/**
 * Compare Date_in (DD-MM) with ETD (DD-MM HH:MM).
 * Returns true if dateIn is on or before ETD date (warning condition).
 */
function compareDdmmDates(dateIn: string, etd: string): boolean {
  // dateIn is "DD-MM", etd is "DD-MM HH:MM"
  const [dIn, mIn] = dateIn.split("-").map(Number);
  const [dEtd, mEtd] = etd.split("-").map(Number);
  if (!dIn || !mIn || !dEtd || !mEtd) return false;
  // Compare month first, then day
  if (mIn < mEtd) return true;
  if (mIn > mEtd) return false;
  return dIn <= dEtd;
}

type SortKey = string; // column key — may include computed keys like _rowNum, custStatus, inspStatus
type SortDir = "asc" | "desc";

interface ColDef {
  key: string;
  header: string;
  align?: "right" | "center";
  defaultWidth: number;
  mergeInGroup?: boolean;  // true = visually merge in multi-line lots (default true)
  isRowNum?: boolean;      // true = computed sequential container number
  isStatusOnly?: boolean;  // true = renders only a traffic light dot, no text
}

// Day-of-week colors for the Day column
const DAY_COLORS: Record<string, string> = {
  Mon: "bg-blue-100 text-blue-800",
  Tue: "bg-purple-100 text-purple-800",
  Wed: "bg-amber-100 text-amber-800",
  Thu: "bg-emerald-100 text-emerald-800",
  Fri: "bg-rose-100 text-rose-800",
  Sat: "bg-slate-100 text-slate-600",
  Sun: "bg-red-100 text-red-700",
};

// Columns that do NOT merge in multi-line lots
const NO_MERGE_KEYS = new Set(["brand", "customer", "amount", "order", "qcInstructions"]);

function col(key: string, header: string, defaultWidth: number, opts?: Partial<ColDef>): ColDef {
  return { key: key as ColDef["key"], header, defaultWidth, mergeInGroup: !NO_MERGE_KEYS.has(key), ...opts };
}

// 34 columns in default order
export const ALL_COLUMNS: ColDef[] = [
  col("_rowNum", "#", 40, { align: "center", isRowNum: true }),
  col("dateInDay", "Day", 48, { align: "center" }),
  col("week", "Week", 50),
  col("lot", "Lot", 60),
  col("packingDate", "Packing date", 85),
  col("eta", "ETA", 90),
  col("etd", "ETD", 90),
  col("terminal", "Terminal", 65),
  col("vessel", "Vessel", 200),
  col("bl", "BL", 130),
  col("sealNumbers", "Seal number(s)", 150),
  col("t1", "T1", 48),
  col("weighing", "Weighing", 72),
  col("custReg", "Cust_reg", 72),
  col("custStatus", "Cust_status", 42, { align: "center", isStatusOnly: true }),
  col("carrier", "Carrier", 80),
  col("container", "Container", 110),
  col("dateIn", "Date_in", 60),
  col("dateOut", "Date_out", 65),
  col("terminalStatus", "Terminal_status", 120),
  col("inspType", "Insp_type", 80),
  col("inspStatus", "Insp_status", 42, { align: "center", isStatusOnly: true }),
  col("transporter", "Transporter", 85),
  col("qcInstructions", "QC instructions", 120),
  col("warehouse", "Warehouse", 80),
  col("shipper", "Shipper", 80),
  col("customer", "Customer", 80),
  col("coo", "CoO", 42),
  col("brand", "Brand", 110),
  col("packageType", "Package", 80),
  col("order", "Order", 60),
  col("amount", "Amount", 60, { align: "right" }),
  col("coi", "COI", 150),
  col("productDesc", "Product_desc", 220),
  col("mrnArn", "MRN/ARN", 170),
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
          t1Status: worstStatus(groupRows.map((r) => r.t1Status)),
          weighingStatus: worstStatus(groupRows.map((r) => r.weighingStatus)),
          custStatus: worstStatus(groupRows.map((r) => r.custStatus)),
          inspStatus: worstStatus(groupRows.map((r) => r.inspStatus)),
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

// ── Inline Date Editor ───────────────────────────────────────

function InlineDateCell({
  value,
  rowId,
  field,
  warn,
}: {
  value: string | null;
  rowId: string;
  field: "dateIn" | "dateOut";
  warn?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local display value when parent data changes
  useEffect(() => { setLocalValue(value); }, [value]);

  // Convert DD-MM display to YYYY-MM-DD for the input
  function toInputFormat(ddmm: string | null): string {
    if (!ddmm) return "";
    const [d, m] = ddmm.split("-");
    return `2026-${m}-${d}`;
  }

  // Convert YYYY-MM-DD input back to DD-MM display
  function toDisplayFormat(iso: string): string {
    const [, m, d] = iso.split("-");
    return `${d}-${m}`;
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = toInputFormat(localValue);
        inputRef.current.showPicker?.();
      }
    }, 0);
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newIso = e.target.value; // YYYY-MM-DD or ""
    setEditing(false);

    if (!newIso && !localValue) return; // no change
    if (newIso && localValue && toInputFormat(localValue) === newIso) return; // same value

    const newDisplay = newIso ? toDisplayFormat(newIso) : null;
    setLocalValue(newDisplay); // optimistic update
    setSaving(true);

    const { updateShipmentArrival } = await import("@/lib/actions/shipment-arrival-actions");
    const result = await updateShipmentArrival(rowId, { [field]: newIso || null });

    setSaving(false);
    if (result.error) {
      setLocalValue(value); // revert on error
      toast.error(result.error);
    } else {
      router.refresh();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={toInputFormat(localValue)}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-foreground text-xs border-none outline-none p-0"
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      className={[
        "block w-full min-h-[1.25rem] cursor-pointer hover:underline hover:text-primary text-foreground transition-colors",
        saving ? "opacity-50" : "",
        !localValue ? "hover:bg-primary/5 rounded" : "",
        localValue && warn ? "bg-orange-100 text-orange-800 rounded px-1" : "",
      ].join(" ")}
      title={warn ? "Container pickup may be difficult — Date_in is on or before ETD" : "Click to edit"}
    >
      {localValue ?? "\u00A0"}
    </span>
  );
}

// ── Main Table ───────────────────────────────────────────────

export interface KpiData {
  lots: number;
  lineItems: number;
  containers: number;
  boxes: number;
  vessels: number;
}

export function ArrivalsTable({
  data,
  initialColumnPrefs,
  kpis,
}: {
  data: ShipmentRow[];
  initialColumnPrefs: ColumnPreference[] | null;
  kpis: KpiData;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showKpis, setShowKpis] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("lot");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [selectedLot, setSelectedLot] = useState<number | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [selectedCellRowId, setSelectedCellRowId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTime, setShowTime] = useState(true);
  const [showCustoms, setShowCustoms] = useState(true);
  const [columnPrefs, setColumnPrefs] = useState<ColumnPreference[]>(
    () => initialColumnPrefs ?? buildDefaultPrefs()
  );

  // Resolve prefs → visible ColDefs in order, merging with ALL_COLUMNS
  const CUSTOMS_KEYS = new Set(["t1", "weighing", "custReg", "custStatus", "mrnArn"]);

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
    // Hide customs columns when toggle is off
    if (!showCustoms) {
      return cols.filter((c) => !CUSTOMS_KEYS.has(c.key));
    }
    return cols;
  }, [columnPrefs, showCustoms]);

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
  // Sticky left offsets for first 3 columns (#, Week, Lot)
  // Sticky left offsets for first 4 columns (#, Day, Week, Lot)
  const stickyLeftOffsets = [
    0,
    colWidths[0],
    colWidths[0] + (colWidths[1] ?? 0),
    colWidths[0] + (colWidths[1] ?? 0) + (colWidths[2] ?? 0),
  ];
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
      for (const row of data) { const v = (row as unknown as Record<string, unknown>)[col.key]; vals.add(v != null ? String(v) : ""); }
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
      rows = rows.filter((row) => { const v = (row as unknown as Record<string, unknown>)[key]; return sel.has(v != null ? String(v) : ""); });
    }
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((row) => ALL_COLUMNS.some((col) => { const v = (row as unknown as Record<string, unknown>)[col.key]; return v != null && String(v).toLowerCase().includes(term); }));
    }
    return rows;
  }, [data, search, columnFilters, uniqueValues]);

  // Lot-aware sorting: sort groups by the first row's sort value, keep rows within a group together
  const sortedGroups = useMemo(() => {
    const groups = buildLotGroups(filtered);
    groups.sort((a, b) => {
      const rowA = isCollapsed ? a.mergedRow : a.rows[0];
      const rowB = isCollapsed ? b.mergedRow : b.rows[0];
      const av = (rowA as unknown as Record<string, unknown>)[sortKey]; const bv = (rowB as unknown as Record<string, unknown>)[sortKey];
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
  const activeCellContext = selectedCellKey ? getCellContext(selectedCellKey) : null;
  // The specific row whose cell was clicked (for cell-level actions)
  const cellActionRow = selectedCellRowId
    ? displayRows.find((r) => r.displayRow.id === selectedCellRowId)?.displayRow ?? selectedRow
    : selectedRow;

  function toggleSelectLot(lot: number) {
    if (selectedLot !== lot) {
      setSelectedCellKey(null);
      setSelectedCellRowId(null);
    }
    setSelectedLot((prev) => (prev === lot ? null : lot));
  }

  function handleCellClick(e: React.MouseEvent, rowId: string, lot: number, colKey: string) {
    // If row is not selected, just select the row — don't jump to cell
    if (selectedLot !== lot) return; // let the row click handler fire
    // Row IS selected — handle cell selection
    if (!hasCellContext(colKey)) return; // no context for this column
    e.stopPropagation(); // prevent row toggle
    if (selectedCellKey === colKey && selectedCellRowId === rowId) {
      // Same cell clicked again — deselect cell
      setSelectedCellKey(null);
      setSelectedCellRowId(null);
    } else {
      setSelectedCellKey(colKey);
      setSelectedCellRowId(rowId);
    }
  }

  // Clear cell selection when lot changes, collapse toggles, or edit opens
  useEffect(() => { setSelectedCellKey(null); setSelectedCellRowId(null); }, [selectedLot, isCollapsed]);

  // Clear cell if its column becomes hidden
  useEffect(() => {
    if (selectedCellKey && !visibleColumns.some((c) => c.key === selectedCellKey)) {
      setSelectedCellKey(null); setSelectedCellRowId(null);
    }
  }, [visibleColumns, selectedCellKey]);

  // Keyboard: Escape (cell→row→nothing), ArrowUp/Down (lot groups), Left/Right (cells with context)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (selectedCellKey) { setSelectedCellKey(null); setSelectedCellRowId(null); }
      else { setSelectedLot(null); }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCellKey(null); setSelectedCellRowId(null);
      const currentIdx = selectedLot != null ? sortedGroups.findIndex((g) => g.lot === selectedLot) : -1;
      let nextIdx: number;
      if (e.key === "ArrowDown") nextIdx = currentIdx < sortedGroups.length - 1 ? currentIdx + 1 : 0;
      else nextIdx = currentIdx > 0 ? currentIdx - 1 : sortedGroups.length - 1;
      setSelectedLot(sortedGroups[nextIdx].lot);
      let rowIdx = 0;
      for (let i = 0; i < nextIdx; i++) rowIdx += isCollapsed ? 1 : sortedGroups[i].rows.length;
      const el = tbodyRef.current?.children[rowIdx];
      if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
      return;
    }
    // Left/Right: move between context-enabled cells
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && selectedLot != null) {
      e.preventDefault();
      const contextCols = visibleColumns.filter((c) => hasCellContext(c.key));
      if (contextCols.length === 0) return;
      const curIdx = selectedCellKey ? contextCols.findIndex((c) => c.key === selectedCellKey) : -1;
      let nextIdx: number;
      if (e.key === "ArrowRight") nextIdx = curIdx < contextCols.length - 1 ? curIdx + 1 : 0;
      else nextIdx = curIdx > 0 ? curIdx - 1 : contextCols.length - 1;
      setSelectedCellKey(contextCols[nextIdx].key);
      if (!selectedCellRowId && selectedRow) setSelectedCellRowId(selectedRow.id);
      return;
    }
  }

  // Action handlers
  function handleDocuments() { if (selectedRow) router.push(`/documents?lot=${selectedRow.lot}`); }
  function handleCustoms() { if (selectedRow) router.push(`/customs?lot=${selectedRow.lot}`); }
  function handleTraces() { if (selectedRow) toast.info(`TRACES integration coming soon — Lot ${selectedRow.lot}, Container ${selectedRow.container ?? "N/A"}`); }
  function handleTrucking() { if (selectedRow) toast.info(`Trucking status — Lot ${selectedRow.lot}, Container ${selectedRow.container ?? "N/A"}, Transporter: ${selectedRow.transporter ?? "N/A"}`); }
  function handleDispatch() { if (selectedRow) router.push(`/dispatch?lot=${selectedRow.lot}`); }
  function handleEdit() { if (selectedRow) { setSelectedCellKey(null); setSelectedCellRowId(null); setEditOpen(true); } }

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
      {/* KPI cards — collapsible */}
      {showKpis && (
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground shrink-0" />
            <div><p className="text-lg font-bold">{kpis.lots}</p><p className="text-xs text-muted-foreground">{kpis.lineItems} line items</p></div>
          </div>
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <Box className="h-5 w-5 text-muted-foreground shrink-0" />
            <div><p className="text-lg font-bold">{kpis.containers}</p><p className="text-xs text-muted-foreground">Containers</p></div>
          </div>
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <Anchor className="h-5 w-5 text-muted-foreground shrink-0" />
            <div><p className="text-lg font-bold">{kpis.boxes.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total boxes</p></div>
          </div>
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <Ship className="h-5 w-5 text-muted-foreground shrink-0" />
            <div><p className="text-lg font-bold">{kpis.vessels}</p><p className="text-xs text-muted-foreground">Vessels</p></div>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* KPI toggle */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 h-8 text-xs font-medium border border-input bg-transparent hover:bg-accent text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={() => setShowKpis((v) => !v)}
            title={showKpis ? "Hide statistics panels" : "Show statistics panels"}
          >
            {showKpis ? <PanelTopClose className="h-3.5 w-3.5" /> : <PanelTop className="h-3.5 w-3.5" />}
          </button>
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

          <button
            type="button"
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              showTime
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                : "border border-input bg-transparent hover:bg-accent text-foreground",
            ].join(" ")}
            onClick={() => setShowTime((v) => !v)}
            title={showTime ? "Hide time from ETA/ETD" : "Show time on ETA/ETD"}
          >
            <Clock className="h-3.5 w-3.5" />
            {showTime ? "HH:MM" : "DD-MM"}
          </button>

          <button
            type="button"
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              showCustoms
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                : "border border-input bg-transparent hover:bg-accent text-foreground",
            ].join(" ")}
            onClick={() => setShowCustoms((v) => !v)}
            title={showCustoms ? "Hide customs columns" : "Show customs columns"}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Customs
          </button>

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

          {/* Cell action bar */}
          <div
            className={["flex flex-wrap items-center gap-2 transition-all duration-150",
              activeCellContext && cellActionRow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none h-0 overflow-hidden",
            ].join(" ")}
            aria-hidden={!activeCellContext}
          >
            <span className="h-5 w-px bg-border mx-0.5" aria-hidden="true" />
            {activeCellContext && cellActionRow && (
              <>
                <span className="text-xs font-medium text-muted-foreground">{activeCellContext.label}:</span>
                {activeCellContext.statusPanel?.(cellActionRow)}
                {activeCellContext.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs border-primary/30 hover:border-primary/60"
                    onClick={() => action.onClick(cellActionRow, router)}
                  >
                    {action.icon} {action.label}
                  </Button>
                ))}
              </>
            )}
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
                const isSticky = i < 4;
                const filterSel = getFilterSelected(col.key);
                const allVals = uniqueValues[col.key] ?? [];
                const isColFiltered = filterSel.size < allVals.length;
                return (
                  <th key={col.key}
                    className={["relative px-2 py-2.5 font-medium text-white select-none border-b border-r border-green-900/30",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      isSticky ? "z-30" : ""].join(" ")}
                    style={{ width: colWidths[i], minWidth: colWidths[i], maxWidth: colWidths[i],
                      position: isSticky ? "sticky" : undefined, left: isSticky ? stickyLeftOffsets[i] : undefined,
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
              // Compute sequential container numbers
              const containerNumMap = new Map<number, number>();
              let cNum = 0;
              for (const g of sortedGroups) {
                cNum++;
                containerNumMap.set(g.lot, cNum);
              }

              return displayRows.map(({ displayRow, lot, isMultiLine, posInGroup, isCollapsedRow }, ri) => {
              // Don't render collapsed rows at all — prevents extra row height
              if (isCollapsedRow) return null;

              const containerNum = containerNumMap.get(lot) ?? 0;
              const isSelected = lot === selectedLot;
              const isHovered = !isSelected && lot === hoveredLot;

              const rowBg = isSelected
                ? "#d0e8d8"
                : isHovered
                  ? "#edf5ef"
                  : "#fafcfb";

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
                  onClick={() => toggleSelectLot(lot)}
                  onMouseEnter={() => setHoveredLot(lot)}
                  onMouseLeave={() => setHoveredLot((prev) => (prev === lot ? null : prev))}
                  className={[
                    "cursor-pointer",
                    // Selection borders
                    isFirstOfSel ? "border-t-2 border-t-primary" : "",
                    isLastOfSel ? "border-b-2 border-b-primary" : "",
                    isMidOfSel ? "border-t border-border/30" : "",
                    // Non-selected group borders
                    !isSelected && thickTop ? "border-t-2 border-t-foreground/25" : "",
                    !isSelected && thickBottom ? "border-b-2 border-b-foreground/25" : "",
                    !isSelected && !thickBottom ? "border-b border-border" : "",
                    !isSelected && thinInternal && !thickTop ? "border-t border-border/30" : "",
                  ].join(" ")}
                  style={{
                    backgroundColor: rowBg,
                    ...(isSelected ? {
                      boxShadow: "inset 2px 0 0 hsl(var(--primary)), inset -2px 0 0 hsl(var(--primary))",
                    } : {}),
                  }}
                  aria-selected={isSelected}
                >
                  {visibleColumns.map((col, ci) => {
                    // rowSpan merging: skip merged columns on non-first rows of multi-line groups
                    const shouldMerge = !isCollapsed && isMultiLine && col.mergeInGroup !== false;
                    if (shouldMerge && posInGroup !== "first" && posInGroup !== "only") return null;
                    const rowSpan = shouldMerge && isMultiLine && posInGroup === "first"
                      ? displayRows.filter((r) => r.lot === lot && !r.isCollapsedRow).length
                      : undefined;

                    const isSticky = ci < 4; // #, Day, Week, Lot are sticky
                    const stickyLeft = ci === 0 ? 0 : ci === 1 ? colWidths[0] : ci === 2 ? colWidths[0] + colWidths[1] : 0;
                    const hasContext = hasCellContext(col.key);
                    const isCellSelected = isSelected && selectedCellKey === col.key && selectedCellRowId === displayRow.id;

                    // Determine cell value
                    const isStatusCol = STATUS_ONLY_COLUMNS[col.key];
                    const inlineTrafficField = INLINE_TRAFFIC_COLUMNS[col.key];
                    let val = col.isRowNum ? containerNum : col.isStatusOnly ? null : (displayRow as unknown as Record<string, unknown>)[col.key];
                    // Strip time from ETA/ETD when showTime is off
                    if (!showTime && (col.key === "eta" || col.key === "etd") && typeof val === "string" && val.length > 5) {
                      val = val.slice(0, 5);
                    }

                    return (
                      <td key={col.key}
                        rowSpan={rowSpan}
                        onClick={(e) => isSelected && hasContext && handleCellClick(e, displayRow.id, lot, col.key)}
                        className={[
                          "border-r border-border overflow-hidden",
                          isSticky ? "z-10" : "",
                          isCellSelected ? "ring-2 ring-inset ring-primary rounded-sm z-20" : "",
                          isSelected && hasContext ? "cursor-pointer" : "",
                          rowSpan ? "align-middle" : "",
                        ].join(" ")}
                        style={{
                          width: colWidths[ci], minWidth: colWidths[ci], maxWidth: colWidths[ci],
                          padding: 0,
                          ...(isSticky ? { position: "sticky" as const, left: stickyLeft, backgroundColor: rowBg, zIndex: 10 } : {}),
                        }}
                        title={isSelected && hasContext ? `Click for ${getCellContext(col.key)?.label}` : undefined}
                      >
                        <div
                          className={[
                            "overflow-hidden whitespace-nowrap text-ellipsis text-foreground transition-all duration-300 ease-in-out",
                            col.align === "right" ? "text-right tabular-nums" : "",
                            col.align === "center" ? "text-center" : "",
                            inlineTrafficField || isStatusCol ? "inline-flex items-center gap-1.5" : "",
                          ].join(" ")}
                          style={{
                            maxHeight: "1.75rem",
                            padding: "0.25rem 0.5rem",
                          }}
                        >
                          {/* Status-only column: just a dot */}
                          {isStatusCol && (
                            <TrafficLight
                              status={(displayRow as unknown as Record<string, unknown>)[isStatusCol] as string}
                              tooltip={getTrafficTooltip(isStatusCol, (displayRow as unknown as Record<string, unknown>)[isStatusCol] as string)}
                            />
                          )}
                          {/* Inline traffic light (T1, Weighing) */}
                          {inlineTrafficField && (
                            <TrafficLight
                              status={(displayRow as unknown as Record<string, unknown>)[inlineTrafficField] as string}
                              tooltip={getTrafficTooltip(inlineTrafficField, (displayRow as unknown as Record<string, unknown>)[inlineTrafficField] as string)}
                            />
                          )}
                          {/* Cell text value */}
                          {col.isRowNum && val != null && (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold leading-none">{String(val)}</span>
                          )}
                          {col.key === "dateInDay" && val != null && (
                            <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${DAY_COLORS[String(val)] ?? "bg-gray-100 text-gray-700"}`}>{String(val)}</span>
                          )}
                          {(col.key === "dateIn" || col.key === "dateOut") && (
                            <InlineDateCell
                              value={val as string | null}
                              rowId={displayRow.id}
                              field={col.key as "dateIn" | "dateOut"}
                              warn={col.key === "dateIn" && !!val && !!displayRow.etd && compareDdmmDates(String(val), displayRow.etd)}
                            />
                          )}
                          {!col.isRowNum && col.key !== "dateInDay" && col.key !== "dateIn" && col.key !== "dateOut" && !isStatusCol && (val != null ? String(val) : "")}
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
