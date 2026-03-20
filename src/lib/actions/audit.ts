"use server";

import { prisma } from "@/lib/db";

export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
  shipmentId?: string
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId,
      shipmentId: shipmentId ?? (entityType === "Shipment" ? entityId : null),
    },
  });
}
