"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createContainerSchema, updateContainerSchema } from "@/lib/validations/container";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createContainer(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createContainerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const container = await prisma.container.create({
    data: parsed.data,
  });

  await logAudit(user.id, "CREATE", "Container", container.id, {
    containerCode: container.containerCode,
    type: container.type,
    status: container.status,
  });

  revalidatePath("/vessels");
  if (container.vesselId) {
    revalidatePath(`/vessels/${container.vesselId}`);
  }
  return { container };
}

export async function updateContainer(containerId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateContainerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.container.findUnique({ where: { id: containerId } });
  if (!existing || existing.deletedAt) {
    return { error: "Container not found" };
  }

  const container = await prisma.container.update({
    where: { id: containerId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "Container", container.id, changes);

  revalidatePath("/vessels");
  if (container.vesselId) {
    revalidatePath(`/vessels/${container.vesselId}`);
  }
  if (existing.vesselId && existing.vesselId !== container.vesselId) {
    revalidatePath(`/vessels/${existing.vesselId}`);
  }
  return { container };
}

export async function deleteContainer(containerId: string) {
  const user = await getSessionUser();

  const existing = await prisma.container.findUnique({ where: { id: containerId } });
  if (!existing || existing.deletedAt) {
    return { error: "Container not found" };
  }

  await prisma.container.update({
    where: { id: containerId },
    data: { deletedAt: new Date() },
  });

  await logAudit(user.id, "DELETE", "Container", containerId, {
    containerCode: existing.containerCode,
  });

  revalidatePath("/vessels");
  if (existing.vesselId) {
    revalidatePath(`/vessels/${existing.vesselId}`);
  }
  return { success: true };
}
