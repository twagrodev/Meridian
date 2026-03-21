"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createDeclarationSchema, updateDeclarationSchema } from "@/lib/validations/customs";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createDeclaration(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createDeclarationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const declaration = await prisma.customsDeclaration.create({
    data: parsed.data,
  });

  await logAudit(user.id, "CREATE", "CustomsDeclaration", declaration.id, {
    declarationNumber: declaration.declarationNumber,
    status: declaration.status,
  });

  revalidatePath("/customs");
  return { declaration };
}

export async function updateDeclaration(declarationId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateDeclarationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.customsDeclaration.findUnique({ where: { id: declarationId } });
  if (!existing) {
    return { error: "Declaration not found" };
  }

  const declaration = await prisma.customsDeclaration.update({
    where: { id: declarationId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "CustomsDeclaration", declaration.id, changes);

  revalidatePath("/customs");
  revalidatePath(`/customs/${declarationId}`);
  return { declaration };
}

export async function deleteDeclaration(declarationId: string) {
  const user = await getSessionUser();

  const existing = await prisma.customsDeclaration.findUnique({ where: { id: declarationId } });
  if (!existing) {
    return { error: "Declaration not found" };
  }

  await prisma.customsDeclaration.delete({
    where: { id: declarationId },
  });

  await logAudit(user.id, "DELETE", "CustomsDeclaration", declarationId, {
    declarationNumber: existing.declarationNumber,
  });

  revalidatePath("/customs");
  return { success: true };
}
