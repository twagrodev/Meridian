"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createShipmentSchema, updateShipmentSchema } from "@/lib/validations/shipment";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createShipment(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createShipmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const shipment = await prisma.shipment.create({
    data: {
      ...parsed.data,
      createdById: user.id,
    },
  });

  await logAudit(user.id, "CREATE", "Shipment", shipment.id, {
    blNumber: shipment.blNumber,
    status: shipment.status,
  });

  revalidatePath("/shipments");
  return { shipment };
}

export async function updateShipment(shipmentId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateShipmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!existing || existing.deletedAt) {
    return { error: "Shipment not found" };
  }

  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "Shipment", shipment.id, changes);

  revalidatePath("/shipments");
  revalidatePath(`/shipments/${shipmentId}`);
  return { shipment };
}

export async function deleteShipment(shipmentId: string) {
  const user = await getSessionUser();

  const existing = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!existing || existing.deletedAt) {
    return { error: "Shipment not found" };
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });

  await logAudit(user.id, "DELETE", "Shipment", shipmentId, {
    blNumber: existing.blNumber,
  });

  revalidatePath("/shipments");
  return { success: true };
}
