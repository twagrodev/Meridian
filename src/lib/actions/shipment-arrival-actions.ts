"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "./audit";

export async function updateShipmentArrival(
  id: string,
  data: Record<string, unknown>,
) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const existing = await prisma.shipmentArrival.findUnique({ where: { id } });
  if (!existing) return { error: "Record not found" };

  const str = (v: unknown): string | null =>
    v != null && v !== "" ? String(v) : null;
  const int = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const dt = (v: unknown): Date | null => {
    if (v == null || v === "") return null;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  };

  await prisma.shipmentArrival.update({
    where: { id },
    data: {
      week: int(data.week) ?? existing.week,
      lot: int(data.lot) ?? existing.lot,
      packingDate: dt(data.packingDate),
      eta: dt(data.eta),
      etd: dt(data.etd),
      terminal: str(data.terminal),
      vessel: str(data.vessel),
      bl: str(data.bl),
      sealNumbers: str(data.sealNumbers),
      t1: str(data.t1),
      weighing: str(data.weighing),
      customsReg: str(data.customsReg),
      carrier: str(data.carrier),
      container: str(data.container),
      dateIn: dt(data.dateIn),
      dateOut: dt(data.dateOut),
      terminalStatus: str(data.terminalStatus),
      scan: str(data.scan),
      transporter: str(data.transporter),
      qcInstructions: str(data.qcInstructions),
      warehouse: str(data.warehouse),
      shipper: str(data.shipper),
      customer: str(data.customer),
      coo: str(data.coo),
      brand: str(data.brand),
      package: str(data.packageType),
      order: str(data.order),
      amount: int(data.amount),
      coi: str(data.coi),
      productDesc: str(data.productDesc),
      mrnArn: str(data.mrnArn),
    },
  });

  await logAudit(session.user.id!, "UPDATE", "ShipmentArrival", id, {
    lot: existing.lot,
  });

  revalidatePath("/shipments");
  return { success: true };
}
