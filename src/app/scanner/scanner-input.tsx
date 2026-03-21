"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine } from "lucide-react";
import { createScanEvent } from "@/lib/actions/scanner-actions";

interface ScannerInputProps {
  warehouses: { id: string; name: string }[];
}

export function ScannerInput({ warehouses }: ScannerInputProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const result = await createScanEvent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(`Scan recorded: ${formData.get("scannedCode")}`);
      setLoading(false);
      // Clear input and refocus
      const form = e.currentTarget;
      const scannedCodeInput = form.querySelector<HTMLInputElement>('input[name="scannedCode"]');
      if (scannedCodeInput) {
        scannedCodeInput.value = "";
      }
      inputRef.current?.focus();
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" aria-hidden="true" />
          Record Scan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scannedCode">Scan Code</Label>
            <Input
              ref={inputRef}
              id="scannedCode"
              name="scannedCode"
              required
              autoFocus
              placeholder="Scan or enter container/barcode..."
              className="font-mono text-lg h-12"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse</Label>
              <select
                id="warehouseId"
                name="warehouseId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scanType">Scan Type</Label>
              <select
                id="scanType"
                name="scanType"
                defaultValue="BARCODE"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="BARCODE">Barcode</option>
                <option value="QR">QR Code</option>
                <option value="RFID">RFID</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-700" role="status">{success}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Recording..." : "Record Scan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
