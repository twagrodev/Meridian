/**
 * Document classification service — identifies document type from text.
 * Ported from AgroDash/Modules/DocManager/services/classifier.py
 *
 * Uses weighted keyword matching with:
 * - Title area boost (first 500 chars)
 * - Heading detection boost (first 5 lines)
 * - Invoice subtype disambiguation
 * - Packing list disambiguation
 *
 * 34/34 classification accuracy on AgroDash test documents.
 */

import { DOC_TYPES, type DocTypeKey } from "@/lib/constants";

export interface ClassificationResult {
  docType: string;       // Human name: "Bill of Lading"
  docCode: string;       // Short code: "BL"
  confidence: "high" | "medium" | "low" | "none";
  scores: Record<string, number>;
}

type KeywordRule = [keyword: string, weight: number];

const DOC_TYPE_RULES: Record<string, KeywordRule[]> = {
  "Arrival Notice": [
    ["arrival notice", 10],
    ["notice of arrival", 10],
    ["notify - letter", 10],
    ["notify-letter", 10],
    ["notification letter", 8],
    ["notify letter", 8],
    ["e.t.a", 5],
    ["eta", 2],
    ["estimated time of arrival", 5],
    ["import dry thc", 4],
    ["dkv collect", 3],
    ["thc", 2],
  ],
  "Bill of Lading": [
    ["bill of lading", 10],
    ["b/l no", 8],
    ["bl number", 8],
    ["combined transport", 5],
    ["shipped on board", 5],
    ["place of receipt", 4],
    ["ocean bill", 5],
    ["carrier's agents", 4],
    ["rider pages", 3],
    ["clean on board", 4],
    ["freight prepaid", 3],
    ["freight collect", 3],
    ["booking ref", 3],
  ],
  "FairTrade Invoice": [
    ["fairtrade premium", 10],
    ["fair prime", 8],
    ["ft premium", 8],
    ["prima de comercio justo", 10],
    ["pago de prima de comercio justo", 15],
    ["pago de prima", 8],
    ["premio fairtrade", 10],
    ["premio fairtrade-flo", 12],
    ["premio caja con banano", 10],
    ["bono fairtrade", 10],
    ["prima fairtrade", 10],
    ["prima comercio justo", 10],
    ["comercio justo", 3],
    ["fairtrade", 2],
    ["fair trade", 2],
    ["flo id", 1],
    ["floid", 1],
    ["factura", 2],
    ["invoice", 1],
  ],
  "Invoice with Origin Declaration": [
    ["origin declaration", 10],
    ["authorized exporter", 6],
    ["exporter authorisation", 6],
    ["authorisation no.", 5],
    ["authorisation no", 4],
    ["preferential origin", 6],
    ["origen preferencial", 6],
    ["declaracion de origen", 8],
    ["exportador autorizado", 6],
    ["invoice", 2],
    ["factura", 2],
  ],
  "EUR1": [
    ["eur.1", 10],
    ["eur 1", 8],
    ["movement certificate", 10],
    ["certificat de circulation", 8],
    ["european community", 5],
  ],
  "Invoice": [
    ["invoice", 4],
    ["factura", 4],
    ["factura electronica", 6],
    ["factura comercial", 8],
    ["inv no", 5],
    ["invoice number", 5],
    ["invoice date", 4],
    ["fecha de emision", 4],
    ["total amount", 3],
    ["payment terms", 3],
    ["condicion de pago", 3],
    ["due date", 2],
    ["fecha de vencimiento", 2],
    ["unit price", 3],
    ["precio unitario", 3],
    ["valor unitario", 3],
    ["valor total", 3],
    ["merchandise description", 4],
    ["descripcion de mercaderia", 4],
    ["description of goods", 4],
    ["importe total", 4],
    ["sub total ventas", 4],
    ["gross weight", 2],
    ["peso bruto", 2],
    ["net weight", 2],
    ["peso neto", 2],
    ["incoterm", 3],
    ["fob", 2],
  ],
  "Packing List": [
    ["packing list", 10],
    ["packinglist", 10],
    ["packing note", 8],
    ["pack list", 8],
    ["lista de empaque", 8],
    ["llenado de contenedores", 10],
    ["number of packages", 4],
    ["number of boxes", 4],
    ["total boxes", 3],
    ["box type", 3],
    ["calibre", 2],
    ["n\u00b0 pallet", 6],
    ["pallet", 3],
    ["barcode", 3],
    ["numero de pallets", 6],
    ["boxes", 2],
    ["sticker", 2],
    ["exported boxes", 4],
    ["discarded boxes", 4],
    ["nombre del productor", 5],
    ["producer name", 4],
    ["shipping week", 4],
    ["packing week", 4],
  ],
  "Quality Report": [
    ["quality report", 10],
    ["quality certificate", 10],
    ["quality analysis", 8],
    ["cup score", 6],
    ["cupping score", 6],
    ["moisture", 3],
    ["screen size", 4],
    ["defects", 3],
  ],
  "Weighing Certificate": [
    ["weegcertificaat", 10],
    ["weighing certificate", 10],
    ["weight certificate", 8],
    ["erkende weger", 8],
    ["certified weigher", 6],
    ["nettogewicht", 5],
    ["verified gross mass", 5],
  ],
  "Certificate of Inspection": [
    ["inspectiecertificaat", 10],
    ["inspection certificate", 10],
    ["certificate of inspection", 10],
    ["controleautoriteit", 6],
    ["controleorgaan", 6],
    ["biologische", 4],
    ["organic", 2],
    ["omschakelingsproducten", 4],
  ],
};

// FairTrade premium signals
const FT_PREMIUM_SIGNALS = new Set([
  "pago de prima de comercio justo",
  "pago de prima",
  "prima de comercio justo",
  "premio fairtrade",
  "premio fairtrade-flo",
  "premio caja con banano",
  "bono fairtrade",
  "prima fairtrade",
  "prima comercio justo",
  "fairtrade premium",
  "fair prime",
  "ft premium",
]);

const FT_PREMIUM_RE = new RegExp(
  "prima\\s+f\\s*airtrade"
  + "|prima\\s+fairtrade"
  + "|premio\\s+fairtrade"
  + "|pago\\s+de\\s+prima"
  + "|bono\\s+fairtrade"
  + "|fairtrade\\s+premium"
  + "|fair\\s*prime"
  + "|prima\\s+comercio\\s+justo"
  + "|prima\\s+de\\s+comercio\\s+justo",
  "i",
);

const AUTH_EXPORTER_RE = new RegExp(
  "authoris[az]tion\\s+no\\.?\\s*[A-Z0-9/\\-]+"
  + "|exportador\\s+(?:autorizado|habitual)"
  + "|el exportador\\s+\\w+\\s+de los productos"
  + "|origen preferencial",
  "i",
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(text: string, keyword: string): number {
  const re = new RegExp(escapeRegex(keyword), "gi");
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

/**
 * Classify a document based on weighted keyword matching.
 */
export function classifyDocument(text: string, filename: string): ClassificationResult {
  if (!text.trim()) {
    console.log(`[classifier] ${filename}: No text to classify`);
    return {
      docType: "Other",
      docCode: DOC_TYPES["Other"] ?? "DOC",
      confidence: "none",
      scores: {},
    };
  }

  const textLower = text.toLowerCase();
  const titleArea = textLower.slice(0, 500);

  // Heading detection: first few non-empty lines
  const firstLines = textLower
    .slice(0, 600)
    .split("\n")
    .map((ln) => ln.trim())
    .filter(Boolean)
    .slice(0, 5);
  const headingText = firstLines.join(" ");

  const scores: Record<string, { score: number; keywords: string[] }> = {};

  for (const [docType, rules] of Object.entries(DOC_TYPE_RULES)) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const [keyword, weight] of rules) {
      const count = countOccurrences(textLower, keyword);
      if (count > 0) {
        // Cap occurrences to prevent inflation from repeated generic terms
        let contribution = Math.min(count, 3) * weight;

        // Title boost: keyword in first 500 chars doubles contribution
        if (titleArea.includes(keyword)) {
          contribution *= 2;
        }

        // Heading boost: high-weight keyword in heading = very strong signal
        if (headingText.includes(keyword) && weight >= 8) {
          contribution += 20;
        }

        score += contribution;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      scores[docType] = { score, keywords: matchedKeywords };
    }
  }

  if (Object.keys(scores).length === 0) {
    console.log(`[classifier] ${filename}: No keyword matches — classified as Other`);
    return {
      docType: "Other",
      docCode: DOC_TYPES["Other"] ?? "DOC",
      confidence: "none",
      scores: {},
    };
  }

  // Post-scoring disambiguation
  disambiguateInvoiceSubtypes(scores, textLower);
  disambiguatePackingList(scores, textLower);

  // Find best type by score
  const sortedTypes = Object.entries(scores)
    .sort((a, b) => b[1].score - a[1].score);

  const bestType = sortedTypes[0][0];
  const bestScore = sortedTypes[0][1].score;
  const secondScore = sortedTypes.length >= 2 ? sortedTypes[1][1].score : 0;
  const margin = bestScore - secondScore;

  const docCode = DOC_TYPES[bestType as DocTypeKey] ?? "DOC";

  let confidence: ClassificationResult["confidence"];
  if (bestScore >= 10 && margin >= 5) {
    confidence = "high";
  } else if (bestScore >= 5) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const scoreSummary: Record<string, number> = {};
  for (const [t, s] of Object.entries(scores)) {
    scoreSummary[t] = s.score;
  }

  console.log(
    `[classifier] ${filename}: Classified as '${bestType}' ` +
    `(confidence: ${confidence}, score: ${bestScore})`,
  );

  return {
    docType: bestType,
    docCode: docCode,
    confidence,
    scores: scoreSummary,
  };
}

// ── Disambiguation helpers ──────────────────────────────────────

function disambiguateInvoiceSubtypes(
  scores: Record<string, { score: number; keywords: string[] }>,
  textLower: string,
): void {
  const invoiceTypes = ["Invoice", "FairTrade Invoice", "Invoice with Origin Declaration"];
  const hasAnyInvoice = invoiceTypes.some((t) => scores[t]);
  if (!hasAnyInvoice) return;

  const invoiceScore = Math.max(
    ...invoiceTypes.map((t) => scores[t]?.score ?? 0),
  );

  const hasPremium =
    [...FT_PREMIUM_SIGNALS].some((kw) => textLower.includes(kw)) ||
    FT_PREMIUM_RE.test(textLower);
  const hasAuth = AUTH_EXPORTER_RE.test(textLower);

  if (hasPremium) {
    if (!scores["FairTrade Invoice"]) {
      scores["FairTrade Invoice"] = { score: 0, keywords: [] };
    }
    scores["FairTrade Invoice"].score = invoiceScore + 20;
    for (const t of ["Invoice", "Invoice with Origin Declaration"]) {
      if (scores[t]) {
        scores[t].score = Math.min(scores[t].score, invoiceScore - 1);
      }
    }
  } else if (hasAuth) {
    if (!scores["Invoice with Origin Declaration"]) {
      scores["Invoice with Origin Declaration"] = { score: 0, keywords: [] };
    }
    scores["Invoice with Origin Declaration"].score = invoiceScore + 10;
    if (scores["FairTrade Invoice"]) {
      scores["FairTrade Invoice"].score = Math.max(
        Math.floor(scores["FairTrade Invoice"].score / 3), 1,
      );
    }
  } else {
    if (scores["FairTrade Invoice"]) {
      scores["FairTrade Invoice"].score = Math.max(
        Math.floor(scores["FairTrade Invoice"].score / 3), 1,
      );
    }
    if (scores["Invoice with Origin Declaration"]) {
      scores["Invoice with Origin Declaration"].score = Math.max(
        Math.floor(scores["Invoice with Origin Declaration"].score / 3), 1,
      );
    }
  }
}

function disambiguatePackingList(
  scores: Record<string, { score: number; keywords: string[] }>,
  textLower: string,
): void {
  const pl = scores["Packing List"];
  if (!pl) return;

  const bestOther = Math.max(
    ...Object.entries(scores)
      .filter(([t]) => t !== "Packing List")
      .map(([, s]) => s.score),
    0,
  );

  if (pl.score < bestOther) {
    const plSignals = [
      "packing list", "packinglist", "llenado de contenedores",
      "pallet", "exported boxes", "nombre del productor",
      "producer name", "packing week", "shipping week",
    ];
    const signalCount = plSignals.filter((s) => textLower.includes(s)).length;
    if (signalCount >= 1) {
      pl.score += 15 * signalCount;
    }
  }
}
