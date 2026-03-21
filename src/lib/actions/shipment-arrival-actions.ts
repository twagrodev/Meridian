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

  // Only update fields that are explicitly provided in `data`
  const has = (key: string) => key in data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (has("week")) updateData.week = int(data.week) ?? existing.week;
  if (has("lot")) updateData.lot = int(data.lot) ?? existing.lot;
  if (has("packingDate")) updateData.packingDate = dt(data.packingDate);
  if (has("eta")) updateData.eta = dt(data.eta);
  if (has("etd")) updateData.etd = dt(data.etd);
  if (has("terminal")) updateData.terminal = str(data.terminal);
  if (has("vessel")) updateData.vessel = str(data.vessel);
  if (has("bl")) updateData.bl = str(data.bl);
  if (has("sealNumbers")) updateData.sealNumbers = str(data.sealNumbers);
  if (has("t1")) updateData.t1 = str(data.t1);
  if (has("weighing")) updateData.weighing = str(data.weighing);
  if (has("custReg")) updateData.custReg = str(data.custReg);
  if (has("carrier")) updateData.carrier = str(data.carrier);
  if (has("container")) updateData.container = str(data.container);
  if (has("dateIn")) updateData.dateIn = dt(data.dateIn);
  if (has("dateOut")) updateData.dateOut = dt(data.dateOut);
  if (has("terminalStatus")) updateData.terminalStatus = str(data.terminalStatus);
  if (has("inspType")) updateData.inspType = str(data.inspType);
  if (has("transporter")) updateData.transporter = str(data.transporter);
  if (has("qcInstructions")) updateData.qcInstructions = str(data.qcInstructions);
  if (has("warehouse")) updateData.warehouse = str(data.warehouse);
  if (has("shipper")) updateData.shipper = str(data.shipper);
  if (has("customer")) updateData.customer = str(data.customer);
  if (has("coo")) updateData.coo = str(data.coo);
  if (has("brand")) updateData.brand = str(data.brand);
  if (has("packageType")) updateData.package = str(data.packageType);
  if (has("order")) updateData.order = str(data.order);
  if (has("amount")) updateData.amount = int(data.amount);
  if (has("coi")) updateData.coi = str(data.coi);
  if (has("productDesc")) updateData.productDesc = str(data.productDesc);
  if (has("mrnArn")) updateData.mrnArn = str(data.mrnArn);

  if (Object.keys(updateData).length > 0) {
    await prisma.shipmentArrival.update({
      where: { id },
      data: updateData,
    });
  }

  await logAudit(session.user.id!, "UPDATE", "ShipmentArrival", id, {
    lot: existing.lot,
    fields: Object.keys(updateData),
  });

  revalidatePath("/shipments");
  return { success: true };
}
