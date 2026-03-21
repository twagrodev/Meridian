/**
 * Document processing pipeline — migrated from AgroDash DocManager.
 *
 * Services:
 * - text-extraction: Extract text from PDF, XLSX, DOCX, TXT, images
 * - ocr: Tesseract OCR for scanned documents
 * - classifier: Weighted keyword document classification
 * - metadata: Generic tag/field regex extraction
 * - carrier-templates: Carrier-specific AN/BL extraction (7 carriers)
 * - doc-templates: Document-type-specific extraction (INV, FT, PL, COI, WC)
 * - ai-extraction: Ollama + Claude API fallback extraction
 * - matching: Shipment matching (BL > lot > container > invoice)
 */

export { extractText, SUPPORTED_EXTENSIONS } from "./text-extraction";
export type { ExtractionResult } from "./text-extraction";

export { ocrExtract, isOcrNeeded } from "./ocr";
export type { OcrResult } from "./ocr";

export { classifyDocument } from "./classifier";
export type { ClassificationResult } from "./classifier";

export { extractMetadata, extractTags, extractFields } from "./metadata";
export type { MetadataResult } from "./metadata";

export { detectCarrier, extractByCarrier } from "./carrier-templates";
export type { CarrierExtractionResult } from "./carrier-templates";

export { extractByDocType } from "./doc-templates";
export type { DocTypeExtractionResult } from "./doc-templates";

export {
  isClaudeAvailable, claudeExtractFromText, claudeExtractFromImage,
  isOllamaAvailable, ollamaExtractFromText,
} from "./ai-extraction";
export type { AiExtractionResult } from "./ai-extraction";

export { tryMatchShipment } from "./matching";
export type { MatchResult } from "./matching";
