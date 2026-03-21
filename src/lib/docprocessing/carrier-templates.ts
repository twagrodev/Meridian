/**
 * Carrier-specific extraction templates for Arrival Notices and Bills of Lading.
 *
 * Each carrier has a unique document layout. This module:
 * 1. Detects which carrier issued the document
 * 2. Applies carrier-specific regex patterns to extract structured data
 * 3. Falls back to generic patterns if carrier is unknown
 *
 * Supported carriers: MSC, CMA CGM, Maersk, Hapag-Lloyd, FDD/Cosco, Seatrade, SBD
 *
 * Ported from AgroDash: Modules/DocManager/services/carrier_templates.py
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ContainerDetail {
  container_number: string;
  seal_numbers: string[];
  gross_weight?: string;
  quantity_boxes?: string;
}

export interface CarrierExtractionResult {
  carrier: string;
  fields: Record<string, string | string[] | ContainerDetail[] | null>;
  method: "carrier_template" | "generic";
}

type Fields = Record<string, string | string[] | ContainerDetail[] | null>;

type CarrierExtractor = (text: string, docType: string) => Fields;

// ── Carrier Detection ──────────────────────────────────────────────────

const CARRIER_SIGNATURES: [string, string[]][] = [
  ["MSC", [
    "mediterranean shipping company",
    "msc ",
    "meduru",
    "mscnl.mscgva.ch",
  ]],
  ["CMA CGM", [
    "cma cgm",
    "cma-cgm",
    "cmdu",
  ]],
  ["Maersk", [
    "maersk",
    "maeu",
  ]],
  ["Hapag-Lloyd", [
    "hapag-lloyd",
    "hapag lloyd",
    "hlag.com",
    "hlcu",
  ]],
  ["FDD", [
    "fdd logistics",
    "fdd-logistics",
    "fddoi",
  ]],
  ["Seatrade", [
    "seatrade",
    "syzsa",
  ]],
  ["SBD", [
    "smart business dominicana",
    "sbde",
  ]],
];

export function detectCarrier(text: string): string {
  const textLower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [carrier, keywords] of CARRIER_SIGNATURES) {
    const score = keywords.filter((kw) => textLower.includes(kw)).length;
    if (score > 0) {
      scores[carrier] = score;
    }
  }

  if (Object.keys(scores).length === 0) {
    return "Unknown";
  }

  return Object.entries(scores).reduce((best, [carrier, score]) =>
    score > best[1] ? [carrier, score] : best
  , ["Unknown", 0])[0];
}

// ── Helper Functions ───────────────────────────────────────────────────

function _find(pattern: string | RegExp, text: string, flags?: string): string | null {
  let re: RegExp;
  if (typeof pattern === "string") {
    re = new RegExp(pattern, flags ?? "i");
  } else if (flags !== undefined) {
    // Rebuild RegExp with explicit flags (needed when caller overrides flags on a literal)
    re = new RegExp(pattern.source, flags);
  } else {
    re = pattern;
  }
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : null;
}

function _findContainer(text: string): string | null {
  const m = text.match(/\b([A-Z]{4}\d{7})(?=[^A-Z\d]|$)/);
  return m ? m[1] : null;
}

function _findAllContainers(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const matches = Array.from(text.matchAll(/\b([A-Z]{4})\s?(\d{7})(?=[^A-Z\d]|$)/g));
  for (const m of matches) {
    const c = m[1] + m[2];
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}

function _parseSealLine(line: string): string[] {
  const tokens = Array.from(line.toUpperCase().matchAll(/[A-Z0-9]+/g)).map((m) => m[0]);
  const result: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const hasL = /[A-Z]/.test(t);
    const hasD = /[0-9]/.test(t);
    if (hasL && hasD) {
      result.push(t);
      i += 1;
    } else if (i + 1 < tokens.length) {
      result.push(t + tokens[i + 1]);
      i += 2;
    } else {
      i += 1;
    }
  }
  return result.filter((s) => s.length >= 4);
}

function _findSeals(text: string): string[] {
  const seals: string[] = [];
  const matches = Array.from(text.matchAll(/SEAL\s*(?:NUMBER)?[:\s]+([^\n]+)/gi));
  for (const m of matches) {
    seals.push(..._parseSealLine(m[1]));
  }
  // Deduplicate, preserve order
  return Array.from(new Map(seals.map((s) => [s, s])).values());
}

function _buildContainerDetailsFromParallel(fields: Fields): void {
  if (fields.container_details) {
    return;
  }
  const containers = (fields.container_numbers as string[] | null) || [];
  const seals = (fields.seal_numbers as string[] | null) || [];
  if (containers.length > 1 && seals.length === containers.length) {
    fields.container_details = containers.map((c, i) => ({
      container_number: c,
      seal_numbers: [seals[i]],
    }));
  }
}

function _findWeight(text: string, label: string): string | null {
  const re = new RegExp(`${label}[\\s:]*([0-9][0-9.,]*)\\s*(?:kgs?|kgm?|kg\\.?)?`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function _cleanMultiline(val: string | null): string | null {
  if (!val) {
    return null;
  }
  return val.replace(/\s*\n\s*/g, " ").trim();
}

function _defragment(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    while (i + 1 < lines.length) {
      const stripped = line.trimEnd();
      const nextStripped = lines[i + 1].trim();
      if (!stripped || !nextStripped) {
        break;
      }
      const endsPartial = /[A-Z]{1,2}$/.test(stripped);
      const nextStartsLower = /^[a-z]/.test(nextStripped);
      const nextIsFragment = nextStripped.length < 4 && /^[a-zA-Z]+$/.test(nextStripped);
      if ((endsPartial && nextStartsLower) || nextIsFragment) {
        i += 1;
        line = stripped + lines[i].trim();
      } else {
        break;
      }
    }
    result.push(line);
    i += 1;
  }
  return result.join("\n");
}

// ── Cleanup Utilities ──────────────────────────────────────────────────

function _normalizeWeight(val: string): string {
  return val.replace(/(\d),(\d)/g, "$1$2");
}

function _cleanup(fields: Fields): Fields {
  const WEIGHT_FIELDS = new Set(["gross_weight", "nett_weight", "tare_weight"]);
  const cleaned: Fields = {};

  for (const [k, rawV] of Object.entries(fields)) {
    let v = rawV;
    if (v === null || v === undefined) {
      continue;
    }
    if (typeof v === "string") {
      v = v.trim();
      if (!v) {
        continue;
      }
      if (WEIGHT_FIELDS.has(k)) {
        v = _normalizeWeight(v);
      }
      v = v.replace(/[.,;:]+$/, "");
      cleaned[k] = v;
    } else if (Array.isArray(v)) {
      const filtered = (v as (string | ContainerDetail)[]).filter((x) => x);
      if (filtered.length === 0) {
        continue;
      }
      cleaned[k] = filtered as string[] | ContainerDetail[];
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// ── Carrier Templates ──────────────────────────────────────────────────

function extractMsc(text: string, docType: string): Fields {
  const fields: Fields = {};

  // BL number: MEDU + letter + digits (distinguishes from container MEDU + 7 digits)
  let bl = _find(/MEDU[A-Z]\d{6,}/, text, "");
  if (bl === null) {
    // _find returns group(1), so wrap in capture group
    bl = _find(/(MEDU[A-Z]\d{6,})/, text, "");
  }
  if (!bl) {
    bl = _find(/Bill of Lading No\.?\s*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n([A-Z0-9]{8,20})/, text, "i");
  }
  if (!bl) {
    bl = _find(/(MEDURU\d{6,})/, text, "");
  }
  fields.bl_number = bl;

  // Vessel + Voyage: BL uses "MSC NAME - VOYAGE" dash pattern
  const vv = text.match(/(MSC\s+[A-Z]{3,}(?:\s+[A-Z]+\.?)?)\s*[-\u2013]\s*([A-Z0-9]+)\b/);
  if (vv) {
    fields.vessel = vv[1].trim();
    fields.voyage = vv[2].trim();
  } else {
    // AN NL: "MSC ARUSHI R." on its own line
    const vm = text.match(/^\s*(MSC\s+[A-Z]{3,}(?:\s+[A-Z]+\.?)?)\s*$/m);
    if (vm) {
      const name = vm[1].trim();
      if (!/^MSC\s+(Mediterranean|Sea\s*Waybill|SCAC|BL)/i.test(name)) {
        fields.vessel = name;
      }
    }
    if (!fields.vessel) {
      // AN NL table layout: "BBMSC SERENA\nNX605R ..."
      const vm2 = text.match(/(MSC\s+[A-Z]{3,}(?:\s+[A-Z]+\.?)?)\n([A-Z]{2}\d{3,4}[A-Z]?)\b/);
      if (vm2) {
        const name = vm2[1].trim();
        if (!/^MSC\s+(Mediterranean|Sea\s*Waybill|SCAC|BL)/i.test(name)) {
          fields.vessel = name;
          fields.voyage = vm2[2].trim();
        }
      }
    }
    if (!fields.vessel) {
      // AN BE (Belgian format): "MSC SERENA NX605R 02/03/2026 18:00:00 Liberia 1013169"
      const vm3 = text.match(
        /(MSC\s+[A-Z]{3,}(?:\s+[A-Z]+\.?)?)\s+([A-Z]{2}\d{3,4}[A-Z]?)\s+(\d{2}\/\d{2}\/\d{4})/
      );
      if (vm3) {
        const name = vm3[1].trim();
        if (!/^MSC\s+(Mediterranean|Sea\s*Waybill|SCAC|BL)/i.test(name)) {
          fields.vessel = name;
          fields.voyage = vm3[2].trim();
          fields.eta = vm3[3].trim();
        }
      }
    }
    // Voyage fallback: standalone code on own line (e.g. NN606R)
    if (!fields.voyage) {
      fields.voyage = fields.voyage ?? _find(/^([A-Z]{2}\d{3,4}[A-Z]?)\s*$/m, text, "m");
    }
  }

  // ETA: dd-mm-yyyy (NL format)
  if (!fields.eta) {
    fields.eta = _find(new RegExp("E\\.?T\\.?A\\.?.*?(\\d{2}-\\d{2}-\\d{4})", "is"), text);
  }
  if (!fields.eta) {
    fields.eta = _find(/(\d{2}-\d{2}-\d{4})/, text, "i");
  }

  // Containers: capture all
  let allContainers = _findAllContainers(text);
  // Filter out BL number (MEDU+letter+digits) from container list
  allContainers = allContainers.filter((c) => !/^MEDU[A-Z]/.test(c));
  if (allContainers.length === 0) {
    // Concatenated text fallback e.g. "REEFERMEDU9111266kgs"
    const m = text.match(/(MEDU\d{7})/);
    if (m) {
      allContainers = [m[1]];
    }
  }
  if (allContainers.length > 0) {
    fields.container_number = allContainers[0];
    if (allContainers.length > 1) {
      fields.container_numbers = allContainers;
      fields.number_of_packages = String(allContainers.length);
    }
  }

  // Seals
  fields.seal_numbers = _findSeals(text);
  const blSealsRaw = Array.from(
    text.matchAll(/(?:Seal Number|Seal No)[:\s]*(?:.*?\n)?\s*([A-Z0-9]{8,15})/gi)
  ).map((m) => m[1]);
  const blSeals = blSealsRaw.filter((s) => /\d/.test(s) && !s.startsWith("REEFER"));
  if (blSeals.length > 0) {
    const existing = (fields.seal_numbers as string[] | null) || [];
    fields.seal_numbers = Array.from(new Set([...existing, ...blSeals]));
  }

  // Shipper: first line only after SHIPPER label
  const smCooperativa = text.match(/(COOPERATIVA[^\n]+)/);
  if (smCooperativa) {
    fields.shipper = smCooperativa[1].trim().substring(0, 200);
  }
  if (!fields.shipper) {
    const shipperM = text.match(
      /SHIPPER\s+(?!DECLARES|LOAD|STOW|EXPRESSLY|COMPANY)((?:[A-Z]{3,})[^\n]+)/
    );
    if (shipperM) {
      let name = shipperM[1].trim();
      name = name.split(/\s+AGROFAIR/)[0].trim();
      fields.shipper = name.substring(0, 200);
    }
  }
  if (!fields.shipper) {
    const smBehalf = text.match(/"On behalf of\s+([^"]+)"/);
    if (smBehalf) {
      fields.shipper = _cleanMultiline(smBehalf[1].substring(0, 200));
    }
  }
  // BE format: if shipper was captured as label garbage, clear and retry
  if (fields.shipper && typeof fields.shipper === "string" &&
    /CONSIGNEE|CUSTOMS REFERENCE|INSTRUCTIONS/i.test(fields.shipper)) {
    fields.shipper = null;
  }
  if (!fields.shipper) {
    // BE: shipper value is the line between label row and consignee line
    const shpM = text.match(/CONSIGNEECUSTOMS[^\n]+\n([A-Z][^\n]{10,})\n(?:AGROFAIR)/);
    if (shpM) {
      fields.shipper = shpM[1].trim().substring(0, 200);
    }
  }

  // Consignee — three layouts
  let consM = text.match(/CONSIGNEE\s*\n?\s*(AGROFAIR[^\n]+)/);
  if (!consM) {
    consM = text.match(/(AGROFAIR\s+[^\n]{3,50}?)CONSIGNEE/);
  }
  if (!consM) {
    consM = text.match(/(AGROFAIR\s+[A-Z.]+(?:\s+[A-Z.]+)*)\s*(?:PUERTO|TURBO|MOIN|PAITA|CALLAO)/);
  }
  if (consM) {
    fields.consignee = consM[1].trim().substring(0, 200);
  }

  // Ports
  let pol = _find(/([A-Z]{3,}(?:[ ]+[A-Z]+)*)\s*\n\s*PORT OF LOADING/, text, "");
  if (!pol) {
    pol = _find(
      /(PUERTO\s+BOLIVAR|SANTO\s+TOMAS|[A-Z]{4,})PORT\s+OF\s+LOADING/,
      text, ""
    );
  }
  if (!pol) {
    pol = _find(
      /\b(PUERTO\s+BOLIV\s*AR|TURBO|PAITA|MOIN|CALLAO|CAUCEDO|GUAYAQUIL|SANTO\s*TOMAS)\b/,
      text, ""
    );
    if (pol) {
      pol = pol.replace(/BOLIV\s+AR/, "BOLIVAR");
    }
  }
  fields.port_of_loading = pol;

  // Packages (colli) + table weight
  const tableM = text.match(
    /(\d+)\s+([\d,.]+)\s+([\d,]+)\s+(\d+)\s+[A-Z].+PORT\s+OF\s+LOADING/
  );
  if (tableM) {
    const pkgsVal = tableM[3].replace(/,/g, "");
    if (pkgsVal !== "0") {
      fields.quantity_boxes = fields.quantity_boxes ?? pkgsVal;
    }
    const weightVal = tableM[2].replace(/,/g, "");
    if (weightVal && weightVal !== "0") {
      fields.gross_weight = fields.gross_weight ?? weightVal;
    }
  }

  // POD
  let pod = _find(/([A-Z]{3,})\s*\n\s*PORT OF DISCHARGE/, text, "");
  if (pod && /^(?:LOADING|RECEIPT|DESTINATION|FINAL|PORT|DISCHARGE)$/i.test(pod)) {
    pod = null;
  }
  if (!pod) {
    pod = _find(/(ROTTERDAM|Rotterdam|ANTWERP|Antwerp|FLUSHING|Flushing|VLISSINGEN)/, text, "");
  }
  fields.port_of_discharge = pod;

  // Weights
  let gw = fields.gross_weight as string | null;
  if (!gw) {
    gw = _find(/kgs\.\s+([\d,.]+)/, text, "i");
  }
  if (!gw) {
    gw = _find(/(\d{2,3},\d{3}(?:\.\d{3})?)\s/, text, "i");
  }
  if (!gw) {
    const gwVals = Array.from(
      text.matchAll(/TOTAL\s+GROSS\s+WEIGHT\s*:?\s*([\d,]+(?:\.\d+)?)\s*KG/gi)
    ).map((m) => m[1]);
    if (gwVals.length > 0) {
      gw = String(gwVals.reduce((sum, v) => sum + parseFloat(v.replace(/,/g, "")), 0));
    }
  }
  fields.gross_weight = gw;

  // Nett weight
  if (!fields.nett_weight) {
    const nwVals = Array.from(
      text.matchAll(/TOTAL\s+NET\s+WEIGHT\s*:?\s*([\d,]+(?:\.\d+)?)\s*KG/gi)
    ).map((m) => m[1]);
    if (nwVals.length > 0) {
      fields.nett_weight = String(nwVals.reduce((sum, v) => sum + parseFloat(v.replace(/,/g, "")), 0));
    }
  }

  // BE format gross weight fallback
  if (!fields.gross_weight) {
    let gwBe = _find(/Total\s*:\s*([\d,]+(?:\.\d+)?)\s*\//, text, "i");
    if (!gwBe) {
      const kgsVals = Array.from(
        text.matchAll(/([\d,]+(?:\.\d+)?)\s*kgs\./gi)
      ).map((m) => m[1]);
      if (kgsVals.length > 0) {
        gwBe = String(kgsVals.reduce((sum, v) => sum + parseFloat(v.replace(/,/g, "")), 0));
      }
    }
    fields.gross_weight = gwBe;
  }
  if (!fields.quantity_boxes) {
    const boxesBe = _find(/Total\s+Items\s*:\s*([\d,]+)/, text, "i");
    if (boxesBe) {
      fields.quantity_boxes = boxesBe.replace(/,/g, "");
    }
  }

  fields.tare_weight = _find(/[Tt]are\s*[Ww]eight\s*:\s*([\d,.]+)\s*kgs?/, text, "");

  // Per-container rows: try to build container_details with per-container seal + weight + boxes.
  // Covers MSC Belgian AN table format: "MSDU9110035 FX43539733 21,600.000 kgs. 1080"
  if (!fields.container_details) {
    const containersKnown = (fields.container_numbers as string[] | null) ||
      (fields.container_number ? [fields.container_number as string] : []);
    if (containersKnown.length > 1) {
      const rowPat = /\b([A-Z]{4})\s?(\d{7})\b\s+([A-Z0-9]{6,15})\s+([\d,]+(?:\.\d+)?)\s*kgs?\.?\s+([\d,]+)/gi;
      const rows = Array.from(text.matchAll(rowPat));
      if (rows.length === 0) {
        // Simpler: CONTAINER  SEAL  WEIGHT (no boxes column)
        const rowPat2 = /\b([A-Z]{4})\s?(\d{7})\b\s+([A-Z0-9]{6,15})\s+([\d,]+(?:\.\d+)?)\s*kgs?\.?/gi;
        const rows2 = Array.from(text.matchAll(rowPat2));
        if (rows2.length > 0 && rows2.length >= containersKnown.length) {
          const contDetails: ContainerDetail[] = [];
          const allSeals: string[] = [];
          for (const r of rows2) {
            const cnum = r[1] + r[2];
            const seal = r[3];
            const weight = String(Math.round(parseFloat(r[4].replace(/,/g, ""))));
            allSeals.push(seal);
            contDetails.push({
              container_number: cnum,
              seal_numbers: [seal],
              gross_weight: weight,
            });
          }
          fields.container_details = contDetails;
          fields.seal_numbers = allSeals;
        }
      } else if (rows.length >= containersKnown.length) {
        const contDetails: ContainerDetail[] = [];
        const allSeals: string[] = [];
        for (const r of rows) {
          const cnum = r[1] + r[2];
          const seal = r[3];
          const weight = String(Math.round(parseFloat(r[4].replace(/,/g, ""))));
          const boxes = r[5].replace(/,/g, "");
          allSeals.push(seal);
          contDetails.push({
            container_number: cnum,
            seal_numbers: [seal],
            gross_weight: weight,
            quantity_boxes: boxes,
          });
        }
        fields.container_details = contDetails;
        fields.seal_numbers = allSeals;
      }
    }
  }

  // MSC Belgian AN: per-container cargo blocks
  if (!fields.container_details) {
    const containersKnown = (fields.container_numbers as string[] | null) ||
      (fields.container_number ? [fields.container_number as string] : []);
    if (containersKnown.length > 1) {
      const blockPat = /\b([A-Z]{4}\d{7})\b[ \t]*\n[ \t]*Seal Number:\s+([^\n]+)/gi;
      const blockMatches = Array.from(text.matchAll(blockPat));
      if (blockMatches.length > 0 && blockMatches.length >= containersKnown.length) {
        const contDetails: ContainerDetail[] = [];
        const allSeals: string[] = [];
        for (let idx = 0; idx < blockMatches.length; idx++) {
          const bm = blockMatches[idx];
          const cnum = bm[1];
          const rawSeals = bm[2].split(/\s+/);
          const seals = rawSeals.filter(
            (t) => /[A-Za-z]/.test(t) && /\d/.test(t) && t.length >= 4
          );
          const prevEnd = idx > 0 ? (blockMatches[idx - 1].index! + blockMatches[idx - 1][0].length) : 0;
          const nextStart = idx + 1 < blockMatches.length ? blockMatches[idx + 1].index! : text.length;
          const searchText = text.substring(prevEnd, nextStart);
          const wm = searchText.match(/([\d,]+(?:\.\d+)?)\s*kgs?\./i);
          const weight = wm ? String(Math.round(parseFloat(wm[1].replace(/,/g, "")))) : null;
          const bmBoxes = searchText.match(/(\d+)\s+Box(?:es)?\b/i);
          const boxes = bmBoxes ? bmBoxes[1] : null;
          allSeals.push(...seals);
          const entry: ContainerDetail = { container_number: cnum, seal_numbers: seals };
          if (weight) {
            entry.gross_weight = weight;
          }
          if (boxes) {
            entry.quantity_boxes = boxes;
          }
          contDetails.push(entry);
        }
        if (contDetails.length > 0) {
          fields.container_details = contDetails;
          // Deduplicate seals, preserve order
          fields.seal_numbers = Array.from(new Map(allSeals.map((s): [string, string] => [s, s])).values());
        }
      }
    }
  }

  // Temperature
  fields.temperature = _find(/(\d{1,2}[.,]\d)\s*(?:DEGREES?\s*CELSIUS|°?\s*C\b)/, text, "i");

  // Shipped on board
  fields.shipped_on_board = _find(
    /SHIPPED ON BOARD DATE.*?\n?\s*(\d{1,2}[-\/.][A-Za-z]{3}[-\/.]\d{2,4})/, text, "i"
  );

  // Booking ref
  fields.booking_ref = _find(/(?:BOOKING\s*REF)[.\s:]*([A-Z0-9]{8,})/, text, "i");

  // ── MSC Bill of Lading specific overrides ────────────────────────────
  if (docType === "Bill of Lading") {
    // Shipper: actual shipper appears before "On behalf of Agrofair" marker.
    const shpM = text.match(
      /^([A-Z][^"\n]{4,100})\n(?:[^\n]*\n){1,4}"On behalf of Agrofair/mi
    );
    if (shpM) {
      fields.shipper = shpM[1].trim();
    }

    // Consignee
    const consBl = text.match(
      /^(AGROFAIR[^\n]+)\n(?:[^\n]*\n){0,3}\s*CONSIGNEE:/m
    );
    if (consBl) {
      fields.consignee = consBl[1].trim();
    }

    // Total gross weight: "Total Gross Weight :\n   64800.000  Kgs."
    const gwM = text.match(/Total\s+Gross\s+Weight\s*:\s*\n?\s*([\d,.]+)\s*Kgs?/i);
    if (gwM) {
      fields.gross_weight = String(Math.round(parseFloat(gwM[1].replace(/,/g, ""))));
    }

    // BL date
    const blDateM = text.match(
      /(\d{2}-[A-Za-z]+-\d{4})\s*\n\s*(?:Cargo shall not be delivered|PLACE AND DATE OF ISSUE)/
    );
    if (blDateM) {
      fields.bl_date = blDateM[1];
    }

    // Incoterm
    const itM = text.match(/\b(FOB|CIF|CFR|CIP|CPT|DAP|DDP|EXW|FCA|FAS)\b/);
    fields.incoterm = itM ? itM[1] : null;

    // Per-container details from rider page
    const containersKnown = (fields.container_numbers as string[] | null) ||
      (fields.container_number ? [fields.container_number as string] : []);
    if (containersKnown.length > 0 && !fields.container_details) {
      const cblockPat = /^\b([A-Z]{4}\d{7})\b[ \t]*$/gm;
      let cmatches = Array.from(text.matchAll(cblockPat));
      // Filter to known containers only
      cmatches = cmatches.filter((m) => containersKnown.includes(m[1]));
      if (cmatches.length > 0) {
        const positions = [...cmatches.map((m) => m.index!), text.length];
        const contDetails: ContainerDetail[] = [];
        const allSeals: string[] = [];
        for (let idx = 0; idx < cmatches.length; idx++) {
          const cm = cmatches[idx];
          const cnum = cm[1];
          const block = text.substring(cm.index!, positions[idx + 1]);
          // Gross weight
          const wmBl = block.match(/TOTAL\s+GROSS\s+WEIGHT\s*:\s*([\d,.]+)\s*KG/i);
          const weight = wmBl ? String(Math.round(parseFloat(wmBl[1].replace(/,/g, "")))) : null;
          // Seals
          const smBl = block.match(/Seal\s+Number:\s*\n((?:[ \t]*[A-Z0-9][^\n]*\n)+)/i);
          const sealsList: string[] = [];
          if (smBl) {
            for (const sealLine of smBl[1].split("\n")) {
              const trimmed = sealLine.trim();
              if (!trimmed || /[a-z]/.test(trimmed)) {
                break;
              }
              sealsList.push(..._parseSealLine(trimmed));
            }
          }
          allSeals.push(...sealsList);
          const entry: ContainerDetail = { container_number: cnum, seal_numbers: sealsList };
          if (weight) {
            entry.gross_weight = weight;
          }
          contDetails.push(entry);
        }
        if (contDetails.length > 0) {
          fields.container_details = contDetails;
          fields.seal_numbers = Array.from(new Map(allSeals.map((s): [string, string] => [s, s])).values());
        }
      }
    }
  }

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

function extractCma(text: string, docType: string): Fields {
  const fields: Fields = {};

  // BL number
  let bl = _find(/B\/L.*?ID:\s*([A-Z0-9]+)/, text, "i");
  if (!bl) {
    bl = _find(/\b(\d[A-Z]{2,4}\d[A-Z0-9]+)\b/, text, "i");
  }
  fields.bl_number = bl;

  // Vessel: CMA CGM + vessel name (exclude HOLLAND BV, SCAC)
  const vm = text.match(/(CMA\s*CGM\s+(?!HOLLAND|SCAC)[A-Z]{3,}(?:\s+[A-Z]{3,})*)/);
  if (vm) {
    fields.vessel = vm[1].trim();
  }

  // Voyage: CTR number
  fields.voyage = _find(/CTR(\d{7})/, text, "i");

  // ETA: dd-MMM-yy or dd-MMM-yyyy
  fields.eta = _find(/(\d{2}-[A-Z]{3}-\d{2,4})/, text, "i");

  // Container
  fields.container_number = _findContainer(text);
  fields.seal_numbers = _findSeals(text);

  // Shipper
  const shipperM = text.match(new RegExp("PLEASE NOTE:\\s*(.+?)\\s*SHIPPER:", "s"));
  if (shipperM) {
    fields.shipper = _cleanMultiline(shipperM[1].substring(0, 200));
  } else {
    const sm = text.match(/of\s*([A-Z][A-Z\s,.]+?(?:SA|SRL|S\.A\.|S\.R\.L\.))/);
    if (sm) {
      fields.shipper = sm[1].trim();
    }
  }

  // Consignee
  const consM = text.match(new RegExp("SHIPPER:\\s*\\n?\\s*(.+?)\\s*CONSIGNEE:", "s"));
  if (consM) {
    fields.consignee = _cleanMultiline(consM[1].substring(0, 200));
  } else {
    const cm = text.match(/CONSIGNEE.*?\n\s*(AGRO\w+[^\n]+)/i);
    if (cm) {
      fields.consignee = cm[1].trim().substring(0, 200);
    }
  }

  // Ports
  const polRaw = _find(/POL\/POD.*?:\s*\n?\s*(.+?)(?:\n|$)/, text, "i");
  if (polRaw && polRaw.includes(",")) {
    const parts = polRaw.split(",").map((p) => p.trim());
    if (parts.length >= 1) {
      fields.port_of_loading = parts[0];
    }
  }
  if (!fields.port_of_loading) {
    fields.port_of_loading = _find(/\b(MOIN|SAN JOSE)\b/, text, "i");
  }
  if (!fields.port_of_discharge) {
    fields.port_of_discharge = _find(/\b(ROTTERDAM)\b/, text, "i");
  }

  // Weight
  fields.gross_weight = _find(/(\d{4,6}[.,]\d{1,3})\s/, text, "i");
  fields.tare_weight = _find(/\b(\d{4})\s+\d{2}[.,]\d{3}\b/, text, "i");

  // Temperature
  fields.temperature = _find(/(\d{1,2}[.,]\d)\s*(?:degrees?\s*[Cc]elsius|°?\s*C\b)/, text, "i");

  // Shipped on board
  fields.shipped_on_board = _find(/(\d{1,2}\s+[A-Z]{3}\s+\d{4})\s*(?:ZERO|$)/, text, "i");

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

function extractMaersk(text: string, docType: string): Fields {
  const fields: Fields = {};

  // BL number: MAEU prefix + digits, or standalone booking number
  let bl = _find(/MAEU\s*\n?\s*(\d{6,12})/, text, "i");
  if (!bl) {
    bl = _find(/B\/L\s*(?:No\.?|:)?\s*\n?\s*(\d{6,12})/, text, "i");
  }
  if (!bl) {
    bl = _find(/Booking\s*No\.?\s*\n?\s*(\d{6,12})/, text, "i");
  }
  fields.bl_number = bl;

  // Vessel
  const vm = text.match(new RegExp("(?:^|\\n)\\s*(MAERSK\\s+[A-Z].*?)(?=\\s*\\n\\s*V\\n|V\\noyage|Voyage)", "s"));
  if (vm) {
    const vessel = vm[1].replace(/\s*\n\s*/g, "").trim();
    if (!/^MAERSK\s+(Line|A\/S|B\/L|COM)/.test(vessel)) {
      fields.vessel = vessel;
    }
  }

  // Voyage
  fields.voyage = _find(/oyage\s*No\.?\s*\n?\s*(\d{2,4}[A-Z]?)/, text, "i");

  // ETA: yyyy-mm-dd format
  fields.eta = _find(/(?:On\/or About|ETA)\s*(?:Date)?\s*\n?\s*(\d{4}-\d{2}-\d{2})/, text, "i");

  // Container
  fields.container_number = _findContainer(text);

  // Seals: Customs Seal pattern
  const customsSeal = _find(/Customs\s*Seal\s*:\s*([A-Z0-9]{6,})/, text, "i");
  if (customsSeal) {
    fields.seal_numbers = [customsSeal];
  } else {
    fields.seal_numbers = _findSeals(text);
  }

  // Shipper
  const shipperM = text.match(
    /Shipper.*?\n\s*((?:[A-Z][^\n]+\n?){1,4}?)(?=\s*On\s*w|Place of R|$)/i
  );
  if (shipperM) {
    fields.shipper = _cleanMultiline(shipperM[1].substring(0, 200));
  }

  // Consignee
  const consM = text.match(
    /Consignee.*?\n\s*((?:AGRO|[A-Z])[^\n]+(?:\n[^\n]+){0,3}?)(?=\s*(?:Notify|Port|TEL))/i
  );
  if (consM) {
    fields.consignee = _cleanMultiline(consM[1].substring(0, 200));
  }

  // Ports
  let pol: string | null = _find(/ort of Loading\s*\n?\s*([A-Za-z]{3,})/, text, "i");
  if (!pol) {
    pol = _find(/(Paita|PAITA|Callao|CALLAO)/, text, "");
    if (!pol) {
      const polM = text.match(/\bP\n(aita)\b/);
      if (polM) {
        pol = "Paita";
      }
    }
  }
  fields.port_of_loading = pol;
  let pod: string | null = _find(/ort of Discharge\s*\n?\s*([A-Za-z]{3,})/, text, "i");
  if (!pod) {
    pod = _find(/(Antwerp|ANTWERP|Rotterdam|ROTTERDAM)/, text, "");
  }
  fields.port_of_discharge = pod;

  // Weight
  fields.gross_weight = _find(/(\d{4,6}[.,]\d{3})\s*KGS/, text, "i");

  // Temperature
  fields.temperature = _find(/[Tt]emperature:\s*(\d{1,2}[.,]\d)\s*C/, text, "");

  // SOB date
  fields.shipped_on_board = _find(
    /Shipped on Board.*?(\d{4}-\d{2}-\d{2}|\d{1,2}[-\/.][A-Za-z]{3,}[-\/.]\d{2,4})/,
    text, "is"
  );

  // Freight
  if (/FREIGHT\s*COLLECT/i.test(text)) {
    fields.freight = "COLLECT";
  } else if (/FREIGHT\s*PREPAID/i.test(text)) {
    fields.freight = "PREPAID";
  }

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

function extractHapag(text: string, docType: string): Fields {
  const fields: Fields = {};

  // BL / SWB number: HLCU... pattern
  fields.bl_number = _find(/(HLCU[A-Z]{2}\d{7,13})/, text, "i");

  // Vessel
  const vm = text.match(/VESSEL\s*NAME:\s*([A-Z][A-Z\s]+?)\s*VOYAGE:/);
  if (vm) {
    fields.vessel = vm[1].trim();
  } else {
    const vm2 = text.match(/^\s{3,}([A-Z]{3,}\s+EXPRESS(?:\s+[A-Z]+)?)\s*$/m);
    if (vm2) {
      fields.vessel = vm2[1].trim();
    } else {
      const vm3 = text.match(
        /EORI.*?\n\s*\n?\s*\d{4,5}[A-Z]?\s*\n\s*([A-Z]{3,}\s+[A-Z]+(?:\s+[A-Z]+)*)\s*$/m
      );
      if (vm3) {
        fields.vessel = vm3[1].trim();
      }
    }
  }

  // Voyage
  let voy = _find(/VOYAGE:\s*(\d{2,5}[A-Z]?)/, text, "i");
  if (!voy) {
    voy = _find(/^\s+(\d{4,5}[A-Z])\s*$/m, text, "m");
  }
  fields.voyage = voy;

  // ETA
  fields.eta = _find(
    /(\d{1,2}\.(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\.\d{4})/,
    text, "i"
  );

  // Container: HLBU pattern or standard
  const cm = text.match(/(HLBU\s*\d{7})/);
  if (cm) {
    fields.container_number = cm[1].replace(/ /g, "");
  } else {
    fields.container_number = _findContainer(text);
  }

  // Seals
  const sealM = Array.from(
    text.matchAll(/SEALS?\s*:\s*(?:[^\n]*\n)?\s*([A-Z0-9]{6,15})/gi)
  ).map((m) => m[1]);
  const filteredSealM = sealM.filter((s) => /\d/.test(s));
  if (filteredSealM.length > 0) {
    fields.seal_numbers = Array.from(new Set(filteredSealM));
  } else {
    fields.seal_numbers = _findSeals(text);
  }

  // Shipper
  const shipperM = text.match(
    /Shipper:\s*\n((?:\s+[^\n]+\n){1,6}?)(?=\s+(?:SEA WAYBILL|Consignee|\d{5,}))/
  );
  if (shipperM) {
    fields.shipper = _cleanMultiline(shipperM[1].substring(0, 200));
  }

  // Consignee
  const consM = text.match(
    /Consignee:\s*\n((?:\s+[^\n]+\n){1,5}?)(?=\s+(?:Notify|HAPAG|BRANCH|GGN))/
  );
  if (consM) {
    fields.consignee = _cleanMultiline(consM[1].substring(0, 200));
  }

  // Ports
  let polH = _find(/PORT OF LOADING:\s*([A-Z][A-Za-z\s,]+?)(?:\n|$)/, text, "i");
  if (!polH) {
    const polM = text.match(/^\s+(PAITA[^\n]+?)\s{3,}(ROTTERDAM)/m);
    if (polM) {
      polH = polM[1].trim();
    }
  }
  fields.port_of_loading = polH;
  fields.port_of_discharge = _find(/\b(ROTTERDAM)\b/, text, "i");

  // Weight (European comma: 22460,000 KGM)
  fields.gross_weight = _find(/(\d[\d.,]+)\s*KGM/, text, "i");
  const nw = _find(/NW:\s*([\d.,]+)\s*KG/, text, "i");
  if (nw) {
    fields.nett_weight = nw;
  }

  // Temperature (European comma: +13,8 C)
  fields.temperature = _find(/\+?(\d{1,2}[.,]\d)\s*C\b/, text, "i");

  // Shipped on board
  fields.shipped_on_board = _find(
    /SHIPPED ON BOARD[,\s]*DATE\s*[:\s]*(\d{1,2}[.\/][A-Z]{3}[.\/]\d{4})/, text, "i"
  );

  // Freight
  if (/SEA\s*FREIGHT\s*COLLECT|FREIGHT\s*COLLECT/i.test(text)) {
    fields.freight = "COLLECT";
  } else if (/FREIGHT\s*PREPAID/i.test(text)) {
    fields.freight = "PREPAID";
  }

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

function extractFdd(text: string, docType: string): Fields {
  const fields: Fields = {};

  // House BL number
  let hbl = _find(/(?:HB\/L\s+number|HB\/L\s*No)[:\s]*([A-Z0-9]+)/, text, "i");
  if (!hbl) {
    hbl = _find(/(HBL\w{6,})/, text, "i");
  }
  fields.bl_number = hbl;

  // Master BL number
  let master = _find(/(?:MB\/L\s+number|Master\s+Bill\s+of\s+Lading)\s*:\s*([A-Z0-9]+)/, text, "i");
  if (!master) {
    master = _find(/(COS[CU][A-Z0-9]{8,})/, text, "i");
  }
  if (master) {
    fields.master_bl = master;
  }

  // Vessel
  fields.vessel = _find(/Vessel:\s*([A-Z][A-Z\s]+?)(?:\n|$)/, text, "i");
  if (!fields.vessel) {
    const vm = text.match(/([A-Z]{3,}\s+EXPRESS)\s+\d{4}[A-Z]/);
    if (vm) {
      fields.vessel = vm[1];
    }
  }

  // Voyage
  fields.voyage = _find(/Voyage:\s*(\d{2,5}[A-Z]?)/, text, "i");
  if (!fields.voyage) {
    fields.voyage = _find(/EXPRESS\s+(\d{4}[A-Z])/, text, "i");
  }

  // ETA / Arrival
  fields.eta = _find(/Arrival:\s*(\d{1,2}\s+\w{3}\s+\d{4})/, text, "i");

  // Container
  fields.container_number = _findContainer(text);

  // Seal
  let seal = _find(/(?:Seal\s*number|SEAL)[:\s]+(\d{6,15})/, text, "i");
  if (!seal) {
    seal = _find(/[A-Z]{4}\d{7}\s+(\d{6,15})/, text, "i");
  }
  if (seal) {
    fields.seal_numbers = [seal];
  }

  // Shipper
  const shipperM = text.match(
    /Shipper\s+Consignee\s*\n((?:[^\n]+\n){1,4}?)(?=Agro\s*Fair|General|Koopliedenweg)/i
  );
  if (shipperM) {
    const lines = shipperM[1].trim().split("\n");
    const shipperLines = lines
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().includes("agro"));
    if (shipperLines.length > 0) {
      fields.shipper = shipperLines.join(" ");
    }
  }
  if (!fields.shipper) {
    const sm = text.match(/(?:EXPORTER|2\.\s*EXPORTER)\s*\n?\s*([A-Z][^\n]+)/);
    if (sm) {
      fields.shipper = sm[1].trim();
    }
  }

  // Consignee
  let consFdd = text.match(/Consignee\s*\n\s*(Agro\s*Fair[^\n]+)/i);
  if (!consFdd) {
    consFdd = text.match(/CONSIGNED TO\s*\n?\s*([A-Z][^\n]+)/);
  }
  if (consFdd) {
    fields.consignee = consFdd[1].trim().substring(0, 200);
  }

  // Ports
  fields.port_of_loading = _find(/From:\s*([A-Za-z]+)/, text, "i");
  if (!fields.port_of_loading) {
    fields.port_of_loading = _find(/\b(Caucedo)\b/, text, "i");
  }
  fields.port_of_discharge = _find(/To:\s*([A-Za-z]+)/, text, "i");
  if (!fields.port_of_discharge) {
    fields.port_of_discharge = _find(/\b(Rotterdam)\b/, text, "i");
  }

  // Weight: "21600kg" or "21,600.00 Kg"
  fields.gross_weight = _find(/(\d[\d,.]+)\s*(?:[Kk]g|KGS)/, text, "i");

  // Temperature
  fields.temperature = _find(/TEMPERA?\s*TURE:\s*(\d{1,2}[.,]\d)\s*C/, text, "i");

  // Freight
  if (/FREIGHT\s*COLLECT/i.test(text)) {
    fields.freight = "COLLECT";
  } else if (/FREIGHT\s*PREPAID/i.test(text)) {
    fields.freight = "PREPAID";
  }

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

function extractSeatrade(text: string, docType: string): Fields {
  const fields: Fields = {};

  // BL number: SYZSA... pattern
  fields.bl_number = _find(/(SYZSA\w+)/, text, "i");

  // Vessel: "MV CHARLES ISLAND" or standalone vessel name
  const vesselM = text.match(
    /(?:MV\s+|OCEAN VESSEL\s*\n?\s*)([A-Z][A-Z\s]+?)(?:\s*[-\u2013]|\s*ETA|\n)/
  );
  if (vesselM) {
    fields.vessel = vesselM[1].trim();
  }

  // Voyage: after vessel name dash
  fields.voyage = _find(/(?:CHARLES|ISLAND|vessel)\s*[-\u2013]\s*(SR\w+)/, text, "i");

  // ETA
  fields.eta = _find(/ETA\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/, text, "i");

  // Container
  fields.container_number = _findContainer(text);
  fields.seal_numbers = _findSeals(text);

  // Shipper (from OCR text)
  const shipperM = text.match(
    /[Ss]hipper\s*\n((?:[^\n]+\n){1,5}?)(?=\|\s*\d|Consignee|EORI)/
  );
  if (shipperM) {
    fields.shipper = _cleanMultiline(shipperM[1].substring(0, 200));
  }

  // Consignee
  const consM = text.match(
    /Consignee[^\n]*\n((?:[^\n]+\n){1,4}?)(?=\d\s*\|\s*Notify|Notify)/i
  );
  if (consM) {
    fields.consignee = _cleanMultiline(consM[1].substring(0, 200));
  }

  // Ports
  fields.port_of_loading = _find(/Port of Loading\s*\n?\s*([A-Za-z]+)/, text, "i");
  fields.port_of_discharge = _find(/Port of Discharge\s*\n?\s*([A-Za-z]+)/, text, "i");
  if (!fields.port_of_discharge) {
    fields.port_of_discharge = _find(/(Flushing|Vlissingen|Rotterdam)/, text, "i");
  }

  // Weight
  fields.gross_weight = _find(/(\d[\d,.]+)\s*kgs/, text, "i");
  fields.tare_weight = _find(/[Tt]are[:\s]*(\d[\d,.]+)\s*(?:kg)?/, text, "i");
  const nw = _find(/NW[:\s]*([\d,.]+)\s*(?:KG|kgs)?/, text, "i");
  if (nw) {
    fields.nett_weight = nw;
  }

  // Temperature
  fields.temperature = _find(/TEMPERATURE[:\s]*(\d{1,2}[.,]\d{1,2})\s*C/, text, "i");

  // Shipped on board (BL)
  fields.shipped_on_board = _find(/(?:date of issue|Lima)\s+(\d{1,2}\s+\w{3}\s+\d{4})/, text, "i");

  // Freight
  if (/FREIGHT\s*COLLECT|Freight\s*Collect/.test(text)) {
    fields.freight = "COLLECT";
  }

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

function extractSbd(text: string, docType: string): Fields {
  const fields: Fields = {};

  // BL number: HBL + digits + SBD + optional letter
  fields.bl_number = _find(/(HBL\d+SBD[A-Z]?)/, text, "i");

  // Vessel and voyage: "CMA CGM JACQUES JOSEPH0WCMWN1MA" (concatenated)
  const vm = text.match(/(CMA\s+CGM\s+[A-Z]+(?:\s+[A-Z]+)?)([0-9][A-Z0-9]+MA)\b/);
  if (vm) {
    fields.vessel = vm[1].trim();
    fields.voyage = vm[2].trim();
  }

  // Shipped on board: "February 21 , 2026"
  const MONTHS = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
  const sobM = text.match(new RegExp(`(${MONTHS}[\\s\\n]+\\d{1,2}[\\s\\n,]+\\d{4})`));
  if (sobM) {
    fields.shipped_on_board = sobM[1].replace(/[\s\n]+/g, " ").trim();
  }

  // Container: after "CNT:"
  let cnt = _find(/CNT:\s*([A-Z]{4}\d{7})/, text, "i");
  if (!cnt) {
    cnt = _findContainer(text);
  }
  fields.container_number = cnt;

  // Seal: after "SEAL:"
  const seal = _find(/SEAL:\s*([A-Z0-9]{6,15})/, text, "i");
  if (seal) {
    fields.seal_numbers = [seal];
  } else {
    fields.seal_numbers = _findSeals(text);
  }

  // Number of packages (colli): "<qty> BOX"
  fields.number_of_packages = _find(/(\d+)\s+BOX\b/, text, "i");

  // Gross weight: "21,600.00 Kg" in the goods table
  let gwSbd = _find(/([\d]{1,3}(?:,\d{3})+\.\d{2})\s*Kg\b/, text, "i");
  if (!gwSbd) {
    gwSbd = _find(/(\d[\d,.]+)\s*(?:Kg|KGS|kgs)\b/, text, "i");
  }
  fields.gross_weight = gwSbd;

  // Temperature: "TEMPERATURE: 13.8 C"
  fields.temperature = _find(/TEMPERATURE:\s*(\d{1,2}[.,]\d)\s*C/, text, "i");

  // Ports
  fields.port_of_loading = _find(/\b(Caucedo|CAUCEDO|Paita|PAITA)\b/, text, "");
  fields.port_of_discharge = _find(/\b(Rotterdam|ROTTERDAM|Antwerp|ANTWERP)\b/, text, "");

  // Shipper (exporter): last company name before "ON BEHALF OF AGROFAIR"
  const sm = text.match(
    /([A-Z][A-Z ,\.]+(?:SRL|S\.R\.L\.|SA|S\.A\.))\s*\n\s*ON\s+BEHALF/i
  );
  if (sm) {
    fields.shipper = sm[1].trim();
  }

  // Consignee
  const consSbd = text.match(/(AGROFAIR\s+BENELUX\s+BV|AGROFAIR[^\n]+)/i);
  if (consSbd) {
    fields.consignee = consSbd[1].trim().substring(0, 200);
  }

  // Freight
  if (/FREIGHT\s*COLLECT/i.test(text)) {
    fields.freight = "COLLECT";
  } else if (/FREIGHT\s*PREPAID/i.test(text)) {
    fields.freight = "PREPAID";
  }

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

// ── Generic Extraction ─────────────────────────────────────────────────

function _genericExtract(text: string, docType: string): Fields {
  const fields: Fields = {};
  fields.container_number = _findContainer(text);
  fields.seal_numbers = _findSeals(text);
  fields.gross_weight = _find(/(\d[\d,.]+)\s*(?:KGS|KGM|kgs)/, text, "i");
  fields.temperature = _find(/(\d{1,2}[.,]\d)\s*(?:degrees?\s*[Cc]elsius|°?\s*C\b)/, text, "i");

  // Try common BL patterns
  fields.bl_number = _find(
    /(?:B\/?L|Bill of Lading|Sea\s*Waybill)\s*(?:No\.?|Number|#)?[:\s]*([A-Z0-9]{6,20})/,
    text, "i"
  );
  fields.vessel = _find(/(?:Vessel|VESSEL)[:\s]*\n?\s*([A-Z][A-Z\s]+?)(?:\n|$)/, text, "i");
  fields.port_of_loading = _find(/(?:Port of Loading|POL)[:\s]*\n?\s*([A-Za-z\s,]+?)(?:\n|$)/, text, "i");
  fields.port_of_discharge = _find(/(?:Port of Discharge|POD)[:\s]*\n?\s*([A-Za-z\s,]+?)(?:\n|$)/, text, "i");

  _buildContainerDetailsFromParallel(fields);
  return _cleanup(fields);
}

// ── Template Router ────────────────────────────────────────────────────

const CARRIER_EXTRACTORS: Record<string, CarrierExtractor> = {
  "MSC": extractMsc,
  "CMA CGM": extractCma,
  "Maersk": extractMaersk,
  "Hapag-Lloyd": extractHapag,
  "FDD": extractFdd,
  "Seatrade": extractSeatrade,
  "SBD": extractSbd,
};

export function extractByCarrier(
  text: string,
  docType: string,
  filename: string,
): CarrierExtractionResult {
  const carrier = detectCarrier(text);
  console.info(`[carrier-templates] ${filename}: Carrier detected: ${carrier}`);

  const extractor = CARRIER_EXTRACTORS[carrier];
  let fields: Fields;
  let method: "carrier_template" | "generic";

  if (extractor) {
    fields = extractor(text, docType);
    method = "carrier_template";
  } else {
    fields = _genericExtract(text, docType);
    method = "generic";
  }

  // Field whitelists per doc type — keep only what matters
  if (docType === "Arrival Notice") {
    const keep = new Set([
      "bl_number", "vessel", "voyage", "eta",
      "container_number", "container_numbers", "number_of_packages",
      "shipper", "consignee",
      "port_of_loading", "port_of_discharge",
    ]);
    fields = Object.fromEntries(
      Object.entries(fields).filter(([k]) => keep.has(k))
    );
  } else if (docType === "Bill of Lading") {
    const keep = new Set([
      "bl_number", "vessel", "voyage",
      "carrier",
      "shipper", "consignee",
      "container_number", "container_numbers",
      "container_details", "seal_numbers",
      "gross_weight",
      "incoterm", "bl_date",
      "port_of_loading", "port_of_discharge",
    ]);
    fields = Object.fromEntries(
      Object.entries(fields).filter(([k]) => keep.has(k))
    );
  }

  const filledCount = Object.values(fields).filter((v) => v !== null && v !== undefined).length;
  console.info(
    `[carrier-templates] ${filename}: Carrier template extracted ${filledCount} fields`
  );

  return { carrier, fields, method };
}
