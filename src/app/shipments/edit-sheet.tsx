"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateShipmentArrival } from "@/lib/actions/shipment-arrival-actions";
import type { ShipmentRow } from "@/lib/queries/shipment-arrivals";

interface EditSheetProps {
  row: ShipmentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FieldDef {
  key: keyof ShipmentRow;
  label: string;
  type: "text" | "number" | "datetime-local" | "date";
  readOnly?: boolean;
}

const FIELD_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Shipment Info",
    fields: [
      { key: "week", label: "Week", type: "number" },
      { key: "lot", label: "Lot", type: "number" },
      { key: "packingDate", label: "Packing date", type: "text", readOnly: true },
      { key: "eta", label: "ETA", type: "text", readOnly: true },
      { key: "etd", label: "ETD", type: "text", readOnly: true },
    ],
  },
  {
    title: "Vessel & Transport",
    fields: [
      { key: "terminal", label: "Terminal", type: "text" },
      { key: "vessel", label: "Vessel", type: "text" },
      { key: "bl", label: "BL", type: "text" },
      { key: "sealNumbers", label: "Seal number(s)", type: "text" },
      { key: "carrier", label: "Carrier", type: "text" },
      { key: "container", label: "Container", type: "text" },
      { key: "transporter", label: "Transporter", type: "text" },
    ],
  },
  {
    title: "Customs & Compliance",
    fields: [
      { key: "t1", label: "T1", type: "text" },
      { key: "weighing", label: "Weighing", type: "text" },
      { key: "customsReg", label: "Customs_reg", type: "text" },
      { key: "mrnArn", label: "MRN/ARN", type: "text" },
      { key: "coi", label: "COI", type: "text" },
    ],
  },
  {
    title: "Terminal & Logistics",
    fields: [
      { key: "dateIn", label: "Date_in", type: "text", readOnly: true },
      { key: "dateOut", label: "Date_out", type: "text", readOnly: true },
      { key: "terminalStatus", label: "Terminal_status", type: "text" },
      { key: "scan", label: "Scan", type: "text" },
    ],
  },
  {
    title: "Product & Order",
    fields: [
      { key: "warehouse", label: "Warehouse", type: "text" },
      { key: "shipper", label: "Shipper", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "coo", label: "CoO", type: "text" },
      { key: "brand", label: "Brand", type: "text" },
      { key: "packageType", label: "Package", type: "text" },
      { key: "order", label: "Order", type: "text" },
      { key: "amount", label: "Amount", type: "number" },
      { key: "productDesc", label: "Product_desc", type: "text" },
      { key: "qcInstructions", label: "QC instructions", type: "text" },
    ],
  },
];

export function EditShipmentSheet({ row, open, onOpenChange }: EditSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const result = await updateShipmentArrival(row.id, data);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onOpenChange(false);
      toast.success(`Lot ${row.lot} updated`);
      router.refresh();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Edit Lot {row.lot} — {row.container ?? "No container"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6 pb-8">
          {FIELD_GROUPS.map((group) => (
            <fieldset key={group.title} className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">
                {group.title}
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {group.fields.map((field) => {
                  const val = row[field.key];
                  return (
                    <div
                      key={field.key}
                      className={field.key === "productDesc" || field.key === "qcInstructions" || field.key === "sealNumbers" ? "col-span-2" : ""}
                    >
                      <Label htmlFor={field.key} className="text-xs text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        id={field.key}
                        name={field.key}
                        type={field.type === "number" ? "number" : "text"}
                        defaultValue={val != null ? String(val) : ""}
                        readOnly={field.readOnly}
                        className={[
                          "h-8 text-sm",
                          field.readOnly ? "bg-muted/50 text-muted-foreground" : "",
                        ].join(" ")}
                      />
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
