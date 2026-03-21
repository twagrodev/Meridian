"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "./audit";

export async function getComboSettings() {
  return prisma.comboSetting.findMany({
    orderBy: [{ docType: "asc" }, { carrier: "asc" }],
  });
}

export async function upsertComboSetting(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const carrier = (formData.get("carrier") as string) || null;
  const docType = formData.get("docType") as string;
  const fields = formData.get("fields") as string; // comma-separated
  const active = formData.get("active") === "true";

  if (!name || !docType) {
    return { error: "Name and document type are required" };
  }

  const fieldsArray = fields
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const data = {
    name,
    carrier,
    docType,
    fields: JSON.stringify(fieldsArray),
    active,
  };

  if (id) {
    await prisma.comboSetting.update({ where: { id }, data });
    await logAudit(session.user.id!, "UPDATE", "ComboSetting", id, { name, docType });
  } else {
    const combo = await prisma.comboSetting.create({ data });
    await logAudit(session.user.id!, "CREATE", "ComboSetting", combo.id, { name, docType });
  }

  revalidatePath("/documents/settings");
  return { success: true };
}

export async function deleteComboSetting(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  await prisma.comboSetting.delete({ where: { id } });
  await logAudit(session.user.id!, "DELETE", "ComboSetting", id, {});

  revalidatePath("/documents/settings");
  return { success: true };
}
