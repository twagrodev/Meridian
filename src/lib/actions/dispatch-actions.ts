"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createDispatchPlanSchema, updateDispatchPlanSchema } from "@/lib/validations/dispatch";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createDispatchPlan(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createDispatchPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const plan = await prisma.dispatchPlan.create({
    data: parsed.data,
  });

  await logAudit(user.id, "CREATE", "DispatchPlan", plan.id, {
    destination: plan.destination,
    status: plan.status,
  });

  revalidatePath("/dispatch");
  return { plan };
}

export async function updateDispatchPlan(planId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateDispatchPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.dispatchPlan.findUnique({ where: { id: planId } });
  if (!existing) {
    return { error: "Dispatch plan not found" };
  }

  const plan = await prisma.dispatchPlan.update({
    where: { id: planId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "DispatchPlan", plan.id, changes);

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${planId}`);
  return { plan };
}

export async function deleteDispatchPlan(planId: string) {
  const user = await getSessionUser();

  const existing = await prisma.dispatchPlan.findUnique({ where: { id: planId } });
  if (!existing) {
    return { error: "Dispatch plan not found" };
  }

  await prisma.dispatchPlan.delete({
    where: { id: planId },
  });

  await logAudit(user.id, "DELETE", "DispatchPlan", planId, {
    destination: existing.destination,
  });

  revalidatePath("/dispatch");
  return { success: true };
}
