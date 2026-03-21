"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { SlidersHorizontal, ChevronUp, ChevronDown, GripVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { saveColumnPreferences, resetColumnPreferences, type ColumnPreference } from "@/lib/actions/column-prefs";

interface Props {
  prefs: ColumnPreference[];
  onChange: (prefs: ColumnPreference[]) => void;
}

export function ColumnManagerButton({ prefs, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Columns
      </Button>
      <ColumnManagerSheet
        open={open}
        onOpenChange={setOpen}
        prefs={prefs}
        onChange={onChange}
      />
    </>
  );
}

function ColumnManagerSheet({
  open, onOpenChange, prefs, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefs: ColumnPreference[];
  onChange: (prefs: ColumnPreference[]) => void;
}) {
  const [items, setItems] = useState<ColumnPreference[]>(prefs);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Re-sync when opened
  const prevOpen = useRef(open);
  if (open && !prevOpen.current) {
    setItems(prefs);
  }
  prevOpen.current = open;

  const visibleCount = items.filter((p) => p.visible).length;

  const persistAndApply = useCallback((next: ColumnPreference[]) => {
    setItems(next);
    onChange(next);
    // Debounced save to server
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveColumnPreferences(next).then((res) => {
        if (res.error) toast.error(res.error);
      });
    }, 500);
  }, [onChange]);

  function toggle(index: number) {
    const next = [...items];
    const target = next[index];
    if (target.visible && visibleCount <= 2) {
      toast.error("At least 2 columns must be visible");
      return;
    }
    next[index] = { ...target, visible: !target.visible };
    persistAndApply(next);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    persistAndApply(next);
  }

  function moveDown(index: number) {
    if (index >= items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    persistAndApply(next);
  }

  async function handleReset() {
    await resetColumnPreferences();
    // Rebuild default: all visible, original order
    const defaultPrefs: ColumnPreference[] = DEFAULT_KEYS.map((key) => ({ key, visible: true }));
    setItems(defaultPrefs);
    onChange(defaultPrefs);
    toast.success("Columns reset to default");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Columns</SheetTitle>
          <p className="text-xs text-muted-foreground">Show, hide, and reorder table columns</p>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {items.map((item, i) => (
            <div
              key={item.key}
              className={[
                "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
                item.visible ? "bg-card" : "bg-muted/50 text-muted-foreground",
              ].join(" ")}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />

              <div className="flex gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:pointer-events-none transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`Move ${item.key} up`}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(i)}
                  disabled={i === items.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:pointer-events-none transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`Move ${item.key} down`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="flex-1 truncate text-xs">{item.key}</span>

              <button
                type="button"
                onClick={() => toggle(i)}
                className={[
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  item.visible ? "bg-primary" : "bg-input",
                ].join(" ")}
                role="switch"
                aria-checked={item.visible}
                aria-label={`Toggle ${item.key} visibility`}
              >
                <span className={[
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  item.visible ? "translate-x-4" : "translate-x-0.5",
                ].join(" ")} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset to default
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Default column keys in original order (must match COLUMNS in arrivals-table)
const DEFAULT_KEYS = [
  "#", "Day", "Week", "Lot", "Packing date", "ETA", "ETD", "Terminal", "Vessel", "BL",
  "Seal number(s)", "T1", "Weighing", "Cust_reg", "Cust_status", "Carrier", "Container",
  "Date_in", "Date_out", "Terminal_status", "Insp_type", "Insp_status", "Transporter",
  "QC instructions", "Warehouse", "Shipper", "Customer", "CoO", "Brand",
  "Package", "Order", "Amount", "COI", "Product_desc", "MRN/ARN",
];
