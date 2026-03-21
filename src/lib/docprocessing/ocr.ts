/**
 * OCR service — optical character recognition for scanned documents.
 * Ported from AgroDash/Modules/DocManager/services/ocr.py
 *
 * Uses tesseract.js (pure JS Tesseract) — no system Tesseract installation needed.
 * For PDFs, renders pages to images using pdf-parse v2's getScreenshot API.
 */

import { readFile } from "fs/promises";
import { extname } from "path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff"]);
const OCR_LANGS = "eng+nld+spa"; // English + Dutch + Spanish

export interface OcrResult {
  text: string;
  method: string;
  pageCount: number;
}

/**
 * Run OCR on a document.
 * - Images (.png, .jpg, .tif): runs OCR directly.
 * - PDFs: renders each page to an image, then runs OCR.
 */
export async function ocrExtract(filePath: string): Promise<OcrResult> {
  const ext = extname(filePath).toLowerCase();

  if (IMAGE_EXTENSIONS.has(ext)) {
    return ocrImage(filePath);
  }
  if (ext === ".pdf") {
    return ocrPdf(filePath);
  }

  console.warn(`[ocr] Not applicable to ${ext}`);
  return { text: "", method: "unsupported", pageCount: 0 };
}

/**
 * Determine if OCR is needed based on extracted text and file extension.
 */
export function isOcrNeeded(text: string, filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();

  // Image files always need OCR
  if (IMAGE_EXTENSIONS.has(ext)) {
    return true;
  }

  // PDF with very little text likely needs OCR
  if (ext === ".pdf" && text.trim().length < 50) {
    return true;
  }

  // PDF with garbled text (custom font encoding) — check ratio of normal words
  if (ext === ".pdf" && text.length > 200) {
    const sample = text.slice(0, 2000);
    const words = sample.match(/[a-zA-Z]{3,}/g) ?? [];
    if (words.length < 10) {
      return true;
    }
  }

  return false;
}

async function ocrImage(filePath: string): Promise<OcrResult> {
  try {
    const Tesseract = await import("tesseract.js");
    const result = await Tesseract.recognize(filePath, OCR_LANGS);
    const text = result.data.text ?? "";

    if (text.trim()) {
      console.log(`[ocr] Extracted ${text.length} chars from image`);
    }
    return { text, method: "tesseract-image", pageCount: 1 };
  } catch (err) {
    console.error(`[ocr] Image OCR failed:`, err);
    return { text: "", method: "tesseract-error", pageCount: 0 };
  }
}

async function ocrPdf(filePath: string): Promise<OcrResult> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const Tesseract = await import("tesseract.js");
    const buffer = await readFile(filePath);

    // Render all pages to images using pdf-parse's getScreenshot
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const screenshots = await parser.getScreenshot({
      imageBuffer: true,
      scale: 2, // 2x for better OCR quality (~200 DPI equivalent)
    });
    await parser.destroy();

    const allText: string[] = [];
    for (const page of screenshots.pages) {
      if (!page.data) continue;
      const result = await Tesseract.recognize(
        Buffer.from(page.data),
        OCR_LANGS,
      );
      const pageText = result.data.text ?? "";
      if (pageText.trim()) {
        allText.push(pageText);
      }
    }

    const text = allText.join("\n");
    const pageCount = screenshots.pages.length;

    if (text.trim()) {
      console.log(`[ocr] Extracted ${text.length} chars from ${pageCount} PDF page(s)`);
    }
    return { text, method: "tesseract-pdf", pageCount };
  } catch (err) {
    console.error(`[ocr] PDF OCR failed:`, err);
    return { text: "", method: "tesseract-error", pageCount: 0 };
  }
}
