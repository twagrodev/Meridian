import { z } from "zod/v4";

export const createDeclarationSchema = z.object({
  declarationNumber: z.string().max(50).optional(),
  status: z.enum([
    "PENDING", "SUBMITTED", "UNDER_REVIEW", "CLEARED", "RELEASED", "REJECTED",
  ]).default("PENDING"),
  submittedAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  shipmentId: z.string().min(1, "Shipment is required"),
});

export const updateDeclarationSchema = createDeclarationSchema.partial().omit({ shipmentId: true });

export type CreateDeclarationInput = z.infer<typeof createDeclarationSchema>;
export type UpdateDeclarationInput = z.infer<typeof updateDeclarationSchema>;
