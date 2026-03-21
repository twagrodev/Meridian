import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hashSync } from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Users (4 roles) ────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "ops@agrofair.nl" },
      update: {},
      create: {
        email: "ops@agrofair.nl",
        name: "Maria van den Berg",
        password: hashSync("meridian2026", 12),
        role: "OPS_MANAGER",
      },
    }),
    prisma.user.upsert({
      where: { email: "logistics@agrofair.nl" },
      update: {},
      create: {
        email: "logistics@agrofair.nl",
        name: "Jan de Vries",
        password: hashSync("meridian2026", 12),
        role: "LOGISTICS_COORD",
      },
    }),
    prisma.user.upsert({
      where: { email: "customs@agrofair.nl" },
      update: {},
      create: {
        email: "customs@agrofair.nl",
        name: "Sophie Bakker",
        password: hashSync("meridian2026", 12),
        role: "CUSTOMS_SPEC",
      },
    }),
    prisma.user.upsert({
      where: { email: "docs@agrofair.nl" },
      update: {},
      create: {
        email: "docs@agrofair.nl",
        name: "Tom Jansen",
        password: hashSync("meridian2026", 12),
        role: "DOC_CLERK",
      },
    }),
  ]);

  const [opsUser, logisticsUser, customsUser, docUser] = users;

  // ─── Producers ──────────────────────────────────────────────────────
  const producers = await Promise.all([
    prisma.producer.upsert({
      where: { code: "FRUECO" },
      update: {},
      create: { name: "Fruecodom", code: "FRUECO", country: "Dominican Republic", floId: "FLO-4821" },
    }),
    prisma.producer.upsert({
      where: { code: "APPBOSA" },
      update: {},
      create: { name: "APPBOSA", code: "APPBOSA", country: "Peru", floId: "FLO-2291", organic: true },
    }),
    prisma.producer.upsert({
      where: { code: "AGRICERT" },
      update: {},
      create: { name: "Agricert Dominicana", code: "AGRICERT", country: "Dominican Republic", floId: "FLO-3356" },
    }),
    prisma.producer.upsert({
      where: { code: "ASOGUABO" },
      update: {},
      create: { name: "Asoguabo", code: "ASOGUABO", country: "Ecuador", floId: "FLO-1905", organic: true },
    }),
    prisma.producer.upsert({
      where: { code: "COOPETRABASUR" },
      update: {},
      create: { name: "Coopetrabasur", code: "COOPETRABASUR", country: "Costa Rica", floId: "FLO-5112" },
    }),
  ]);

  // ─── Vessels ────────────────────────────────────────────────────────
  const vessels = await Promise.all([
    prisma.vessel.create({
      data: { name: "MSC JEHAN", imo: "9930789", flag: "Panama", carrier: "MSC", capacity: 2400 },
    }),
    prisma.vessel.create({
      data: { name: "CMA CGM JACQUES JOSEPH", imo: "9839178", flag: "France", carrier: "CMA CGM", capacity: 3100 },
    }),
    prisma.vessel.create({
      data: { name: "MAERSK SENTOSA", imo: "9778838", flag: "Denmark", carrier: "Maersk", capacity: 4500 },
    }),
    prisma.vessel.create({
      data: { name: "HAPAG BERLIN EXPRESS", imo: "9501388", flag: "Germany", carrier: "Hapag-Lloyd", capacity: 2800 },
    }),
    prisma.vessel.create({
      data: { name: "SEATRADE BLUE", imo: "9432156", flag: "Netherlands", carrier: "Seatrade", capacity: 1200 },
    }),
    prisma.vessel.create({
      data: { name: "CROWN MARIS", imo: "9654321", flag: "Bahamas", carrier: "Seatrade", capacity: 900 },
    }),
    prisma.vessel.create({
      data: { name: "COSCO SHIPPING ROSE", imo: "9812345", flag: "China", carrier: "Cosco", capacity: 5200 },
    }),
    prisma.vessel.create({
      data: { name: "MSC ADRIANA", imo: "9956234", flag: "Liberia", carrier: "MSC", capacity: 3800 },
    }),
  ]);

  // ─── Containers ─────────────────────────────────────────────────────
  const containerData = [
    { containerCode: "MSCU1234567", type: "REEFER_40", sealNumber: "ML-SL-876543", grossWeight: 25800, boxes: 1080, vesselId: vessels[0].id },
    { containerCode: "MSCU2345678", type: "REEFER_40", sealNumber: "ML-SL-876544", grossWeight: 26100, boxes: 1100, vesselId: vessels[0].id },
    { containerCode: "CMAU3456789", type: "REEFER_40", sealNumber: "CMA-234567", grossWeight: 24500, boxes: 1020, vesselId: vessels[1].id },
    { containerCode: "CMAU4567890", type: "REEFER_40", sealNumber: "CMA-234568", grossWeight: 25200, boxes: 1060, vesselId: vessels[1].id },
    { containerCode: "MAEU5678901", type: "REEFER_40", sealNumber: "MAE-345678", grossWeight: 27000, boxes: 1140, vesselId: vessels[2].id },
    { containerCode: "MAEU6789012", type: "REEFER_40", sealNumber: "MAE-345679", grossWeight: 26800, boxes: 1120, vesselId: vessels[2].id },
    { containerCode: "HLCU7890123", type: "REEFER_40", sealNumber: "HAP-456789", grossWeight: 25500, boxes: 1070, vesselId: vessels[3].id },
    { containerCode: "HLCU8901234", type: "REEFER_40", sealNumber: "HAP-456790", grossWeight: 24800, boxes: 1040, vesselId: vessels[3].id },
    { containerCode: "STRU9012345", type: "REEFER_40", sealNumber: "STR-567890", grossWeight: 23200, boxes: 960, vesselId: vessels[4].id },
    { containerCode: "STRU0123456", type: "REEFER_40", sealNumber: "STR-567891", grossWeight: 22900, boxes: 950, vesselId: vessels[4].id },
    { containerCode: "CRMU1122334", type: "REEFER_40", sealNumber: "CRM-678901", grossWeight: 21600, boxes: 900, vesselId: vessels[5].id },
    { containerCode: "CSLU2233445", type: "REEFER_40", sealNumber: "CSL-789012", grossWeight: 28000, boxes: 1180, vesselId: vessels[6].id },
    { containerCode: "CSLU3344556", type: "REEFER_40", sealNumber: "CSL-789013", grossWeight: 27500, boxes: 1160, vesselId: vessels[6].id },
    { containerCode: "MSCU4455667", type: "REEFER_40", sealNumber: "ML-SL-876600", grossWeight: 26300, boxes: 1100, vesselId: vessels[7].id },
    { containerCode: "MSCU5566778", type: "REEFER_40", sealNumber: "ML-SL-876601", grossWeight: 25900, boxes: 1085, vesselId: vessels[7].id },
    { containerCode: "MAEU6677889", type: "REEFER_40", sealNumber: "MAE-345700", grossWeight: 24100, boxes: 1010, vesselId: vessels[2].id },
    { containerCode: "CMAU7788990", type: "REEFER_40", sealNumber: "CMA-234600", grossWeight: 25700, boxes: 1075, vesselId: vessels[1].id },
    { containerCode: "HLCU8899001", type: "REEFER_40", sealNumber: "HAP-456800", grossWeight: 26400, boxes: 1105, vesselId: vessels[3].id },
    { containerCode: "STRU9900112", type: "REEFER_40", sealNumber: "STR-567900", grossWeight: 22500, boxes: 940, vesselId: vessels[4].id },
    { containerCode: "MSCU0011223", type: "REEFER_40", sealNumber: "ML-SL-876700", grossWeight: 27200, boxes: 1145, vesselId: vessels[0].id },
  ];

  const containers = await Promise.all(
    containerData.map((c) => prisma.container.create({ data: c }))
  );

  // ─── Shipments ──────────────────────────────────────────────────────
  const statuses = [
    "DRAFT", "BOOKED", "IN_TRANSIT", "IN_TRANSIT", "IN_TRANSIT",
    "AT_PORT", "AT_PORT", "CUSTOMS_HOLD", "CUSTOMS_HOLD",
    "CUSTOMS_CLEARED", "CUSTOMS_CLEARED", "DELIVERED", "DELIVERED",
    "DELIVERED", "DELIVERED", "IN_TRANSIT", "BOOKED", "AT_PORT",
    "CUSTOMS_CLEARED", "DRAFT", "IN_TRANSIT", "DELIVERED", "CANCELLED",
    "IN_TRANSIT", "AT_PORT",
  ];

  const origins = [
    "Santo Domingo, DR", "Callao, Peru", "Guayaquil, Ecuador",
    "Puerto Limon, Costa Rica", "Santa Marta, Colombia",
  ];

  const shipments = [];
  for (let i = 0; i < 25; i++) {
    const producer = producers[i % producers.length];
    const vessel = vessels[i % vessels.length];
    const etd = new Date(2026, 2, 1 + i);
    const eta = new Date(etd.getTime() + 14 * 24 * 60 * 60 * 1000);

    const shipment = await prisma.shipment.create({
      data: {
        blNumber: `BL${String(2026000 + i).padStart(7, "0")}`,
        lotNumber: `LOT-${String(i + 1).padStart(4, "0")}`,
        status: statuses[i],
        origin: origins[i % origins.length],
        destination: "Rotterdam, Netherlands",
        etd,
        eta,
        actualArrival: statuses[i] === "DELIVERED" ? new Date(eta.getTime() + (Math.random() * 3 - 1) * 24 * 60 * 60 * 1000) : null,
        producerId: producer.id,
        vesselId: vessel.id,
        createdById: opsUser.id,
      },
    });

    shipments.push(shipment);

    // Link 1-2 containers per shipment
    const containerIndex = i % containers.length;
    await prisma.shipmentContainer.create({
      data: { shipmentId: shipment.id, containerId: containers[containerIndex].id },
    });
    if (i % 3 === 0 && containerIndex + 1 < containers.length) {
      await prisma.shipmentContainer.create({
        data: { shipmentId: shipment.id, containerId: containers[containerIndex + 1].id },
      });
    }
  }

  // ─── Warehouses ─────────────────────────────────────────────────────
  await Promise.all([
    prisma.warehouse.create({ data: { name: "AgroFair Barendrecht", code: "WH-BAR", location: "Barendrecht, NL", capacity: 5000 } }),
    prisma.warehouse.create({ data: { name: "Rotterdam Port Facility", code: "WH-RTM", location: "Rotterdam, NL", capacity: 12000 } }),
  ]);

  // ─── Customs Declarations ───────────────────────────────────────────
  const customsStatuses = ["PENDING", "SUBMITTED", "UNDER_REVIEW", "CLEARED", "RELEASED", "REJECTED"];
  const declarations = [];
  for (let i = 0; i < 15; i++) {
    const status = customsStatuses[i % customsStatuses.length];
    const submitted = new Date(2026, 2, 5 + i);
    const decl = await prisma.customsDeclaration.create({
      data: {
        declarationNumber: `NL-CUS-2026-${String(i + 1).padStart(4, "0")}`,
        status,
        submittedAt: status !== "PENDING" ? submitted : null,
        clearedAt: ["CLEARED", "RELEASED"].includes(status) ? new Date(submitted.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
        releasedAt: status === "RELEASED" ? new Date(submitted.getTime() + 5 * 24 * 60 * 60 * 1000) : null,
        notes: i % 4 === 0 ? "Phytosanitary certificate required" : null,
        shipmentId: shipments[i % shipments.length].id,
      },
    });
    declarations.push(decl);
  }

  // ─── Quality Inspections ──────────────────────────────────────────
  const grades = ["PREMIUM", "GRADE_A", "GRADE_A", "GRADE_B", "PREMIUM", "REJECTED"];
  const crownColors = ["Green", "Yellow-Green", "Yellow", "Brown-Green", "Green"];
  const inspections = [];
  for (let i = 0; i < 18; i++) {
    const grade = grades[i % grades.length];
    const inspection = await prisma.qualityInspection.create({
      data: {
        grade,
        score: grade === "PREMIUM" ? 90 + Math.floor(Math.random() * 10) : grade === "GRADE_A" ? 75 + Math.floor(Math.random() * 15) : grade === "GRADE_B" ? 60 + Math.floor(Math.random() * 15) : 30 + Math.floor(Math.random() * 20),
        moisture: 12 + Math.random() * 4,
        pulpTemp: 13 + Math.random() * 3,
        crownColor: crownColors[i % crownColors.length],
        defects: i % 5 === 0 ? JSON.stringify(["minor bruising", "slight discoloration"]) : null,
        notes: i % 3 === 0 ? "Standard inspection completed" : null,
        containerId: containers[i % containers.length].id,
        inspectorId: logisticsUser.id,
      },
    });
    inspections.push(inspection);
  }

  // ─── Dispatch Plans ───────────────────────────────────────────────
  const dispatchStatuses = ["PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const dispatchDestinations = ["AgroFair Barendrecht", "Albert Heijn DC Zaandam", "Jumbo DC Veghel", "Lidl DC Heerenveen", "PLUS DC Haaksbergen"];
  const plans = [];
  for (let i = 0; i < 12; i++) {
    const plan = await prisma.dispatchPlan.create({
      data: {
        scheduledDate: new Date(2026, 2, 15 + i),
        status: dispatchStatuses[i % dispatchStatuses.length],
        destination: dispatchDestinations[i % dispatchDestinations.length],
        notes: i % 3 === 0 ? "Temperature controlled transport required" : null,
        shipmentId: shipments[i % shipments.length].id,
      },
    });
    plans.push(plan);
  }

  // ─── Transport Legs ───────────────────────────────────────────────
  const modes = ["SEA", "ROAD", "ROAD", "RAIL"];
  const legStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "COMPLETED"];
  for (let i = 0; i < plans.length; i++) {
    await prisma.transportLeg.create({
      data: {
        mode: "SEA",
        carrier: ["MSC", "CMA CGM", "Maersk", "Seatrade"][i % 4],
        origin: origins[i % origins.length],
        destination: "Rotterdam, Netherlands",
        departureTime: new Date(2026, 2, 1 + i),
        arrivalTime: new Date(2026, 2, 15 + i),
        status: legStatuses[i % legStatuses.length],
        trackingRef: `TRK-SEA-${String(i + 1).padStart(4, "0")}`,
        dispatchPlanId: plans[i].id,
      },
    });
    await prisma.transportLeg.create({
      data: {
        mode: modes[i % modes.length] === "SEA" ? "ROAD" : modes[i % modes.length],
        carrier: ["Van den Bosch", "Kuehne Nagel", "DHL Freight", "DB Schenker"][i % 4],
        origin: "Rotterdam, Netherlands",
        destination: dispatchDestinations[i % dispatchDestinations.length],
        departureTime: new Date(2026, 2, 16 + i),
        arrivalTime: new Date(2026, 2, 16 + i, 14 + (i % 6)),
        status: i < 6 ? "COMPLETED" : "PLANNED",
        trackingRef: `TRK-RD-${String(i + 1).padStart(4, "0")}`,
        dispatchPlanId: plans[i].id,
      },
    });
  }

  // ─── Documents ────────────────────────────────────────────────────
  const docTypes = ["BL", "AN", "INV", "FT_INV", "PL", "WC", "COI", "EUR1"];
  const docStatuses = ["UPLOADED", "CLASSIFIED", "MATCHED", "MATCHED", "CLASSIFIED", "PROCESSING", "FAILED", "MANUAL"];
  for (let i = 0; i < 20; i++) {
    const docType = docTypes[i % docTypes.length];
    await prisma.document.create({
      data: {
        fileName: `${docType.toLowerCase()}_${String(i + 1).padStart(3, "0")}.pdf`,
        originalName: `${docType.toLowerCase()}_shipment_${(i % shipments.length) + 1}.pdf`,
        mimeType: "application/pdf",
        fileSize: 50000 + Math.floor(Math.random() * 500000),
        docType,
        docStatus: docStatuses[i % docStatuses.length],
        confidence: docStatuses[i % docStatuses.length] === "MATCHED" ? 0.85 + Math.random() * 0.15 : docStatuses[i % docStatuses.length] === "CLASSIFIED" ? 0.6 + Math.random() * 0.25 : null,
        extractedFields: ["MATCHED", "CLASSIFIED"].includes(docStatuses[i % docStatuses.length]) ? JSON.stringify({ bl_number: `BL${2026000 + i}`, vessel: vessels[i % vessels.length].name }) : null,
        shipmentId: shipments[i % shipments.length].id,
        containerId: containers[i % containers.length].id,
        uploadedById: docUser.id,
      },
    });
  }

  // ─── Scan Events ──────────────────────────────────────────────────
  const warehouses = await prisma.warehouse.findMany();
  for (let i = 0; i < 30; i++) {
    const container = containers[i % containers.length];
    await prisma.scanEvent.create({
      data: {
        scanType: i % 5 === 0 ? "QR" : "BARCODE",
        scannedCode: container.containerCode,
        result: JSON.stringify({ matched: true, containerCode: container.containerCode }),
        containerId: container.id,
        warehouseId: warehouses[i % warehouses.length].id,
      },
    });
  }

  // ─── Sample Audit Logs ──────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    await prisma.auditLog.create({
      data: {
        action: i % 2 === 0 ? "CREATE" : "UPDATE",
        entityType: "Shipment",
        entityId: shipments[i % shipments.length].id,
        shipmentId: shipments[i % shipments.length].id,
        userId: users[i % users.length].id,
        metadata: JSON.stringify({ field: "status", from: "DRAFT", to: statuses[i % statuses.length] }),
      },
    });
  }

  console.log(`Seeded: ${users.length} users, ${producers.length} producers, ${vessels.length} vessels, ${containers.length} containers, ${shipments.length} shipments, ${declarations.length} customs declarations, ${inspections.length} inspections, ${plans.length} dispatch plans, 20 documents, 30 scan events`);

  // ─── ShipmentArrivals (wk13 spreadsheet data) ─────────────────────
  await prisma.shipmentArrival.deleteMany();

  const { readFileSync } = await import("fs");
  const { join } = await import("path");
  const rawData = JSON.parse(
    readFileSync(join(__dirname, "seed-data/shipments_wk13.json"), "utf-8")
  ) as Array<Record<string, unknown>>;

  const str = (v: unknown): string | null => (v != null ? String(v) : null);
  const dt = (v: unknown): Date | null => (v != null ? new Date(String(v)) : null);
  const int = (v: unknown): number | null => (v != null ? Number(v) : null);

  for (const row of rawData) {
    await prisma.shipmentArrival.create({
      data: {
        week: Number(row["Week"]),
        lot: Number(row["Lot"]),
        packingDate: dt(row["Packing date"]),
        eta: dt(row["ETA"]),
        etd: dt(row["ETD"]),
        terminal: str(row["Terminal"]),
        vessel: str(row["Vessel"]),
        bl: str(row["BL"]),
        sealNumbers: str(row["Seal number(s)"]),
        t1: str(row["T1"]),
        weighing: str(row["Weighing"]),
        customsReg: str(row["Customs_reg"]),
        carrier: str(row["Carrier"]),
        container: str(row["Container"]),
        dateIn: dt(row["Date_in"]),
        dateOut: dt(row["Date_out"]),
        terminalStatus: str(row["Terminal_status"]),
        scan: str(row["Scan"]),
        transporter: str(row["Transporter"]),
        qcInstructions: str(row["QC instructions"]),
        warehouse: str(row["Warehouse"]),
        shipper: str(row["Shipper"]),
        customer: str(row["Customer"]),
        coo: str(row["CoO"]),
        brand: str(row["Brand"]),
        package: str(row["Package"]),
        order: str(row["Order"]),
        amount: int(row["Amount"]),
        coi: str(row["COI"]),
        productDesc: str(row["Product_desc"]),
        mrnArn: str(row["MRN/ARN"]),
      },
    });
  }
  console.log(`Seeded: ${rawData.length} shipment arrivals`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
