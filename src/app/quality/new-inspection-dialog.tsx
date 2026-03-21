"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { createInspection } from "@/lib/actions/quality-actions";

interface NewInspectionDialogProps {
  containers: { id: string; containerCode: string }[];
}

export function NewInspectionDialog({ containers }: NewInspectionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createInspection(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Plus className="h-4 w-4" aria-hidden="true" />
        New Inspection
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Inspection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="containerId">Container</Label>
              <select
                id="containerId"
                name="containerId"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select container...</option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>{c.containerCode}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <select
                id="grade"
                name="grade"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select grade...</option>
                <option value="PREMIUM">Premium</option>
                <option value="GRADE_A">Grade A</option>
                <option value="GRADE_B">Grade B</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input id="score" name="score" type="number" min="0" max="100" step="0.1" placeholder="85.0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moisture">Moisture %</Label>
              <Input id="moisture" name="moisture" type="number" min="0" max="100" step="0.1" placeholder="12.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pulpTemp">Pulp Temp (&deg;C)</Label>
              <Input id="pulpTemp" name="pulpTemp" type="number" step="0.1" placeholder="13.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crownColor">Crown Color</Label>
              <Input id="crownColor" name="crownColor" placeholder="Green-Yellow" maxLength={50} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defects">Defects</Label>
            <Textarea id="defects" name="defects" placeholder="Describe any defects found..." rows={2} maxLength={2000} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Optional notes..." rows={2} maxLength={2000} />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Inspection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
