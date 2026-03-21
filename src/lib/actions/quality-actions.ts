"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createInspectionSchema, updateInspectionSchema } from "@/lib/validations/quality";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createInspection(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createInspectionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const inspection = await prisma.qualityInspection.create({
    data: {
      ...parsed.data,
      inspectorId: user.id,
    },
  });

  await logAudit(user.id, "CREATE", "QualityInspection", inspection.id, {
    grade: inspection.grade,
    containerId: inspection.containerId,
  });

  revalidatePath("/quality");
  return { inspection };
}

export async function updateInspection(inspectionId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateInspectionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.qualityInspection.findUnique({ where: { id: inspectionId } });
  if (!existing) {
    return { error: "Inspection not found" };
  }

  const inspection = await prisma.qualityInspection.update({
    where: { id: inspectionId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "QualityInspection", inspection.id, changes);

  revalidatePath("/quality");
  revalidatePath(`/quality/${inspectionId}`);
  return { inspection };
}

export async function deleteInspection(inspectionId: string) {
  const user = await getSessionUser();

  const existing = await prisma.qualityInspection.findUnique({ where: { id: inspectionId } });
  if (!existing) {
    return { error: "Inspection not found" };
  }

  await prisma.qualityInspection.delete({
    where: { id: inspectionId },
  });

  await logAudit(user.id, "DELETE", "QualityInspection", inspectionId, {
    grade: existing.grade,
    containerId: existing.containerId,
  });

  revalidatePath("/quality");
  return { success: true };
}
