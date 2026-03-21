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
import { createVessel } from "@/lib/actions/vessel-actions";
import { CARRIERS } from "@/lib/constants";

export function NewVesselDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createVessel(formData);

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
        New Vessel
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Vessel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vessel-name">Vessel Name</Label>
              <Input
                id="vessel-name"
                name="name"
                required
                placeholder="MSC Ravenna"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vessel-imo">IMO Number</Label>
              <Input
                id="vessel-imo"
                name="imo"
                placeholder="9839430"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vessel-flag">Flag</Label>
              <Input
                id="vessel-flag"
                name="flag"
                placeholder="Panama"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vessel-carrier">Carrier</Label>
              <select
                id="vessel-carrier"
                name="carrier"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select carrier...</option>
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vessel-capacity">Capacity (TEU)</Label>
              <Input
                id="vessel-capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vessel-eta">Current ETA</Label>
              <Input
                id="vessel-eta"
                name="currentEta"
                type="date"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Vessel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
