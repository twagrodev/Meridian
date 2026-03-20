export type UserRole = "OPS_MANAGER" | "LOGISTICS_COORD" | "CUSTOMS_SPEC" | "DOC_CLERK";

export type ShipmentStatus =
  | "DRAFT"
  | "BOOKED"
  | "IN_TRANSIT"
  | "AT_PORT"
  | "CUSTOMS_HOLD"
  | "CUSTOMS_CLEARED"
  | "DELIVERED"
  | "CANCELLED";

export type DocumentType =
  | "BL"
  | "AN"
  | "INV"
  | "FT_INV"
  | "INV_OD"
  | "EUR1"
  | "PL"
  | "QR"
  | "WC"
  | "COI"
  | "OTHER";

export type DocumentStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "CLASSIFIED"
  | "MATCHED"
  | "FAILED"
  | "MANUAL";

export type ContainerType = "REEFER_20" | "REEFER_40" | "DRY_20" | "DRY_40";

export type CustomsStatus =
  | "PENDING"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLEARED"
  | "RELEASED"
  | "REJECTED";

export type QualityGrade = "PREMIUM" | "GRADE_A" | "GRADE_B" | "REJECTED";

export type TransportMode = "SEA" | "ROAD" | "RAIL" | "AIR";

export const RBAC: Record<string, Record<UserRole, "R" | "RW" | null>> = {
  vessels:      { OPS_MANAGER: "RW", LOGISTICS_COORD: "RW", CUSTOMS_SPEC: "R",  DOC_CLERK: "R" },
  dispatch:     { OPS_MANAGER: "RW", LOGISTICS_COORD: "RW", CUSTOMS_SPEC: "R",  DOC_CLERK: "R" },
  customs:      { OPS_MANAGER: "RW", LOGISTICS_COORD: "R",  CUSTOMS_SPEC: "RW", DOC_CLERK: "R" },
  documents:    { OPS_MANAGER: "RW", LOGISTICS_COORD: "R",  CUSTOMS_SPEC: "R",  DOC_CLERK: "RW" },
  quality:      { OPS_MANAGER: "RW", LOGISTICS_COORD: "RW", CUSTOMS_SPEC: "R",  DOC_CLERK: "R" },
  shipments:    { OPS_MANAGER: "RW", LOGISTICS_COORD: "RW", CUSTOMS_SPEC: "R",  DOC_CLERK: "R" },
  transport:    { OPS_MANAGER: "RW", LOGISTICS_COORD: "RW", CUSTOMS_SPEC: "R",  DOC_CLERK: "R" },
  scanner:      { OPS_MANAGER: "RW", LOGISTICS_COORD: "RW", CUSTOMS_SPEC: null, DOC_CLERK: "R" },
  users:        { OPS_MANAGER: "RW", LOGISTICS_COORD: null, CUSTOMS_SPEC: null, DOC_CLERK: null },
};
