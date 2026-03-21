import { z } from "zod/v4";

export const createDocumentSchema = z.object({
  originalName: z.string().min(1, "File name is required").max(255),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100).optional(),
  fileSize: z.coerce.number().int().positive().optional(),
  docType: z.string().max(20).optional(),
  docStatus: z.enum(["UPLOADED", "PROCESSING", "CLASSIFIED", "MATCHED", "FAILED", "MANUAL"]).default("UPLOADED"),
  shipmentId: z.string().optional(),
  containerId: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  docType: z.string().max(20).optional(),
  docStatus: z.enum(["UPLOADED", "PROCESSING", "CLASSIFIED", "MATCHED", "FAILED", "MANUAL"]).optional(),
  shipmentId: z.string().optional(),
  containerId: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
