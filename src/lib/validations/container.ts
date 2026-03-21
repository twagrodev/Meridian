import { z } from "zod/v4";

export const createContainerSchema = z.object({
  containerCode: z.string().min(1, "Container code is required").max(20),
  type: z.enum(["REEFER_20", "REEFER_40", "DRY_20", "DRY_40"]).default("REEFER_40"),
  sealNumber: z.string().max(50).optional(),
  grossWeight: z.coerce.number().positive().optional(),
  nettWeight: z.coerce.number().positive().optional(),
  tareWeight: z.coerce.number().positive().optional(),
  boxes: z.coerce.number().int().positive().optional(),
  status: z.enum(["EMPTY", "LOADING", "LOADED", "IN_TRANSIT", "AT_PORT", "DELIVERED"]).default("EMPTY"),
  vesselId: z.string().optional(),
});

export const updateContainerSchema = createContainerSchema.partial();

export type CreateContainerInput = z.infer<typeof createContainerSchema>;
export type UpdateContainerInput = z.infer<typeof updateContainerSchema>;
