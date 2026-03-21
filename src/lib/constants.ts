// ─── Document Types (ported from AgroDash config.py) ───────────────────

export const DOC_TYPES = {
  "Bill of Lading": "BL",
  "Arrival Notice": "AN",
  "Invoice": "INV",
  "FairTrade Invoice": "FT-INV",
  "Invoice with Origin Declaration": "INV-OD",
  "EUR1": "EUR1",
  "Packing List": "PL",
  "Quality Report": "QR",
  "Weighing Certificate": "WC",
  "Certificate of Inspection": "COI",
  "Other": "DOC",
} as const;

export type DocTypeKey = keyof typeof DOC_TYPES;
export type DocTypeCode = (typeof DOC_TYPES)[DocTypeKey];

// ─── Extraction Fields (ported from AgroDash config.py) ────────────────

export const EXTRACTION_FIELDS: Record<string, string[]> = {
  "Bill of Lading": [
    "bl_number", "vessel", "port_of_loading", "port_of_discharge",
    "container_number", "seal_number", "shipper", "consignee",
    "gross_weight", "nett_weight",
  ],
  "Invoice": [
    "invoice_number", "invoice_date", "invoice_amount", "currency",
    "payment_terms", "lot", "producer",
  ],
  "FairTrade Invoice": [
    "invoice_number", "invoice_date", "invoice_amount", "currency",
    "fairtrade_premium", "flo_id", "lot", "producer",
  ],
  "Invoice with Origin Declaration": [
    "invoice_number", "invoice_date", "invoice_amount", "currency",
    "authorized_exporter_code", "lot", "producer",
  ],
  "EUR1": [
    "exporter", "consignee", "country_of_origin", "authorized_exporter_code",
  ],
  "Arrival Notice": [
    "bl_number", "vessel", "eta", "container_number",
  ],
  "Packing List": [
    "lot", "gross_weight", "nett_weight", "number_of_packages",
    "container_number",
  ],
  "Quality Report": [
    "lot", "grade", "moisture", "screen_size", "defects", "cup_score",
  ],
  "Weighing Certificate": [
    "container_number", "gross_weight", "nett_weight",
  ],
  "Certificate of Inspection": [
    "container_number", "lot", "country_of_origin",
  ],
};

// ─── Carriers ──────────────────────────────────────────────────────────

export const CARRIERS = [
  "MSC",
  "CMA CGM",
  "Maersk",
  "Hapag-Lloyd",
  "Cosco",
  "Seatrade",
  "SBD",
] as const;

// ─── Shipment Status ───────────────────────────────────────────────────

export const SHIPMENT_STATUSES = [
  "DRAFT",
  "BOOKED",
  "IN_TRANSIT",
  "AT_PORT",
  "CUSTOMS_HOLD",
  "CUSTOMS_CLEARED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const SHIPMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  DRAFT: { label: "Draft", color: "text-gray-700", bgColor: "bg-gray-100" },
  BOOKED: { label: "Booked", color: "text-blue-700", bgColor: "bg-blue-100" },
  IN_TRANSIT: { label: "In Transit", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  AT_PORT: { label: "At Port", color: "text-orange-700", bgColor: "bg-orange-100" },
  CUSTOMS_HOLD: { label: "Customs Hold", color: "text-red-700", bgColor: "bg-red-100" },
  CUSTOMS_CLEARED: { label: "Customs Cleared", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  DELIVERED: { label: "Delivered", color: "text-green-700", bgColor: "bg-green-100" },
  CANCELLED: { label: "Cancelled", color: "text-gray-500", bgColor: "bg-gray-50" },
};

// ─── Container Status ─────────────────────────────────────────────────

export const CONTAINER_STATUSES = [
  "EMPTY", "LOADING", "LOADED", "IN_TRANSIT", "AT_PORT", "DELIVERED",
] as const;

export const CONTAINER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  EMPTY: { label: "Empty", color: "text-gray-700", bgColor: "bg-gray-100" },
  LOADING: { label: "Loading", color: "text-blue-700", bgColor: "bg-blue-100" },
  LOADED: { label: "Loaded", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  IN_TRANSIT: { label: "In Transit", color: "text-purple-700", bgColor: "bg-purple-100" },
  AT_PORT: { label: "At Port", color: "text-orange-700", bgColor: "bg-orange-100" },
  DELIVERED: { label: "Delivered", color: "text-green-700", bgColor: "bg-green-100" },
};

// ─── Container Types ──────────────────────────────────────────────────

export const CONTAINER_TYPES = [
  "REEFER_20", "REEFER_40", "DRY_20", "DRY_40",
] as const;

export const CONTAINER_TYPE_LABELS: Record<string, string> = {
  REEFER_20: "20' Reefer",
  REEFER_40: "40' Reefer",
  DRY_20: "20' Dry",
  DRY_40: "40' Dry",
};

// ─── Document Status ──────────────────────────────────────────────────

export const DOCUMENT_STATUSES = [
  "UPLOADED", "PROCESSING", "CLASSIFIED", "MATCHED", "FAILED", "MANUAL",
] as const;

export const DOCUMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  UPLOADED: { label: "Uploaded", color: "text-blue-700", bgColor: "bg-blue-100" },
  PROCESSING: { label: "Processing", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  CLASSIFIED: { label: "Classified", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  MATCHED: { label: "Matched", color: "text-green-700", bgColor: "bg-green-100" },
  FAILED: { label: "Failed", color: "text-red-700", bgColor: "bg-red-100" },
  MANUAL: { label: "Manual Review", color: "text-orange-700", bgColor: "bg-orange-100" },
};

// ─── Customs Status ───────────────────────────────────────────────────

export const CUSTOMS_STATUSES = [
  "PENDING", "SUBMITTED", "UNDER_REVIEW", "CLEARED", "RELEASED", "REJECTED",
] as const;

export const CUSTOMS_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: { label: "Pending", color: "text-gray-700", bgColor: "bg-gray-100" },
  SUBMITTED: { label: "Submitted", color: "text-blue-700", bgColor: "bg-blue-100" },
  UNDER_REVIEW: { label: "Under Review", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  CLEARED: { label: "Cleared", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  RELEASED: { label: "Released", color: "text-green-700", bgColor: "bg-green-100" },
  REJECTED: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100" },
};

// ─── Quality Grades ───────────────────────────────────────────────────

export const QUALITY_GRADES = [
  "PREMIUM", "GRADE_A", "GRADE_B", "REJECTED",
] as const;

export const QUALITY_GRADE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PREMIUM: { label: "Premium", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  GRADE_A: { label: "Grade A", color: "text-green-700", bgColor: "bg-green-100" },
  GRADE_B: { label: "Grade B", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  REJECTED: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100" },
};

// ─── Dispatch Status ──────────────────────────────────────────────────

export const DISPATCH_STATUSES = [
  "PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED",
] as const;

export const DISPATCH_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PLANNED: { label: "Planned", color: "text-gray-700", bgColor: "bg-gray-100" },
  CONFIRMED: { label: "Confirmed", color: "text-blue-700", bgColor: "bg-blue-100" },
  IN_PROGRESS: { label: "In Progress", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  COMPLETED: { label: "Completed", color: "text-green-700", bgColor: "bg-green-100" },
  CANCELLED: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-100" },
};

// ─── Transport Modes ──────────────────────────────────────────────────

export const TRANSPORT_MODES = ["SEA", "ROAD", "RAIL", "AIR"] as const;

export const TRANSPORT_MODE_LABELS: Record<string, string> = {
  SEA: "Sea", ROAD: "Road", RAIL: "Rail", AIR: "Air",
};

// ─── Ports ─────────────────────────────────────────────────────────────

export const ORIGIN_PORTS = [
  "Santo Domingo, DR",
  "Callao, Peru",
  "Guayaquil, Ecuador",
  "Puerto Limon, Costa Rica",
  "Santa Marta, Colombia",
  "Turbo, Colombia",
] as const;

export const DESTINATION_PORTS = [
  "Rotterdam, Netherlands",
  "Antwerp, Belgium",
  "Hamburg, Germany",
  "Vlissingen, Netherlands",
] as const;
