"use server";

/**
 * Document processing pipeline — orchestrates the full extraction workflow.
 * Ported from AgroDash router.py /api/process/{filename}
 *
 * Steps:
 * 1. Extract text from file
 * 2. Check if OCR needed → run OCR
 * 3. Classify document type
 * 4. Extract metadata (generic tags + type-specific fields)
 * 5. Carrier-specific extraction (for AN/BL) or doc-type extraction (others)
 * 6. AI supplementary extraction (if <2 key fields found)
 * 7. Match to shipment
 * 8. Update Document record with results
 */

import { join } from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "./audit";
import { DOC_TYPES, type DocTypeKey } from "@/lib/constants";

import { extractText } from "@/lib/docprocessing/text-extraction";
import { ocrExtract, isOcrNeeded } from "@/lib/docprocessing/ocr";
import { classifyDocument } from "@/lib/docprocessing/classifier";
import { extractMetadata } from "@/lib/docprocessing/metadata";
import { extractByCarrier } from "@/lib/docprocessing/carrier-templates";
import { extractByDocType } from "@/lib/docprocessing/doc-templates";
import {
  isClaudeAvailable, claudeExtractFromText,
  isOllamaAvailable, ollamaExtractFromText,
} from "@/lib/docprocessing/ai-extraction";
import { tryMatchShipment } from "@/lib/docprocessing/matching";

export interface ProcessResult {
  success: boolean;
  documentId: string;
  docType: string | null;
  docCode: string | null;
  confidence: string | null;
  matchStatus: "matched" | "unmatched" | "failed";
  shipmentId: string | null;
  matchedBy: string;
  fieldCount: number;
  warnings: string[];
  error?: string;
}

/**
 * Process a document: extract text, classify, extract fields, match to shipment.
 * Updates the Document record in place.
 */
export async function processDocument(documentId: string): Promise<ProcessResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false, documentId, docType: null, docCode: null,
      confidence: null, matchStatus: "failed", shipmentId: null,
      matchedBy: "", fieldCount: 0, warnings: [],
      error: "Unauthorized",
    };
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document || document.deletedAt) {
    return {
      success: false, documentId, docType: null, docCode: null,
      confidence: null, matchStatus: "failed", shipmentId: null,
      matchedBy: "", fieldCount: 0, warnings: [],
      error: "Document not found",
    };
  }

  // Mark as processing
  await prisma.document.update({
    where: { id: documentId },
    data: { docStatus: "PROCESSING" },
  });

  const warnings: string[] = [];
  const filePath = join(process.cwd(), "uploads", document.fileName);

  try {
    // ── Step 1: Extract text ──────────────────────────────────
    const extraction = await extractText(filePath);
    let text = extraction.text;

    // ── Step 2: OCR if needed ─────────────────────────────────
    let ocrText: string | null = null;
    if (extraction.needsOcr || isOcrNeeded(text, filePath)) {
      const ocrResult = await ocrExtract(filePath);
      if (ocrResult.text.trim()) {
        ocrText = ocrResult.text;
        // Append OCR text if original was empty, otherwise replace
        text = text.trim() ? `${text}\n\n--- OCR ---\n${ocrResult.text}` : ocrResult.text;
      } else {
        warnings.push("OCR produced no text");
      }
    }

    if (!text.trim()) {
      // No text at all — try AI vision as last resort
      if (isClaudeAvailable()) {
        const visionResult = await claudeExtractFromText("", document.originalName);
        // If vision got something, use it
        if (Object.keys(visionResult.fields).length > 0) {
          const allFields = visionResult.fields as Record<string, string>;
          await prisma.document.update({
            where: { id: documentId },
            data: {
              docType: visionResult.documentType
                ? (DOC_TYPES[visionResult.documentType as DocTypeKey] ?? null)
                : null,
              docStatus: "CLASSIFIED",
              extractedFields: JSON.stringify(allFields),
              ocrText,
              confidence: 0.5,
            },
          });
          revalidatePath("/documents");
          return {
            success: true, documentId,
            docType: visionResult.documentType, docCode: null,
            confidence: "low", matchStatus: "unmatched",
            shipmentId: null, matchedBy: "",
            fieldCount: Object.keys(allFields).length, warnings,
          };
        }
      }

      // Truly no text — mark as failed
      await prisma.document.update({
        where: { id: documentId },
        data: { docStatus: "FAILED", ocrText },
      });
      revalidatePath("/documents");
      return {
        success: false, documentId, docType: null, docCode: null,
        confidence: null, matchStatus: "failed", shipmentId: null,
        matchedBy: "", fieldCount: 0,
        warnings: [...warnings, "No extractable text in document"],
        error: "No extractable text",
      };
    }

    // ── Step 3: Classify document ─────────────────────────────
    const classification = classifyDocument(text, document.originalName);

    // ── Step 4: Extract metadata (generic tags + fields) ──────
    const metadata = extractMetadata(text, classification.docType);

    // ── Step 5: Type-specific extraction ──────────────────────
    let typeFields: Record<string, unknown> = {};
    let extractionMethod = "metadata";

    if (classification.docType === "Arrival Notice" || classification.docType === "Bill of Lading") {
      // Carrier-specific extraction for AN/BL
      const carrierResult = extractByCarrier(text, classification.docType, document.originalName);
      typeFields = carrierResult.fields;
      extractionMethod = `carrier:${carrierResult.carrier}`;
    } else if (classification.docType !== "Other") {
      // Doc-type-specific extraction for other types
      const docResult = extractByDocType(text, classification.docType, document.originalName);
      typeFields = docResult.fields;
      extractionMethod = docResult.method;
    }

    // Merge all fields: metadata fields + type-specific fields (type-specific wins)
    const allFields: Record<string, unknown> = {
      ...metadata.fields,
      ...typeFields,
    };

    // Add tags as fields if not already present
    if (metadata.tags.producer && !allFields.producer) {
      allFields.producer = metadata.tags.producer;
    }
    if (metadata.tags.lot && !allFields.lot) {
      allFields.lot = metadata.tags.lot;
    }
    if (metadata.tags.container && !allFields.container_number) {
      allFields.container_number = metadata.tags.container;
    }

    // ── Step 6: AI supplementary extraction ────────────────────
    const keyFieldCount = Object.values(allFields).filter((v) => v != null && v !== "").length;
    if (keyFieldCount < 2) {
      // Try Ollama first (free, local), then Claude
      const ollamaOk = await isOllamaAvailable();
      if (ollamaOk) {
        const ollamaResult = await ollamaExtractFromText(text, document.originalName);
        for (const [k, v] of Object.entries(ollamaResult.fields)) {
          if (v != null && !allFields[k]) {
            allFields[k] = v;
          }
        }
        extractionMethod += "+ollama";
      } else if (isClaudeAvailable()) {
        const claudeResult = await claudeExtractFromText(text, document.originalName);
        for (const [k, v] of Object.entries(claudeResult.fields)) {
          if (v != null && !allFields[k]) {
            allFields[k] = v;
          }
        }
        extractionMethod += "+claude";
      }
    }

    // Store extraction method in fields
    allFields._extraction_method = extractionMethod;

    // ── Step 7: Match to shipment ─────────────────────────────
    const matchResult = await tryMatchShipment(
      metadata.tags as Record<string, string | null>,
      allFields as Record<string, string>,
    );

    // ── Step 8: Update Document record ────────────────────────
    const confidenceValue =
      classification.confidence === "high" ? 0.9 :
      classification.confidence === "medium" ? 0.7 :
      classification.confidence === "low" ? 0.4 : 0.1;

    const docStatus = matchResult.matched ? "MATCHED"
      : classification.confidence === "none" ? "FAILED"
      : "CLASSIFIED";

    await prisma.document.update({
      where: { id: documentId },
      data: {
        docType: classification.docCode,
        docStatus,
        extractedFields: JSON.stringify(allFields),
        ocrText,
        confidence: confidenceValue,
        shipmentId: matchResult.shipmentId,
        containerId: matchResult.containerId,
      },
    });

    await logAudit(session.user.id!, "PROCESS", "Document", documentId, {
      docType: classification.docType,
      docCode: classification.docCode,
      confidence: classification.confidence,
      matchStatus: matchResult.matched ? "matched" : "unmatched",
      matchedBy: matchResult.matchedBy,
      fieldCount: Object.keys(allFields).length,
      method: extractionMethod,
    });

    revalidatePath("/documents");
    if (matchResult.shipmentId) {
      revalidatePath(`/shipments/${matchResult.shipmentId}`);
    }

    return {
      success: true,
      documentId,
      docType: classification.docType,
      docCode: classification.docCode,
      confidence: classification.confidence,
      matchStatus: matchResult.matched ? "matched" : "unmatched",
      shipmentId: matchResult.shipmentId,
      matchedBy: matchResult.matchedBy,
      fieldCount: Object.keys(allFields).length,
      warnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[process-document] Processing failed for ${documentId}:`, message);

    await prisma.document.update({
      where: { id: documentId },
      data: { docStatus: "FAILED" },
    });
    revalidatePath("/documents");

    return {
      success: false, documentId, docType: null, docCode: null,
      confidence: null, matchStatus: "failed", shipmentId: null,
      matchedBy: "", fieldCount: 0, warnings,
      error: message,
    };
  }
}

/**
 * Process all unprocessed documents (status: UPLOADED).
 */
export async function processAllDocuments(): Promise<ProcessResult[]> {
  const session = await auth();
  if (!session?.user) return [];

  const documents = await prisma.document.findMany({
    where: { docStatus: "UPLOADED", deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const results: ProcessResult[] = [];
  for (const doc of documents) {
    const result = await processDocument(doc.id);
    results.push(result);
  }

  return results;
}
