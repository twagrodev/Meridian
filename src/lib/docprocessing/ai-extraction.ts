/**
 * AI-based document extraction — Claude API + Ollama fallback.
 * Ported from AgroDash ai_extraction.py + ollama_extraction.py
 *
 * Uses:
 * - Claude API (claude-sonnet-4-6) for text and vision extraction
 * - Ollama (mistral 7B, localhost:11434) as free offline fallback
 */

import { readFile } from "fs/promises";
import { extname } from "path";
import { basename } from "path";

const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "mistral";

export interface AiExtractionResult {
  fields: Record<string, unknown>;
  documentType: string | null;
  method: string;
  error?: string;
}

const EXTRACTION_FIELDS: Record<string, string> = {
  document_type: "Type of document (e.g. Arrival Notice, Bill of Lading, Invoice, FairTrade Invoice, Packing List, Certificate of Inspection, Weighing Certificate, EUR1)",
  bl_number: "Bill of Lading number",
  invoice_number: "Invoice number",
  coi_number: "Certificate of Inspection number",
  certificate_number: "Certificate number (e.g. weighing certificate)",
  container_number: "Primary container number (format: 4 letters + 7 digits, e.g. MSKU1234567)",
  container_numbers: "List of ALL container numbers found",
  seal_number: "Primary seal number",
  seal_numbers: "List of ALL seal numbers found",
  lot: "Lot number or reference",
  order_numbers: "Order or purchase order numbers",
  flo_id: "FLO ID (FairTrade Labelling Organizations ID, numeric)",
  producer: "Producer or grower name",
  exporter: "Exporter name",
  shipper: "Shipper name",
  consignee: "Consignee name",
  vessel: "Vessel or ship name",
  voyage: "Voyage number",
  port_of_loading: "Port of loading",
  port_of_discharge: "Port of discharge/destination",
  eta: "Estimated time of arrival (date)",
  total_amount: "Total invoice amount (number only)",
  currency: "Currency code (USD, EUR, etc.)",
  invoice_date: "Invoice date",
  gross_weight: "Gross weight in KG (remove comma separators, keep decimal point)",
  nett_weight: "Net weight in KG (remove comma separators, keep decimal point)",
  quantity_boxes: "Total number of boxes/cartons",
  brand: "Brand name of product",
  country_of_origin: "Country of origin",
  week: "Week number (if mentioned)",
};

const SYSTEM_PROMPT = `You are a document data extraction specialist for an agricultural import/export company dealing in bananas and tropical fruit.

Extract structured data from the document. Return ONLY a JSON object with the fields you can find.
- Use null for fields you cannot find.
- For container numbers, use the standard format: 4 uppercase letters followed by 7 digits (e.g., MSKU1234567).
- For dates, use ISO format (YYYY-MM-DD) when possible.
- For weights, extract the numeric value in KG. Remove thousand-separator commas but KEEP the decimal point.
- For amounts, extract the numeric value only.
- container_numbers and seal_numbers should be arrays.
- Be precise: extract exact values as they appear in the document.
- Do not guess or fabricate values.`;

function getFieldsDescription(): string {
  return Object.entries(EXTRACTION_FIELDS)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

function parseAiResponse(resultText: string): { fields: Record<string, unknown>; documentType: string | null } {
  let cleaned = resultText.trim();
  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.split("\n", 2)[1];
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence >= 0) {
      cleaned = cleaned.slice(0, lastFence);
    }
    cleaned = cleaned.trim();
  }

  const data = JSON.parse(cleaned) as Record<string, unknown>;
  const documentType = (data.document_type as string | null) ?? null;
  delete data.document_type;

  // Remove null values
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v != null) {
      fields[k] = v;
    }
  }

  return { fields, documentType };
}

// ── Claude API ──────────────────────────────────────────────────

/**
 * Check if Claude API is available (ANTHROPIC_API_KEY configured).
 */
export function isClaudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Use Claude to extract structured data from document text.
 */
export async function claudeExtractFromText(
  text: string,
  filename: string = "",
): Promise<AiExtractionResult> {
  if (!isClaudeAvailable()) {
    return { fields: {}, documentType: null, method: "claude_unavailable" };
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const fieldsDesc = getFieldsDescription();
    const userPrompt =
      `Extract all available fields from this document.\n\n` +
      `Filename: ${filename}\n\n` +
      `Document text:\n${text.slice(0, 8000)}\n\n` +
      `Fields to extract:\n${fieldsDesc}\n\n` +
      `Return ONLY a valid JSON object with the extracted fields. No explanation.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const resultText = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    const { fields, documentType } = parseAiResponse(resultText);
    console.log(`[ai-extraction] Claude extracted ${Object.keys(fields).length} fields from ${filename}`);

    return { fields, documentType, method: "claude_text" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ai-extraction] Claude text extraction failed:`, message);
    return { fields: {}, documentType: null, method: "claude_error", error: message };
  }
}

/**
 * Use Claude Vision to extract data from document images.
 */
export async function claudeExtractFromImage(
  filePath: string,
  maxPages: number = 3,
): Promise<AiExtractionResult> {
  if (!isClaudeAvailable()) {
    return { fields: {}, documentType: null, method: "claude_unavailable" };
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const images = await getDocumentImages(filePath, maxPages);
    if (images.length === 0) {
      return { fields: {}, documentType: null, method: "claude_no_images" };
    }

    const client = new Anthropic();

    // Build content array for multimodal message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];
    for (const { data, mediaType } of images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: data.toString("base64"),
        },
      });
    }

    const fieldsDesc = getFieldsDescription();
    content.push({
      type: "text",
      text:
        `Extract all available data from this document image(s).\n\n` +
        `Filename: ${basename(filePath)}\n\n` +
        `Fields to extract:\n${fieldsDesc}\n\n` +
        `Return ONLY a valid JSON object with the extracted fields. No explanation.`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const resultText = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    const { fields, documentType } = parseAiResponse(resultText);
    console.log(`[ai-extraction] Claude Vision extracted ${Object.keys(fields).length} fields from ${basename(filePath)}`);

    return { fields, documentType, method: "claude_vision" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ai-extraction] Claude vision extraction failed:`, message);
    return { fields: {}, documentType: null, method: "claude_error", error: message };
  }
}

async function getDocumentImages(
  filePath: string,
  maxPages: number,
): Promise<Array<{ data: Buffer; mediaType: string }>> {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    const data = await readFile(filePath);
    const mediaType = ext === ".png" ? "image/png" : "image/jpeg";
    return [{ data: Buffer.from(data), mediaType }];
  }

  if (ext === ".pdf") {
    // Use pdf-parse v2 getScreenshot for page rendering
    try {
      const { PDFParse } = await import("pdf-parse");
      const buffer = await readFile(filePath);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const screenshots = await parser.getScreenshot({
        imageBuffer: true,
        scale: 2,
        last: maxPages,
      });
      await parser.destroy();

      return screenshots.pages
        .filter((p) => p.data)
        .map((p) => ({ data: Buffer.from(p.data!), mediaType: "image/png" }));
    } catch {
      return [];
    }
  }

  return [];
}

// ── Ollama ──────────────────────────────────────────────────────

/**
 * Check if Ollama server is running and the model is available.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return false;
    const data = (await resp.json()) as { models?: Array<{ name: string }> };
    const models = (data.models ?? []).map((m) => m.name.split(":")[0]);
    return models.includes(OLLAMA_MODEL);
  } catch {
    return false;
  }
}

/**
 * Use Ollama to extract structured data from document text.
 */
export async function ollamaExtractFromText(
  text: string,
  filename: string = "",
): Promise<AiExtractionResult> {
  const available = await isOllamaAvailable();
  if (!available) {
    return { fields: {}, documentType: null, method: "ollama_unavailable" };
  }

  try {
    const fieldsDesc = getFieldsDescription();
    const userPrompt =
      `Extract all available fields from this document.\n\n` +
      `Filename: ${filename}\n\n` +
      `Document text:\n${text.slice(0, 6000)}\n\n` +
      `Fields to extract:\n${fieldsDesc}\n\n` +
      `Return ONLY a valid JSON object with the extracted fields. No explanation.`;

    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        format: "json",
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data = (await resp.json()) as { message?: { content?: string } };
    const resultText = data.message?.content?.trim() ?? "";
    const { fields, documentType } = parseAiResponse(resultText);

    console.log(`[ai-extraction] Ollama extracted ${Object.keys(fields).length} fields from ${filename}`);
    return { fields, documentType, method: "ollama_text" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ai-extraction] Ollama extraction failed:`, message);
    return { fields: {}, documentType: null, method: "ollama_error", error: message };
  }
}
