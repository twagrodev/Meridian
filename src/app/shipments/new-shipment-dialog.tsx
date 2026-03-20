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
import { createShipment } from "@/lib/actions/shipment-actions";

interface NewShipmentDialogProps {
  producers: { id: string; name: string }[];
  vessels: { id: string; name: string }[];
}

export function NewShipmentDialog({ producers, vessels }: NewShipmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createShipment(formData);

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
        New Shipment
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blNumber">BL Number</Label>
              <Input id="blNumber" name="blNumber" required placeholder="BL2026001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lotNumber">Lot Number</Label>
              <Input id="lotNumber" name="lotNumber" placeholder="LOT-0001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="producerId">Producer</Label>
              <select
                id="producerId"
                name="producerId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select producer...</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vesselId">Vessel</Label>
              <select
                id="vesselId"
                name="vesselId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select vessel...</option>
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input id="origin" name="origin" placeholder="Santo Domingo, DR" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" name="destination" defaultValue="Rotterdam, Netherlands" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etd">ETD</Label>
              <Input id="etd" name="etd" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eta">ETA</Label>
              <Input id="eta" name="eta" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Optional notes..." rows={2} />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Shipment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
