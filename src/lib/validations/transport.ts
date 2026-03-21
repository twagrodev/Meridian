import { z } from "zod/v4";

export const createTransportLegSchema = z.object({
  mode: z.enum(["SEA", "ROAD", "RAIL", "AIR"]).default("ROAD"),
  carrier: z.string().max(100).optional(),
  origin: z.string().min(1, "Origin is required").max(200),
  destination: z.string().min(1, "Destination is required").max(200),
  departureTime: z.coerce.date().optional(),
  arrivalTime: z.coerce.date().optional(),
  status: z.enum([
    "PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED",
  ]).default("PLANNED"),
  trackingRef: z.string().max(100).optional(),
  dispatchPlanId: z.string().min(1, "Dispatch plan is required"),
});

export const updateTransportLegSchema = createTransportLegSchema.partial();

export type CreateTransportLegInput = z.infer<typeof createTransportLegSchema>;
export type UpdateTransportLegInput = z.infer<typeof updateTransportLegSchema>;
