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
