"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createVesselSchema, updateVesselSchema } from "@/lib/validations/vessel";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createVessel(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createVesselSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const vessel = await prisma.vessel.create({
    data: parsed.data,
  });

  await logAudit(user.id, "CREATE", "Vessel", vessel.id, {
    name: vessel.name,
    carrier: vessel.carrier,
  });

  revalidatePath("/vessels");
  return { vessel };
}

export async function updateVessel(vesselId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateVesselSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.vessel.findUnique({ where: { id: vesselId } });
  if (!existing || existing.deletedAt) {
    return { error: "Vessel not found" };
  }

  const vessel = await prisma.vessel.update({
    where: { id: vesselId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "Vessel", vessel.id, changes);

  revalidatePath("/vessels");
  revalidatePath(`/vessels/${vesselId}`);
  return { vessel };
}

export async function deleteVessel(vesselId: string) {
  const user = await getSessionUser();

  const existing = await prisma.vessel.findUnique({ where: { id: vesselId } });
  if (!existing || existing.deletedAt) {
    return { error: "Vessel not found" };
  }

  await prisma.vessel.update({
    where: { id: vesselId },
    data: { deletedAt: new Date() },
  });

  await logAudit(user.id, "DELETE", "Vessel", vesselId, {
    name: existing.name,
  });

  revalidatePath("/vessels");
  return { success: true };
}
