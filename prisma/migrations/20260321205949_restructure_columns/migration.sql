/*
  Warnings:

  - You are about to drop the column `customsReg` on the `ShipmentArrival` table. All the data in the column will be lost.
  - You are about to drop the column `customsRegStatus` on the `ShipmentArrival` table. All the data in the column will be lost.
  - You are about to drop the column `scan` on the `ShipmentArrival` table. All the data in the column will be lost.
  - You are about to drop the column `scanStatus` on the `ShipmentArrival` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShipmentArrival" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "week" INTEGER NOT NULL,
    "lot" INTEGER NOT NULL,
    "packingDate" DATETIME,
    "eta" DATETIME,
    "etd" DATETIME,
    "terminal" TEXT,
    "vessel" TEXT,
    "bl" TEXT,
    "sealNumbers" TEXT,
    "t1" TEXT,
    "weighing" TEXT,
    "custReg" TEXT,
    "carrier" TEXT,
    "container" TEXT,
    "dateIn" DATETIME,
    "dateOut" DATETIME,
    "terminalStatus" TEXT,
    "inspType" TEXT,
    "transporter" TEXT,
    "qcInstructions" TEXT,
    "warehouse" TEXT,
    "shipper" TEXT,
    "customer" TEXT,
    "coo" TEXT,
    "brand" TEXT,
    "package" TEXT,
    "order" TEXT,
    "amount" INTEGER,
    "coi" TEXT,
    "productDesc" TEXT,
    "mrnArn" TEXT,
    "t1Status" TEXT NOT NULL DEFAULT 'red',
    "weighingStatus" TEXT NOT NULL DEFAULT 'red',
    "custStatus" TEXT NOT NULL DEFAULT 'red',
    "inspStatus" TEXT NOT NULL DEFAULT 'red',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShipmentArrival" ("amount", "bl", "brand", "carrier", "coi", "container", "coo", "createdAt", "customer", "dateIn", "dateOut", "eta", "etd", "id", "lot", "mrnArn", "order", "package", "packingDate", "productDesc", "qcInstructions", "sealNumbers", "shipper", "t1", "t1Status", "terminal", "terminalStatus", "transporter", "updatedAt", "vessel", "warehouse", "week", "weighing", "weighingStatus") SELECT "amount", "bl", "brand", "carrier", "coi", "container", "coo", "createdAt", "customer", "dateIn", "dateOut", "eta", "etd", "id", "lot", "mrnArn", "order", "package", "packingDate", "productDesc", "qcInstructions", "sealNumbers", "shipper", "t1", "t1Status", "terminal", "terminalStatus", "transporter", "updatedAt", "vessel", "warehouse", "week", "weighing", "weighingStatus" FROM "ShipmentArrival";
DROP TABLE "ShipmentArrival";
ALTER TABLE "new_ShipmentArrival" RENAME TO "ShipmentArrival";
CREATE INDEX "ShipmentArrival_week_idx" ON "ShipmentArrival"("week");
CREATE INDEX "ShipmentArrival_lot_idx" ON "ShipmentArrival"("lot");
CREATE INDEX "ShipmentArrival_bl_idx" ON "ShipmentArrival"("bl");
CREATE INDEX "ShipmentArrival_container_idx" ON "ShipmentArrival"("container");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
