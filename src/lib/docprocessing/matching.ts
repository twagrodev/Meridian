/**
 * Shipment matching service — matches documents to Shipment records via Prisma.
 * Ported from AgroDash/Modules/DocManager/services/matching.py
 *
 * Priority: BL number > lot > container > invoice number
 * Uses Prisma queries against real database (replaces AgroDash's mock DB).
 */

import { prisma } from "@/lib/db";

export interface MatchResult {
  matched: boolean;
  shipmentId: string | null;
  containerId: string | null;
  matchedBy: string;
  reason: string;
}

/**
 * Attempt to match extracted data to an existing shipment.
 * Tries in priority order: BL number > lot > container > invoice number.
 */
export async function tryMatchShipment(
  tags: Record<string, string | null>,
  fields: Record<string, unknown>,
): Promise<MatchResult> {
  const blNumber = (fields.bl_number as string) ?? tags.bl_number ?? null;
  const lot = tags.lot ?? (fields.lot as string) ?? null;
  const container = tags.container ?? (fields.container_number as string) ?? null;
  const invoiceNumber = (fields.invoice_number as string) ?? null;

  // 1. Match by BL number
  if (blNumber) {
    const shipment = await prisma.shipment.findFirst({
      where: { blNumber, deletedAt: null },
      select: { id: true },
    });
    if (shipment) {
      const containerId = container ? await findContainerId(container) : null;
      return {
        matched: true,
        shipmentId: shipment.id,
        containerId,
        matchedBy: "bl_number",
        reason: "",
      };
    }
  }

  // 2. Match by lot number
  if (lot) {
    const shipment = await prisma.shipment.findFirst({
      where: { lotNumber: lot, deletedAt: null },
      select: { id: true },
    });
    if (shipment) {
      const containerId = container ? await findContainerId(container) : null;
      return {
        matched: true,
        shipmentId: shipment.id,
        containerId,
        matchedBy: "lot",
        reason: "",
      };
    }
  }

  // 3. Match by container number
  if (container) {
    const containerRecord = await prisma.container.findFirst({
      where: { containerCode: container, deletedAt: null },
      include: {
        shipmentContainers: {
          include: { shipment: { select: { id: true, deletedAt: true } } },
          take: 1,
        },
      },
    });
    if (containerRecord?.shipmentContainers[0]?.shipment) {
      const shipment = containerRecord.shipmentContainers[0].shipment;
      if (!shipment.deletedAt) {
        return {
          matched: true,
          shipmentId: shipment.id,
          containerId: containerRecord.id,
          matchedBy: "container",
          reason: "",
        };
      }
    }
  }

  // 4. Match by invoice number — search in Document records for an already-matched invoice
  if (invoiceNumber) {
    const existingDoc = await prisma.document.findFirst({
      where: {
        docType: { in: ["INV", "FT-INV", "INV-OD"] },
        shipmentId: { not: null },
        deletedAt: null,
        extractedFields: { contains: invoiceNumber },
      },
      select: { shipmentId: true },
    });
    if (existingDoc?.shipmentId) {
      const containerId = container ? await findContainerId(container) : null;
      return {
        matched: true,
        shipmentId: existingDoc.shipmentId,
        containerId,
        matchedBy: "invoice_number",
        reason: "",
      };
    }
  }

  // No match — build reason
  const attempted: string[] = [];
  if (blNumber) attempted.push(`bl_number=${blNumber}`);
  if (lot) attempted.push(`lot=${lot}`);
  if (container) attempted.push(`container=${container}`);
  if (invoiceNumber) attempted.push(`invoice_number=${invoiceNumber}`);

  const reason = attempted.length > 0
    ? `No shipment found for: ${attempted.join(", ")}`
    : "No matchable identifiers extracted from document";

  const containerId = container ? await findContainerId(container) : null;
  return { matched: false, shipmentId: null, containerId, matchedBy: "", reason };
}

async function findContainerId(containerCode: string): Promise<string | null> {
  const container = await prisma.container.findFirst({
    where: { containerCode, deletedAt: null },
    select: { id: true },
  });
  return container?.id ?? null;
}
