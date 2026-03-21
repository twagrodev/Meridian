"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validations/document";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createDocument(formData: FormData) {
  const user = await getSessionUser();

  const file = formData.get("file") as File | null;
  const raw = Object.fromEntries(formData.entries());

  // If a real file is uploaded, use its name as originalName fallback
  if (file && file.size > 0 && !raw.originalName) {
    raw.originalName = file.name;
  }

  // Generate a safe fileName from the originalName if not provided
  if (!raw.fileName) {
    const originalName = raw.originalName as string;
    const timestamp = Date.now();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    raw.fileName = `${timestamp}_${safeName}`;
  }

  // Set file metadata from actual file
  if (file && file.size > 0) {
    raw.mimeType = file.type;
    raw.fileSize = String(file.size);
  }

  // Remove the File object before schema parsing
  delete raw.file;

  const parsed = createDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  // Write file to disk if present
  if (file && file.size > 0) {
    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadsDir, parsed.data.fileName), buffer);
  }

  // Filter out empty string optional fields
  const data: Record<string, unknown> = { ...parsed.data };
  if (!data.shipmentId) delete data.shipmentId;
  if (!data.containerId) delete data.containerId;
  if (!data.docType) delete data.docType;

  const document = await prisma.document.create({
    data: {
      ...data,
      uploadedById: user.id,
    } as Parameters<typeof prisma.document.create>[0]["data"],
  });

  await logAudit(user.id, "CREATE", "Document", document.id, {
    originalName: document.originalName,
    docType: document.docType,
    docStatus: document.docStatus,
  });

  revalidatePath("/documents");
  return { document };
}

export async function updateDocument(documentId: string, formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const existing = await prisma.document.findUnique({ where: { id: documentId } });
  if (!existing || existing.deletedAt) {
    return { error: "Document not found" };
  }

  const document = await prisma.document.update({
    where: { id: documentId },
    data: parsed.data,
  });

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (String(oldVal) !== String(value)) {
      changes[key] = { from: oldVal, to: value };
    }
  }

  await logAudit(user.id, "UPDATE", "Document", document.id, changes);

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  return { document };
}

export async function deleteDocument(documentId: string) {
  const user = await getSessionUser();

  const existing = await prisma.document.findUnique({ where: { id: documentId } });
  if (!existing || existing.deletedAt) {
    return { error: "Document not found" };
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date(), docStatus: "FAILED" },
  });

  await logAudit(user.id, "DELETE", "Document", documentId, {
    originalName: existing.originalName,
  });

  revalidatePath("/documents");
  return { success: true };
}
