import { z } from "zod/v4";

export const createShipmentSchema = z.object({
  blNumber: z.string().min(1, "BL number is required").max(50),
  lotNumber: z.string().max(50).optional(),
  status: z.enum([
    "DRAFT", "BOOKED", "IN_TRANSIT", "AT_PORT",
    "CUSTOMS_HOLD", "CUSTOMS_CLEARED", "DELIVERED", "CANCELLED",
  ]).default("DRAFT"),
  origin: z.string().max(100).optional(),
  destination: z.string().max(100).default("Rotterdam, Netherlands"),
  etd: z.coerce.date().optional(),
  eta: z.coerce.date().optional(),
  incoterms: z.string().max(10).optional(),
  notes: z.string().max(1000).optional(),
  producerId: z.string().optional(),
  vesselId: z.string().optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
