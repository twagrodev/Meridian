"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createTransportLegSchema, updateTransportLegSchema } from "@/lib/validations/transport";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createTransportLeg(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTransportLegSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const leg = await prisma.transportLeg.create({
    data: parsed.data,
  });

  await logAudit(user.id, "CREATE", "TransportLeg", leg.id, {
    mode: leg.mode,
    carrier: leg.carrier,
    trackingRef: leg.trackingRef,
  });

  revalidatePath("/transport");
  revalidatePath("/dispatch");
  return { leg };
}

export async function updateTransportLeg(legId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTransportLegSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.transportLeg.findUnique({ where: { id: legId } });
  if (!existing) {
    return { error: "Transport leg not found" };
  }

  const leg = await prisma.transportLeg.update({
    where: { id: legId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "TransportLeg", leg.id, changes);

  revalidatePath("/transport");
  revalidatePath("/dispatch");
  return { leg };
}

export async function deleteTransportLeg(legId: string) {
  const user = await getSessionUser();

  const existing = await prisma.transportLeg.findUnique({ where: { id: legId } });
  if (!existing) {
    return { error: "Transport leg not found" };
  }

  await prisma.transportLeg.delete({
    where: { id: legId },
  });

  await logAudit(user.id, "DELETE", "TransportLeg", legId, {
    mode: existing.mode,
    trackingRef: existing.trackingRef,
  });

  revalidatePath("/transport");
  revalidatePath("/dispatch");
  return { success: true };
}
