"use client";

import { useState, useRef } from "react";
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
import { Plus, Upload } from "lucide-react";
import { createDocument } from "@/lib/actions/document-actions";
import { DOC_TYPES } from "@/lib/constants";

interface UploadDocumentDialogProps {
  shipments: { id: string; blNumber: string | null }[];
  containers: { id: string; containerCode: string }[];
}

export function UploadDocumentDialog({ shipments, containers }: UploadDocumentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (nameRef.current && !nameRef.current.value) {
        nameRef.current.value = file.name;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createDocument(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      setFileName("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFileName(""); }}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Upload Document
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <div className="relative">
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.msg,.jpg,.jpeg,.png,.tif,.tiff"
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Choose file to upload"
              />
              <div className="flex h-20 items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {fileName ? (
                  <span className="font-medium text-foreground">{fileName}</span>
                ) : (
                  <span>Click to select a file or drag and drop</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="originalName">Document Name</Label>
            <Input
              id="originalName"
              name="originalName"
              ref={nameRef}
              required
              placeholder="invoice-2026-001.pdf"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="docType">Document Type</Label>
              <select
                id="docType"
                name="docType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select type...</option>
                {Object.entries(DOC_TYPES).map(([label, code]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipmentId">Shipment</Label>
              <select
                id="shipmentId"
                name="shipmentId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select shipment...</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.blNumber ?? s.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="containerId">Container</Label>
            <select
              id="containerId"
              name="containerId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="">Select container...</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.containerCode}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
