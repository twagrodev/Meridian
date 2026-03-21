/**
 * Data access layer for ShipmentArrival records.
 * Currently reads from Prisma/SQLite — designed to swap to Google Sheets API later.
 * The UI consumes ShipmentRow[] and doesn't care about the data source.
 */

import { prisma } from "@/lib/db";

export interface ShipmentRow {
  id: string;
  week: number;
  lot: number;
  packingDate: string | null;
  eta: string | null;
  etd: string | null;
  terminal: string | null;
  vessel: string | null;
  bl: string | null;
  sealNumbers: string | null;
  t1: string | null;
  weighing: string | null;
  custReg: string | null;
  carrier: string | null;
  container: string | null;
  dateIn: string | null;
  dateInDay: string | null;   // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  dateOut: string | null;
  terminalStatus: string | null;
  inspType: string | null;
  transporter: string | null;
  qcInstructions: string | null;
  warehouse: string | null;
  shipper: string | null;
  customer: string | null;
  coo: string | null;
  brand: string | null;
  packageType: string | null;
  order: string | null;
  amount: number | null;
  coi: string | null;
  productDesc: string | null;
  mrnArn: string | null;
  t1Status: string;
  weighingStatus: string;
  custStatus: string;
  inspStatus: string;
}

function fmtDateTime(d: Date | null): string | null {
  if (!d) return null;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}-${month} ${hours}:${mins}`;
}

function fmtDate(d: Date | null): string | null {
  if (!d) return null;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}-${month}`;
}

export async function getShipmentArrivals(weekNumber?: number): Promise<ShipmentRow[]> {
  const arrivals = await prisma.shipmentArrival.findMany({
    where: weekNumber ? { week: weekNumber } : undefined,
    orderBy: [
      { week: "asc" },
      { eta: "asc" },
      { vessel: "asc" },
      { lot: "asc" },
    ],
  });

  return arrivals.map((a) => ({
    id: a.id,
    week: a.week,
    lot: a.lot,
    packingDate: fmtDate(a.packingDate),
    eta: fmtDateTime(a.eta),
    etd: fmtDateTime(a.etd),
    terminal: a.terminal,
    vessel: a.vessel,
    bl: a.bl,
    sealNumbers: a.sealNumbers,
    t1: a.t1,
    weighing: a.weighing,
    custReg: a.custReg,
    carrier: a.carrier,
    container: a.container,
    dateIn: fmtDate(a.dateIn),
    dateInDay: a.dateIn ? (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][a.dateIn.getUTCDay()]) : null,
    dateOut: fmtDate(a.dateOut),
    terminalStatus: a.terminalStatus,
    inspType: a.inspType,
    transporter: a.transporter,
    qcInstructions: a.qcInstructions,
    warehouse: a.warehouse,
    shipper: a.shipper,
    customer: a.customer,
    coo: a.coo,
    brand: a.brand,
    packageType: a.package,
    order: a.order,
    amount: a.amount,
    coi: a.coi,
    productDesc: a.productDesc,
    mrnArn: a.mrnArn,
    t1Status: a.t1Status,
    weighingStatus: a.weighingStatus,
    custStatus: a.custStatus,
    inspStatus: a.inspStatus,
  }));
}

export async function getAvailableWeeks(): Promise<number[]> {
  const results = await prisma.shipmentArrival.findMany({
    select: { week: true },
    distinct: ["week"],
    orderBy: { week: "asc" },
  });
  return results.map((r) => r.week);
}
