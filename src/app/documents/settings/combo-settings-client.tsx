"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { upsertComboSetting, deleteComboSetting } from "@/lib/actions/combo-actions";
import { EXTRACTION_FIELDS } from "@/lib/constants";

interface ComboData {
  id: string;
  name: string;
  carrier: string | null;
  docType: string;
  fields: string[];
  active: boolean;
}

interface Props {
  combos: ComboData[];
  docTypeOptions: { label: string; code: string }[];
  carriers: string[];
}

export function ComboSettingsClient({ combos, docTypeOptions, carriers }: Props) {
  const router = useRouter();
  const [editingCombo, setEditingCombo] = useState<ComboData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleDelete(id: string) {
    await deleteComboSetting(id);
    router.refresh();
  }

  function openNew() {
    setEditingCombo(null);
    setDialogOpen(true);
  }

  function openEdit(combo: ComboData) {
    setEditingCombo(combo);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Combo
        </Button>
      </div>

      {combos.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No combo settings configured. Create one to define field mappings per carrier/doc type.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => (
            <Card key={combo.id} className={!combo.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{combo.name}</CardTitle>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(combo)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label={`Edit ${combo.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(combo.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label={`Delete ${combo.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier</span>
                    <span className="font-medium">{combo.carrier ?? "All"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doc Type</span>
                    <span className="font-medium">{combo.docType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fields ({combo.fields.length})</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {combo.fields.map((f) => (
                        <span
                          key={f}
                          className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ComboFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        combo={editingCombo}
        docTypeOptions={docTypeOptions}
        carriers={carriers}
      />
    </div>
  );
}

function ComboFormDialog({
  open,
  onOpenChange,
  combo,
  docTypeOptions,
  carriers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  combo: ComboData | null;
  docTypeOptions: { label: string; code: string }[];
  carriers: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(combo?.docType ?? "");

  const availableFields = selectedDocType
    ? (EXTRACTION_FIELDS[
        docTypeOptions.find((d) => d.code === selectedDocType)?.label ?? ""
      ] ?? [])
    : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    if (combo) formData.set("id", combo.id);
    formData.set("active", "true");

    const result = await upsertComboSetting(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onOpenChange(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{combo ? "Edit Combo" : "New Combo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={combo?.name ?? ""} placeholder="MSC Bill of Lading" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <select
                id="carrier"
                name="carrier"
                defaultValue={combo?.carrier ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">All carriers</option>
                {carriers.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="docType">Document Type</Label>
              <select
                id="docType"
                name="docType"
                required
                defaultValue={combo?.docType ?? ""}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select type...</option>
                {docTypeOptions.map((d) => (
                  <option key={d.code} value={d.code}>{d.label} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fields">Fields (comma-separated)</Label>
            <Input
              id="fields"
              name="fields"
              required
              defaultValue={combo?.fields.join(", ") ?? ""}
              placeholder="bl_number, vessel, container_number, seal_numbers"
            />
            {availableFields.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Available: {availableFields.join(", ")}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
