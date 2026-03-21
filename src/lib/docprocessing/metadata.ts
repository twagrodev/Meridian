/**
 * Metadata extraction service — extracts tags and fields from document text.
 * Ported from AgroDash/Modules/DocManager/services/metadata.py
 *
 * Uses regex patterns for common document field formats.
 */

import { EXTRACTION_FIELDS } from "@/lib/constants";

export interface MetadataResult {
  tags: {
    producer: string | null;
    lot: string | null;
    container: string | null;
  };
  fields: Record<string, string>;
}

/**
 * Extract tags (producer, lot, container) and type-specific fields.
 */
export function extractMetadata(text: string, docType: string): MetadataResult {
  const tags = extractTags(text);
  const fields = extractFields(text, docType);
  return { tags, fields };
}

/**
 * Extract common tags: producer/shipper, lot, container.
 */
export function extractTags(text: string): MetadataResult["tags"] {
  const tags: MetadataResult["tags"] = {
    producer: null,
    lot: null,
    container: null,
  };

  // Lot number (e.g., LOT 70123, Lot: 70123, lot no. 70123)
  const lotMatch = text.match(/(?:lot\s*(?:no\.?|number|#)?[\s:]*?)(\w{3,15})/i);
  if (lotMatch) {
    tags.lot = lotMatch[1].trim();
  }

  // Container number (standard format: 4 letters + 7 digits, e.g., MEDU1234567)
  const containerMatch = text.match(/\b([A-Z]{4}\d{7})\b/);
  if (containerMatch) {
    tags.container = containerMatch[1];
  }

  // Producer / shipper (look for labeled fields)
  for (const label of ["shipper", "producer", "exporter", "seller"]) {
    const re = new RegExp(`(?:${label})[\\s:]+([A-Z][\\w\\s&.,'-]{3,50})`, "i");
    const match = text.match(re);
    if (match) {
      tags.producer = match[1].trim().replace(/[.,]+$/, "");
      break;
    }
  }

  return tags;
}

/**
 * Extract type-specific fields based on document type.
 */
export function extractFields(text: string, docType: string): Record<string, string> {
  const expected = EXTRACTION_FIELDS[docType] ?? [];
  const fields: Record<string, string> = {};

  for (const fieldName of expected) {
    const value = extractField(text, fieldName);
    if (value) {
      fields[fieldName] = value;
    }
  }

  return fields;
}

function extractField(text: string, fieldName: string): string | null {
  const patterns = FIELD_PATTERNS[fieldName];
  if (!patterns) return null;

  for (const pattern of patterns) {
    const match = text.match(new RegExp(pattern, "i"));
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

const FIELD_PATTERNS: Record<string, string[]> = {
  bl_number: [
    "(?:b/?l|bill of lading)\\s*(?:no\\.?|number|#)?[\\s:]*([A-Z0-9]{6,20})",
  ],
  invoice_number: [
    "(?:invoice|inv)\\s*(?:no\\.?|number|#)?[\\s:]*([A-Z0-9\\-/]{3,20})",
  ],
  invoice_date: [
    "(?:invoice\\s*date|date)[\\s:]*(\\d{1,2}[/\\-.]+\\d{1,2}[/\\-.]+\\d{2,4})",
  ],
  invoice_amount: [
    "(?:total|amount|invoice\\s*amount)[\\s:]*([A-Z]{0,3}\\s*[\\d,.]+)",
  ],
  currency: [
    "\\b(USD|EUR|GBP|CHF)\\b",
  ],
  gross_weight: [
    "(?:gross\\s*w(?:ei)?ght?)[\\s:]*([0-9.,]+\\s*(?:kg|mt|lbs)?)",
  ],
  nett_weight: [
    "(?:ne(?:tt?)\\s*w(?:ei)?ght?)[\\s:]*([0-9.,]+\\s*(?:kg|mt|lbs)?)",
  ],
  vessel: [
    "(?:vessel|ship|mv|m/v)[\\s:]+([A-Za-z\\s]{3,30})",
  ],
  port_of_loading: [
    "(?:port of loading|pol|loading port)[\\s:]+([A-Za-z\\s,]{3,40})",
  ],
  port_of_discharge: [
    "(?:port of discharge|pod|discharge port)[\\s:]+([A-Za-z\\s,]{3,40})",
  ],
  container_number: [
    "\\b([A-Z]{4}\\d{7})\\b",
  ],
  seal_number: [
    "(?:seal)[\\s:]*(?:no\\.?|number|#)?[\\s:]*([A-Z0-9]{4,15})",
  ],
  shipper: [
    "(?:shipper|consignor)[\\s:]+([A-Z][\\w\\s&.,'-]{3,50})",
  ],
  consignee: [
    "(?:consignee|notify)[\\s:]+([A-Z][\\w\\s&.,'-]{3,50})",
  ],
  authorized_exporter_code: [
    "(?:authori[sz]ed exporter|exporter\\s*(?:code|no))[\\s:]*([A-Z0-9/]{3,20})",
  ],
  payment_terms: [
    "(?:payment\\s*terms?)[\\s:]+([A-Za-z0-9\\s]{3,30})",
  ],
  lot: [
    "(?:lot)\\s*(?:no\\.?|number|#)?[\\s:]*(\\w{3,15})",
  ],
  producer: [
    "(?:producer|grower|estate)[\\s:]+([A-Z][\\w\\s&.,'-]{3,50})",
  ],
  eta: [
    "(?:eta|estimated\\s*(?:time of )?arrival)[\\s:]*(\\d{1,2}[/\\-.]+\\d{1,2}[/\\-.]+\\d{2,4})",
  ],
  number_of_packages: [
    "(?:no\\.?\\s*of\\s*packages|packages|pieces)[\\s:]*(\\d+)",
  ],
  fairtrade_premium: [
    "(?:fairtrade\\s*premium|ft\\s*premium)[\\s:]*([0-9.,]+)",
  ],
  flo_id: [
    "(?:flo\\s*id|flo\\s*number)[\\s:]*(\\d{3,10})",
  ],
  grade: [
    "(?:grade|quality)[\\s:]+([A-Za-z0-9\\s]{2,20})",
  ],
  moisture: [
    "(?:moisture)[\\s:]*([0-9.,]+\\s*%?)",
  ],
  screen_size: [
    "(?:screen\\s*size)[\\s:]*([0-9/\\-\\s]+)",
  ],
  defects: [
    "(?:defects?)[\\s:]*([0-9.,]+\\s*%?)",
  ],
  cup_score: [
    "(?:cup\\s*score|cupping\\s*score)[\\s:]*([0-9.,]+)",
  ],
  country_of_origin: [
    "(?:country of origin|origin)[\\s:]+([A-Za-z\\s]{3,30})",
  ],
  exporter: [
    "(?:exporter)[\\s:]+([A-Z][\\w\\s&.,'-]{3,50})",
  ],
};
