-- CreateTable
CREATE TABLE "ShipmentArrival" (
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
    "customsReg" TEXT,
    "carrier" TEXT,
    "container" TEXT,
    "dateIn" DATETIME,
    "dateOut" DATETIME,
    "terminalStatus" TEXT,
    "scan" TEXT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ShipmentArrival_week_idx" ON "ShipmentArrival"("week");

-- CreateIndex
CREATE INDEX "ShipmentArrival_lot_idx" ON "ShipmentArrival"("lot");

-- CreateIndex
CREATE INDEX "ShipmentArrival_bl_idx" ON "ShipmentArrival"("bl");

-- CreateIndex
CREATE INDEX "ShipmentArrival_container_idx" ON "ShipmentArrival"("container");
