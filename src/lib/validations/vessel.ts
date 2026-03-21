import { z } from "zod/v4";

export const createVesselSchema = z.object({
  name: z.string().min(1, "Vessel name is required").max(100),
  imo: z.string().max(20).optional(),
  flag: z.string().max(50).optional(),
  carrier: z.string().max(50).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  currentEta: z.coerce.date().optional(),
});

export const updateVesselSchema = createVesselSchema.partial();

export type CreateVesselInput = z.infer<typeof createVesselSchema>;
export type UpdateVesselInput = z.infer<typeof updateVesselSchema>;
