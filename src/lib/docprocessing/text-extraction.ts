/**
 * Text extraction service — extracts readable text from documents.
 * Ported from AgroDash/Modules/DocManager/services/text_extraction.py
 */

import { readFile } from "fs/promises";
import { extname } from "path";

export interface ExtractionResult {
  text: string;
  method: string;
  charCount: number;
  needsOcr: boolean;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff"]);

/**
 * Extract text from a document file.
 *
 * Supports: .pdf, .xlsx, .xls, .docx, .txt, .csv
 * Images (.png, .jpg, .tif) return empty text with needsOcr: true.
 */
export async function extractText(filePath: string): Promise<ExtractionResult> {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".txt" || ext === ".csv") {
    return extractTxt(filePath);
  }
  if (ext === ".pdf") {
    return extractPdf(filePath);
  }
  if (ext === ".xlsx" || ext === ".xlsm") {
    return extractXlsx(filePath);
  }
  if (ext === ".xls") {
    return extractXlsx(filePath); // xlsx package handles both
  }
  if (ext === ".docx") {
    return extractDocx(filePath);
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return { text: "", method: "image", charCount: 0, needsOcr: true };
  }

  console.warn(`[text-extraction] No extractor for ${ext}`);
  return { text: "", method: "unsupported", charCount: 0, needsOcr: false };
}

async function extractTxt(filePath: string): Promise<ExtractionResult> {
  try {
    const text = await readFile(filePath, "utf-8");
    return {
      text,
      method: "txt",
      charCount: text.length,
      needsOcr: false,
    };
  } catch (err) {
    console.error(`[text-extraction] TXT read failed:`, err);
    return { text: "", method: "txt", charCount: 0, needsOcr: false };
  }
}

async function extractPdf(filePath: string): Promise<ExtractionResult> {
  try {
    // pdf-parse v2: class-based API wrapping Mozilla's pdf.js
    const { PDFParse } = await import("pdf-parse");
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text = result.text ?? "";
    await parser.destroy();

    if (text.trim().length > 0) {
      return {
        text,
        method: "pdf-parse",
        charCount: text.length,
        needsOcr: false,
      };
    }

    // No text extracted — likely a scanned PDF
    return {
      text: "",
      method: "pdf-parse",
      charCount: 0,
      needsOcr: true,
    };
  } catch (err) {
    console.error(`[text-extraction] PDF extraction failed:`, err);
    return { text: "", method: "pdf-error", charCount: 0, needsOcr: true };
  }
}

async function extractXlsx(filePath: string): Promise<ExtractionResult> {
  try {
    const XLSX = await import("xlsx");
    const buffer = await readFile(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const textParts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet to array of arrays, then join
      const rows: (string | number | boolean | null)[][] =
        XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (const row of rows) {
        const vals = row
          .filter((v) => v != null && v !== "")
          .map((v) => String(v));
        if (vals.length > 0) {
          textParts.push(vals.join(" "));
        }
      }
    }

    const text = textParts.join("\n");
    return {
      text,
      method: "xlsx",
      charCount: text.length,
      needsOcr: false,
    };
  } catch (err) {
    console.error(`[text-extraction] XLSX extraction failed:`, err);
    return { text: "", method: "xlsx-error", charCount: 0, needsOcr: false };
  }
}

async function extractDocx(filePath: string): Promise<ExtractionResult> {
  try {
    const mammoth = await import("mammoth");
    const buffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ?? "";

    return {
      text,
      method: "docx",
      charCount: text.length,
      needsOcr: false,
    };
  } catch (err) {
    console.error(`[text-extraction] DOCX extraction failed:`, err);
    return { text: "", method: "docx-error", charCount: 0, needsOcr: false };
  }
}

/**
 * Supported file extensions for text extraction.
 */
export const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".xlsx", ".xlsm", ".xls", ".docx",
  ".txt", ".csv",
  ".png", ".jpg", ".jpeg", ".tif", ".tiff",
]);
