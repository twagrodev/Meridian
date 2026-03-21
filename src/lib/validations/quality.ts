import { z } from "zod/v4";

export const createInspectionSchema = z.object({
  grade: z.enum(["PREMIUM", "GRADE_A", "GRADE_B", "REJECTED"]).optional(),
  score: z.coerce.number().min(0).max(100).optional(),
  moisture: z.coerce.number().min(0).max(100).optional(),
  pulpTemp: z.coerce.number().optional(),
  crownColor: z.string().max(50).optional(),
  defects: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  containerId: z.string().min(1, "Container is required"),
});

export const updateInspectionSchema = createInspectionSchema.partial().omit({ containerId: true });

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>;
