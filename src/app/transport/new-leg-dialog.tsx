"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { createTransportLeg } from "@/lib/actions/transport-actions";
import { TRANSPORT_MODES, TRANSPORT_MODE_LABELS } from "@/lib/constants";

interface NewLegDialogProps {
  dispatchPlans: { id: string; destination: string | null; blNumber: string | null }[];
}

export function NewLegDialog({ dispatchPlans }: NewLegDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createTransportLeg(formData);

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
        New Transport Leg
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Transport Leg</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dispatchPlanId">Dispatch Plan</Label>
            <select
              id="dispatchPlanId"
              name="dispatchPlanId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="">Select dispatch plan...</option>
              {dispatchPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.blNumber ?? "No BL"} — {p.destination ?? "No destination"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mode">Transport Mode</Label>
              <select
                id="mode"
                name="mode"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {TRANSPORT_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Input id="carrier" name="carrier" placeholder="Carrier name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input id="origin" name="origin" required placeholder="Origin port / location" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" name="destination" required placeholder="Destination" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureTime">Departure</Label>
              <Input id="departureTime" name="departureTime" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Arrival</Label>
              <Input id="arrivalTime" name="arrivalTime" type="datetime-local" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingRef">Tracking Reference</Label>
            <Input id="trackingRef" name="trackingRef" placeholder="e.g. TRK-2026-001" />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Leg"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
