"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { createScanEventSchema } from "@/lib/validations/scanner";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createScanEvent(formData: FormData) {
  const user = await getSessionUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createScanEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  // Try to match scannedCode against existing container codes
  let matchedContainerId = parsed.data.containerId ?? null;
  let matchedContainerCode: string | null = null;

  if (!matchedContainerId) {
    const container = await prisma.container.findUnique({
      where: { containerCode: parsed.data.scannedCode },
      select: { id: true, containerCode: true },
    });
    if (container) {
      matchedContainerId = container.id;
      matchedContainerCode = container.containerCode;
    }
  }

  const result = matchedContainerCode
    ? JSON.stringify({ matched: true, containerCode: matchedContainerCode })
    : JSON.stringify({ matched: false });

  const scanEvent = await prisma.scanEvent.create({
    data: {
      scanType: parsed.data.scanType,
      scannedCode: parsed.data.scannedCode,
      result,
      containerId: matchedContainerId,
      warehouseId: parsed.data.warehouseId || null,
    },
  });

  await logAudit(user.id, "CREATE", "ScanEvent", scanEvent.id, {
    scanType: scanEvent.scanType,
    scannedCode: scanEvent.scannedCode,
    matched: !!matchedContainerId,
  });

  revalidatePath("/scanner");
  return { scanEvent };
}
