import { z } from "zod/v4";

export const createScanEventSchema = z.object({
  scanType: z.enum(["BARCODE", "QR", "RFID"]).default("BARCODE"),
  scannedCode: z.string().min(1, "Scan code is required").max(100),
  containerId: z.string().optional(),
  warehouseId: z.string().optional(),
});

export type CreateScanEventInput = z.infer<typeof createScanEventSchema>;
