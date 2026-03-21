-- CreateTable
CREATE TABLE "ComboSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "carrier" TEXT,
    "docType" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ComboSetting_carrier_docType_key" ON "ComboSetting"("carrier", "docType");
