import { z } from "zod/v4";

export const createDispatchPlanSchema = z.object({
  scheduledDate: z.coerce.date(),
  status: z.enum([
    "PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED",
  ]).default("PLANNED"),
  destination: z.string().min(1, "Destination is required").max(200),
  notes: z.string().max(1000).optional(),
  shipmentId: z.string().min(1, "Shipment is required"),
});

export const updateDispatchPlanSchema = createDispatchPlanSchema.partial();

export type CreateDispatchPlanInput = z.infer<typeof createDispatchPlanSchema>;
export type UpdateDispatchPlanInput = z.infer<typeof updateDispatchPlanSchema>;
