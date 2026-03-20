-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DOC_CLERK',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vessel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "imo" TEXT,
    "flag" TEXT,
    "carrier" TEXT,
    "capacity" INTEGER,
    "currentEta" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "containerCode" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REEFER_40',
    "sealNumber" TEXT,
    "grossWeight" REAL,
    "nettWeight" REAL,
    "tareWeight" REAL,
    "boxes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'EMPTY',
    "vesselId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Container_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Producer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country" TEXT,
    "floId" TEXT,
    "organic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blNumber" TEXT,
    "lotNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "origin" TEXT,
    "destination" TEXT,
    "etd" DATETIME,
    "eta" DATETIME,
    "actualArrival" DATETIME,
    "incoterms" TEXT,
    "notes" TEXT,
    "producerId" TEXT,
    "vesselId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Shipment_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipmentContainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentContainer_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShipmentContainer_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "docType" TEXT,
    "docStatus" TEXT NOT NULL DEFAULT 'UPLOADED',
    "extractedFields" TEXT,
    "ocrText" TEXT,
    "confidence" REAL,
    "shipmentId" TEXT,
    "containerId" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomsDeclaration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "declarationNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME,
    "clearedAt" DATETIME,
    "releasedAt" DATETIME,
    "notes" TEXT,
    "shipmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomsDeclaration_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grade" TEXT,
    "score" REAL,
    "moisture" REAL,
    "pulpTemp" REAL,
    "crownColor" TEXT,
    "defects" TEXT,
    "notes" TEXT,
    "photos" TEXT,
    "containerId" TEXT NOT NULL,
    "inspectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QualityInspection_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QualityInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduledDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "destination" TEXT,
    "notes" TEXT,
    "shipmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DispatchPlan_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportLeg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL DEFAULT 'ROAD',
    "carrier" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "departureTime" DATETIME,
    "arrivalTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "trackingRef" TEXT,
    "dispatchPlanId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransportLeg_dispatchPlanId_fkey" FOREIGN KEY ("dispatchPlanId") REFERENCES "DispatchPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "userId" TEXT,
    "shipmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanType" TEXT NOT NULL DEFAULT 'BARCODE',
    "scannedCode" TEXT NOT NULL,
    "result" TEXT,
    "containerId" TEXT,
    "warehouseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanEvent_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScanEvent_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vessel_imo_key" ON "Vessel"("imo");

-- CreateIndex
CREATE UNIQUE INDEX "Container_containerCode_key" ON "Container"("containerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Producer_code_key" ON "Producer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentContainer_shipmentId_containerId_key" ON "ShipmentContainer"("shipmentId", "containerId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");
