/**
 * Document-type-specific extraction templates.
 *
 * Similar to carrier-templates.ts (which handles AN/BL), this module
 * provides extraction logic for other document types:
 * - Invoice / Invoice with Origin Declaration
 * - FairTrade Invoice
 * - Packing List
 * - Certificate of Inspection (COI)
 * - Weighing Certificate (WC)
 *
 * Ported from AgroDash: Modules/DocManager/services/doc_templates.py
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ContainerDetail {
  container_number: string;
  order_number?: string;
  quantity_boxes?: string;
  amount?: string;
  gross_weight?: string;
  nett_weight?: string;
}

export interface LineItem {
  description?: string;
  quantity?: string;
  gross_weight?: string;
  nett_weight?: string;
  unit_price?: string;
  total_amount?: string;
}

export interface DocTypeExtractionResult {
  fields: Record<string, string | string[] | boolean | ContainerDetail[] | null>;
  method: "doc_template" | "none";
}

type Fields = Record<string, string | string[] | boolean | ContainerDetail[] | null>;

type DocExtractor = (text: string, docType: string, filename: string) => Fields;

// ── Helpers ─────────────────────────────────────────────────────────

function _find(pattern: string, text: string, flags: string = "i"): string | null {
  const m = new RegExp(pattern, flags).exec(text);
  return m && m[1] ? m[1].trim() : null;
}

function _findAll(pattern: string, text: string, flags: string = "i"): string[] {
  const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1] && m[1].trim()) {
      results.push(m[1].trim());
    }
  }
  return results;
}

function _findContainer(text: string): string | null {
  const m = /\b([A-Z]{4}\d{7})(?=[^A-Z\d]|$)/.exec(text);
  return m ? m[1] : null;
}

function _findAllContainers(text: string): string[] {
  const re = /\b([A-Z]{4}\d{7})(?=[^A-Z\d]|$)/g;
  const results = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.add(m[1]);
  }
  return Array.from(results);
}

function _clean(val: string | null): string | null {
  if (!val) {
    return null;
  }
  val = val.replace(/\s*\n\s*/g, " ").trim().replace(/[.,;:]+$/, "");
  return val || null;
}

function _cleanup(fields: Fields): Fields {
  const cleaned: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) {
      continue;
    }
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (!trimmed) {
        continue;
      }
      cleaned[k] = trimmed;
    } else if (Array.isArray(v)) {
      const filtered = (v as (string | ContainerDetail)[]).filter(
        (x): x is string | ContainerDetail => !!x,
      );
      if (filtered.length === 0) {
        continue;
      }
      // Re-check to assign the correct narrowed type
      if (typeof filtered[0] === "string") {
        cleaned[k] = filtered as string[];
      } else {
        cleaned[k] = filtered as ContainerDetail[];
      }
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// ── Line Item Parser ────────────────────────────────────────────────

/**
 * Parse product line items from invoice tables.
 *
 * Returns list of objects with keys: description, quantity, gross_weight,
 * nett_weight, unit_price, total_amount (all optional strings).
 */
function _parseInvoiceLineItems(text: string): LineItem[] {
  const items: LineItem[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      continue;
    }

    // Skip header lines, totals, and non-product lines
    if (
      /^(?:DESCRIPCION|TOTAL|SON:|SAY:|Elaborado|Version|Factura|Fecha|Semana|Destino|Puerto|CONTENEDOR|ORDENES|Sub|Op\.|IGV|Importe|Neto|NCF|Voyage|SELLO|Shipp)/i.test(
        stripped,
      )
    ) {
      continue;
    }

    // Dominican FRUECODOM format: "BANANA BIO xxx 18.14 KG  qty  gross  nett  price  total"
    let m = new RegExp(
      "(BANANA\\s+BIO[^\\d]*?(?:\\d{2}\\.\\d{2}\\s*KG)?)\\s+" +
        "([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)",
    ).exec(stripped);
    if (m) {
      items.push({
        description: m[1].trim(),
        quantity: m[2],
        gross_weight: m[3],
        nett_weight: m[4],
        unit_price: m[5],
        total_amount: m[6],
      });
      continue;
    }

    // Dominican format with dashes (no values filled): "BANANA BIO xxx 18.14 KG - - - 13,550 -"
    m = new RegExp(
      "(BANANA\\s+BIO[^\\d]*?(?:\\d{2}\\.\\d{2}\\s*KG)?)\\s+" +
        "-\\s+-\\s+-\\s+([\\d.,]+)\\s+-",
    ).exec(stripped);
    if (m) {
      items.push({
        description: m[1].trim(),
        unit_price: m[2],
      });
      continue;
    }

    // Peruvian format: "540.00 CAJ BANANO ORGANICO ... US $ 13.95 US $ 7,533.00"
    m = new RegExp(
      "([\\d.,]+)\\s+CAJ\\s+(.*?)US\\s*\\$\\s*([\\d.,]+)\\s*US\\s*\\$\\s*([\\d.,]+)",
    ).exec(stripped);
    if (m) {
      items.push({
        description: m[2].trim(),
        quantity: m[1],
        unit_price: m[3],
        total_amount: m[4],
      });
      continue;
    }

    // Ecuadorian AGRICERT format: "14.850000  30,472.20 CAJA CON BANANO ..."
    m = new RegExp(
      "^\\s*([\\d.]+)\\s+([\\d.,]+)\\s+(CAJA\\s+CON\\s+BANANO.*)",
    ).exec(stripped);
    if (m) {
      let descPart = m[3].trim();
      // Try to extract quantity from end of description
      const qtyM = /\s+([\d,]+\.\d{2})\s*$/.exec(descPart);
      let qty: string | undefined;
      if (qtyM) {
        qty = qtyM[1];
        descPart = descPart.slice(0, qtyM.index).trim();
      }
      items.push({
        description: descPart,
        unit_price: m[1],
        total_amount: m[2],
        quantity: qty,
      });
      continue;
    }

    // AGRICERT continuation line: "CARREFOUR 22XU 2,052.00" (brand suffix + quantity)
    if (items.length > 0 && /^[A-Z]+\s+\d{2}XU\s+[\d,]+\.\d{2}/.test(stripped)) {
      const contM = /^([A-Z]+)\s+\d{2}XU\s+([\d,]+\.\d{2})/.exec(stripped);
      if (contM) {
        const prev = items[items.length - 1];
        prev.description = (prev.description || "") + " " + contM[1];
        if (!prev.quantity) {
          prev.quantity = contM[2];
        }
        continue;
      }
    }
  }

  return items;
}

// ── Brand Extractor ─────────────────────────────────────────────────

/**
 * Extract the brand/mark name from a product description line.
 *
 * Strips common prefixes like 'BANANA BIO', 'BANANO ORGANICO', 'CAJA CON BANANO'
 * and weight suffixes to get the brand identifier.
 */
function _extractBrandFromDescription(desc: string): string {
  let brand = desc;
  // Remove common product prefixes
  brand = brand
    .replace(
      /^(?:BANANA\s+BIO\s+|BANANO\s+ORGANICO\s+|CAJA\s+CON\s+BANANO\s+(?:ORGANICO\s+)?)/i,
      "",
    )
    .trim();
  // Remove weight suffix like "18.14 KG" or "22XU"
  brand = brand.replace(/\s*\d{2}\.\d{2}\s*KG\s*$/, "").trim();
  brand = brand.replace(/\s*\d{2}XU\s*$/, "").trim();
  // Remove "MARCA" prefix
  brand = brand.replace(/^MARCA\s+/i, "").trim();
  return brand || desc;
}

// ── Multi-Container Assessment ──────────────────────────────────────

interface MultiContainerAssessment {
  needs_manual_review?: boolean;
  manual_reason?: string;
  container_details?: ContainerDetail[];
}

/**
 * Assess whether per-container breakdown is possible for multi-container invoices.
 */
function _assessMultiContainer(
  containers: string[],
  lineItems: LineItem[],
): MultiContainerAssessment {
  const nContainers = containers.length;
  if (nContainers <= 1) {
    return {};
  }

  // Extract unique brands from line items
  const brands = new Set<string>();
  for (const item of lineItems) {
    const desc = item.description || "";
    if (desc) {
      brands.add(_extractBrandFromDescription(desc));
    }
  }

  // Items with actual values (quantity/total filled in, not just unit price)
  const valuedItems = lineItems.filter((it) => it.quantity || it.total_amount);

  // Multiple distinct brands across multiple containers -> manual
  if (brands.size > 1 && nContainers > 1) {
    return {
      needs_manual_review: true,
      manual_reason:
        `${brands.size} brands across ${nContainers} containers - ` +
        "per-container breakdown unclear",
    };
  }

  // Single brand (or no items parsed) across multiple containers -> try to split
  const result: MultiContainerAssessment = {};
  if (valuedItems.length > 0 && nContainers > 1 && brands.size <= 1) {
    let totalQty = 0;
    let totalAmount = 0;
    let totalGross = 0;
    let totalNett = 0;

    for (const item of valuedItems) {
      const qtyStr = item.quantity || "";
      if (qtyStr) {
        totalQty += parseInt(
          String(parseFloat(qtyStr.replace(/\./g, "").replace(",", "."))),
          10,
        );
      }
      const amtStr = item.total_amount || "";
      if (amtStr) {
        totalAmount += parseFloat(amtStr.replace(/\./g, "").replace(",", "."));
      }
      const gwStr = item.gross_weight || "";
      if (gwStr) {
        totalGross += parseFloat(gwStr.replace(/\./g, "").replace(",", "."));
      }
      const nwStr = item.nett_weight || "";
      if (nwStr) {
        totalNett += parseFloat(nwStr.replace(/\./g, "").replace(",", "."));
      }
    }

    if (totalQty > 0) {
      const perContainer: ContainerDetail[] = [];
      const qtyPer = Math.floor(totalQty / nContainers);
      for (const cont of containers) {
        const detail: ContainerDetail = {
          container_number: cont,
          quantity_boxes: String(qtyPer),
        };
        if (totalAmount > 0) {
          detail.amount = (totalAmount / nContainers).toFixed(2);
        }
        if (totalGross > 0) {
          detail.gross_weight = (totalGross / nContainers).toFixed(2);
        }
        if (totalNett > 0) {
          detail.nett_weight = (totalNett / nContainers).toFixed(2);
        }
        perContainer.push(detail);
      }
      result.container_details = perContainer;
    }
  }

  return result;
}

// ── Invoice / Invoice with Origin Declaration ───────────────────────

/**
 * Extract fields from producer invoices (with or without origin declaration).
 *
 * These are commercial invoices for banana shipments. Common patterns:
 * - Peruvian invoices: "FACTURA ELECTRONICA", RUC number, Soles/USD
 * - Ecuadorian invoices: RUC, "FACTURA", CONTENEDOR field
 * - Dominican invoices: "Factura No", RNC number
 * - Colombian invoices: invoice header + product table
 */
function extractInvoice(text: string, docType: string, _filename: string): Fields {
  const fields: Fields = {};

  // Invoice number: various formats
  // Peruvian: "FACTURA ELECTRONICA F102-00003314" or "F001-00000740"
  let inv = _find(
    "(?:FACTURA\\s*(?:ELECTRONICA)?)\\s*\\n?\\s*([A-Z]\\d{3}-\\d{5,12})",
    text,
  );
  if (!inv) {
    // Standalone invoice number pattern: letter + 3 digits + dash + digits
    inv = _find("^([A-Z]\\d{3}-\\d{5,12})\\s*$", text, "m");
  }
  if (!inv) {
    // Ecuadorian: "FACTURA N. 002-001-000004666" or "FACTURA  001001-000000231"
    inv = _find(
      "FACTURA\\s+(?:N\\.?\\s*)?(\\d{3,6}-\\d{3,6}(?:-\\d{6,12})?)",
      text,
    );
  }
  if (!inv) {
    // Dominican: "Factura No.: [2025-08]AGFR"
    inv = _find("Factura\\s*No\\.?:?\\s*\\[?([^\\]\\n]{3,25})\\]?", text);
  }
  if (!inv) {
    // English format: "Invoice #604" or "Invoice Number: 604"
    inv = _find(
      "(?:Invoice)\\s*(?:#|No\\.?|Number)\\s*:?\\s*(\\d{3,10})",
      text,
    );
  }
  fields.invoice_number = inv;

  // Invoice date
  let date = _find(
    "Fecha\\s*(?:de\\s*)?(?:Emisi[oó]n|Facturacion)\\s*:?\\s*(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4})",
    text,
  );
  if (!date) {
    date = _find(
      "(?:Date|Fecha)\\s*:?\\s*\\n?\\s*\\w+,?\\s*(\\d{1,2}\\s+de\\s+\\w+\\s+del?\\s+\\d{4})",
      text,
    );
  }
  if (!date) {
    date = _find(
      "(?:Date|Fecha)\\s*:?\\s*(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4})",
      text,
    );
  }
  fields.invoice_date = date;

  // Total amount
  let total = _find(
    "(?:Importe\\s*Total|TOTAL|Valor\\s*Venta|Total\\s*Amount)\\s*:?\\s*\\$?\\s*(?:US\\s*\\$?\\s*)?([\\d.,]+)",
    text,
  );
  if (!total) {
    total = _find(
      "(?:TOTAL\\s*AMOUNT\\s*FOB)[:\\s]*.*?(?:US\\s*D?\\s*)?(\\d[\\d.,]+)",
      text,
    );
  }
  fields.total_amount = total;

  // Currency
  if (/US\s*\$|USD|DOLAR/i.test(text)) {
    fields.currency = "USD";
  } else if (/EUR|EURO/i.test(text)) {
    fields.currency = "EUR";
  }

  // Containers (may be multiple)
  let containers = _findAllContainers(text);
  // Also check "CONTENEDOR:" field which may have formatted numbers like SUDU:621242-8
  const contFieldRe = /(?:CONTENEDOR|CONTAINER)\s*[:\s]*([^\n]{5,80})/gi;
  let contFieldM: RegExpExecArray | null;
  while ((contFieldM = contFieldRe.exec(text)) !== null) {
    // Parse formatted containers: SUDU:621242-8 or SUDU6212428
    const formattedRe = /([A-Z]{4})[:\s]*(\d{6,7})-?\d?/g;
    let fmtM: RegExpExecArray | null;
    while ((fmtM = formattedRe.exec(contFieldM[1])) !== null) {
      const full = fmtM[1] + fmtM[2].replace("-", "");
      if (full.length === 11) {
        containers.push(full);
      }
    }
  }
  containers = Array.from(new Set(containers));
  fields.container_numbers = containers;
  if (containers.length > 0) {
    fields.container_number = containers[0];
  }

  // Seal numbers
  const sealsRe = /SELLO[S:\s]*([^\n]+)/gi;
  const sealNumbers: string[] = [];
  let sealsM: RegExpExecArray | null;
  while ((sealsM = sealsRe.exec(text)) !== null) {
    const sealTokens = sealsM[1].match(/[A-Z0-9]{6,15}/g);
    if (sealTokens) {
      sealNumbers.push(...sealTokens);
    }
  }
  const filteredSeals = sealNumbers.filter((s) => /\d/.test(s));
  if (filteredSeals.length > 0) {
    fields.seal_numbers = Array.from(new Set(filteredSeals));
  }

  // Producer/shipper name — look for company name at top of invoice
  // Peruvian cooperatives
  let producer = _find("(COOPERATIVA\\s+AGRARIA[^\\n]{5,80})", text, "");
  if (!producer) {
    producer = _find(
      "(ASOCIACION\\s+(?:DE\\s+)?(?:TRABAJADORES|PRODUCTORES|BANANEROS)[^\\n]{5,80})",
      text,
      "",
    );
  }
  if (!producer) {
    // Ecuadorian: company name after "EXPORTER:" or at top
    producer = _find("EXPORTER:\\s*([^\\n]{5,80})", text);
  }
  if (!producer) {
    // Dominican: company name in header
    producer = _find("(Fruta?\\s+Ecol[oó]gica[^\\n]{5,60})", text);
  }
  if (!producer) {
    // "HACIENDA" pattern
    producer = _find("(HACIENDA\\s+[^\\n]{5,60})", text, "");
  }
  if (!producer) {
    // Company name at first line (Peruvian format: first non-empty line)
    for (const line of text.split("\n")) {
      const stripped = line.trim();
      if (stripped && stripped.length > 10 && /^[A-Z]/.test(stripped)) {
        // Skip common header/address lines and the buyer (Agrofair)
        if (
          /^(?:R\.?U\.?C|FACTURA|Pagina|Central|INVOICE|Messrs|AGROFAIR|Koopliedenweg|NETHERL|BAREND|Address|Fecha|Señor|Tel|Cel|NUMERO|CLAVE|CONTRIBU|AMBIENTE|TIPO DE|NO ENVI|PRODUCCION)/i.test(
            stripped,
          )
        ) {
          continue;
        }
        producer = stripped.slice(0, 80);
        break;
      }
    }
  }
  fields.producer = _clean(producer);

  // Week number
  fields.week = _find(
    "(?:SEMANA|WEEK)\\s*(?:N[°o]\\.?)?\\s*:?\\s*(\\d{1,2})",
    text,
  );

  // Order/reference numbers
  fields.order_numbers = _find(
    "(?:ORDEN|ORDER\\s*(?:NUMBER)?|REF(?:ERENCIA)?|Referencia)\\s*(?:N[°o]\\.?)?\\s*:?\\s*(\\d{4,6}(?:[/,]\\d{4,6})*)",
    text,
  );

  // Vessel — look for vessel name patterns
  let vessel = _find(
    "(?:VAPOR|NAVE)\\s*:?\\s*([A-Z][A-Z\\s]+?(?:\\s*/\\s*\\d{3,5}\\s*[A-Z]?)?)\\s*$",
    text,
    "mi",
  );
  if (!vessel) {
    // "Embarque/Shipment" followed by vessel name on next line(s)
    vessel = _find(
      "Embarque\\s*\\n?\\s*Shipment\\s*\\n?\\s*([A-Z][A-Z\\s]+\\d{3,5}[A-Z]?)",
      text,
    );
  }
  if (!vessel) {
    // "Vessel" label + known carrier vessel names
    vessel = _find(
      "(?:Vessel|Vapor)\\s*:?\\s*([A-Z][A-Z\\s]+?(?:EXPRESS|ISLAND|MAERSK|MSC|CMA|BOURBON)[A-Z\\s]*)",
      text,
    );
  }
  if (!vessel) {
    // Known vessel name patterns in text (MSC xxx, CMA CGM xxx, etc.)
    const vesselM =
      /((?:MSC|CMA\s*CGM|MAERSK|JENS|HOOD|GUAYAQUIL|CARTAGENA|POLAR)\s+[A-Z]+(?:\s+[A-Z]+)?(?:\s+\d{3,5}[A-Z]?)?)/.exec(
        text,
      );
    if (vesselM) {
      vessel = vesselM[1].trim();
    }
  }
  fields.vessel = _clean(vessel);

  // Ports
  let pol = _find(
    "Puerto\\s*(?:de\\s*)?(?:Salida|Embarque)\\s*:?\\s*([A-Z][A-Za-z]{3,15})",
    text,
  );
  if (!pol) {
    if (/PAITA/.test(text)) {
      pol = "PAITA";
    } else if (/CAUCEDO/.test(text)) {
      pol = "CAUCEDO";
    } else if (/MOIN/.test(text)) {
      pol = "MOIN";
    }
  }
  fields.port_of_loading = pol;

  let pod = _find(
    "(?:DESTINO|Puerto\\s*(?:de\\s*)?Destino)\\s*:?\\s*([A-Z][A-Za-z]{3,15})",
    text,
  );
  if (!pod) {
    for (const port of ["ROTTERDAM", "ANTWERP", "VLISSINGEN", "AMBERES"]) {
      if (text.includes(port)) {
        pod = port;
        break;
      }
    }
  }
  fields.port_of_discharge = pod;

  // FLO ID (shipper's, not Agrofair's 1068)
  const floIds = _findAll("FLO\\s*ID\\s*:?\\s*(\\d{3,6})", text).filter(
    (f) => f !== "1068",
  );
  if (floIds.length > 0) {
    fields.flo_id = floIds[0];
  }

  // Gross/net weight
  fields.gross_weight = _find(
    "(?:Peso\\s*Bruto|Gross\\s*Weight|P\\.?B\\.?)\\s*:?\\s*([\\d.,]+)\\s*(?:Kg|KG)?",
    text,
  );
  fields.nett_weight = _find(
    "(?:Peso\\s*Neto|Net\\s*Weight|P\\.?N\\.?)\\s*:?\\s*([\\d.,]+)\\s*(?:Kg|KG)?",
    text,
  );

  // Quantity (boxes) — 3-4 digit number followed by box unit
  let qty = _find(
    "(?:TOTAL\\s*DE\\s*CAJAS|TOTAL\\s*BOXES?)\\s*:?\\s*([\\d.,]+)",
    text,
  );
  if (!qty) {
    // Look for box count: 1,080 or 1080 followed by box unit
    qty = _find("(\\d{1,2}[.,]?\\d{3})\\s*(?:CAJ|CAJA|cajas|Boxes)", text);
  }
  fields.quantity_boxes = qty;

  // Incoterm
  if (/\bFOB\b/.test(text)) {
    fields.incoterm = "FOB";
  } else if (/\bCIF\b/.test(text)) {
    fields.incoterm = "CIF";
  }

  // Origin declaration (for Invoice with OD)
  if (docType === "Invoice with Origin Declaration") {
    const authM = /authoris[az]tion\s+No\.?\s*([A-Z0-9/\-]+)/i.exec(text);
    if (authM) {
      fields.authorized_exporter_code = authM[1];
    } else {
      // Spanish/Dominican format
      const authEs =
        /exportador\s+(\w{5,30})\s+de los productos/i.exec(text);
      if (authEs) {
        fields.authorized_exporter_code = authEs[1];
      }
    }
  }

  // Multi-container assessment
  if (containers.length > 1) {
    fields.multi_container = true;
    const lineItems = _parseInvoiceLineItems(text);
    const assessment = _assessMultiContainer(containers, lineItems);
    if (assessment.needs_manual_review) {
      fields.needs_manual_review = true;
      fields.manual_reason = assessment.manual_reason ?? null;
    }
    if (assessment.container_details) {
      fields.container_details = assessment.container_details;
    }
  }

  return _cleanup(fields);
}

// ── FairTrade Invoice ───────────────────────────────────────────────

/**
 * Extract fields from FairTrade premium invoices.
 *
 * These are invoices for the FairTrade premium payment (~$1/box).
 * Paired with a regular producer invoice from the same shipper.
 */
function extractFairtradeInvoice(
  text: string,
  _docType: string,
  _filename: string,
): Fields {
  const fields: Fields = {};

  // Invoice number — the FT invoice's own number (at top of document)
  // Look for FACTURA ELECTRONICA header number first
  let inv = _find(
    "FACTURA\\s*ELECTRONICA\\s*\\n?\\s*([A-Z]?\\d{3,4}-\\d{3,12})",
    text,
  );
  if (!inv) {
    inv = _find("^([A-Z]\\d{3}-\\d{5,12})\\s*$", text, "m");
  }
  if (!inv) {
    inv = _find("Factura\\s*No\\.?:?\\s*\\[?([^\\]\\n]{3,25})\\]?", text);
  }
  fields.invoice_number = inv;

  // Invoice date
  fields.invoice_date = _find(
    "Fecha\\s*(?:de\\s*)?(?:Emisi[oó]n|Facturacion)\\s*:?\\s*(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4})",
    text,
  );

  // Total amount (premium total) — require digit in captured value
  let total = _find(
    "(?:Importe\\s*T\\s*otal|Importe\\s*Total)\\s*:?\\s*\\$?\\s*\\.?\\s*(\\d[\\d.,]*)",
    text,
  );
  if (!total) {
    // "3,240.00 Total Exonerado US $" — number before Total Exonerado
    total = _find("(\\d[\\d.,]+)\\s+Total\\s+Exonerado", text);
  }
  if (!total) {
    // "VALOR TOTAL US $... 2.160,00" — on same line only (not column headers)
    total = _find(
      "^[^\\n]*VALOR\\s*TOTAL\\s*(?:US\\s*\\$?\\s*)?[^\\d\\n]{0,20}(\\d[\\d.,]*)",
      text,
      "mi",
    );
  }
  if (!total) {
    // "TOTAL US $ 3,240.00"
    total = _find("TOTAL\\s+(?:EN\\s+)?US\\s*\\$?\\s*(\\d[\\d.,]*)", text);
  }
  if (!total) {
    total = _find(
      "(?:Valor\\s*V\\s*enta|Valor\\s*Venta)\\s*:?\\s*\\$?\\s*(?:US\\s*\\$?\\s*)?(\\d[\\d.,]*)",
      text,
    );
  }
  fields.total_amount = total;

  fields.currency = "USD";

  // Quantity boxes (= premium units, usually $1 per box)
  // Pattern: "3,240.00 CAJ/UND" — but avoid matching unit price (1.000000 UND)
  let qty = _find(
    "([\\d,]{4,}(?:\\.\\d+)?)\\s*(?:CAJ[A]?|CAJA|Boxes)",
    text,
  );
  if (!qty) {
    // "Total Exonerado" line: "3,240.00 Total Exonerado"
    qty = _find("(\\d{1,2},\\d{3}\\.\\d{2})\\s+Total\\s+Exonerado", text);
  }
  if (!qty) {
    // Peruvian garbled: "18.143,240.00  1.000000 UND" — qty glued to weight
    qty = _find(
      "\\d{2}\\.\\d{2}(\\d{1,2},\\d{3}\\.\\d{2})\\s+\\d+\\.\\d+\\s*UND",
      text,
    );
  }
  if (!qty) {
    // Dominican BONO lines: sum quantities from "BONO FAIRTRADE ... qty ... price ... total"
    let bonoQtys = _findAll(
      "(?:BONO|PRIMA)\\s+FAIRTRADE.*?(?:KG)?\\s*\\n?[^\\n]*?\\s+(\\d[.\\d]*)\\s+(?:-|[\\d.,])",
      text,
    );
    if (bonoQtys.length === 0) {
      // Try matching continuation lines with quantities
      bonoQtys = _findAll("\\b(\\d{1,2}\\.\\d{3})\\s+-\\s+-", text);
    }
    if (bonoQtys.length > 0) {
      const totalQty = bonoQtys.reduce(
        (sum, q) => sum + parseInt(q.replace(/\./g, ""), 10),
        0,
      );
      qty = String(totalQty);
    }
  }
  fields.quantity_boxes = qty;

  // Premium per box — usually $1.00 for FairTrade
  // Look for unit price in BONO/PRIMA line items, avoiding "18.14 KG" weight matches
  let premium = _find(
    "(?:PRIMA|PREMIO|BONO)\\s+(?:FAIRTRADE|FT|FAIR\\s*TRADE).*?KG.*?(\\d+[.,]\\d{2,3})\\s",
    text,
  );
  if (!premium) {
    // Peruvian/Ecuadorian format: unit price column after description
    premium = _find(
      "(?:PAGO\\s+DE\\s+PRIMA|PRIMA\\s+DE\\s+COMERCIO)\\s.*?([\\d.]+)\\s*$",
      text,
      "m",
    );
  }
  if (!premium) {
    premium = "1.00";
  }
  fields.premium_per_box = premium;

  // Producer name
  let producer = _find(
    "(COOPERATIVA\\s+AGRARIA[^\\n]{5,80})",
    text,
    "",
  );
  if (!producer) {
    producer = _find(
      "(ASOCIACION\\s+(?:DE\\s+)?(?:TRABAJADORES|PRODUCTORES|BANANEROS|VALLE)[^\\n]{5,80})",
      text,
      "",
    );
  }
  if (!producer) {
    // Look for BENEFICIARIO line
    producer = _find("BENEFICIARIO\\s+([^\\n]{5,60})", text);
  }
  if (!producer) {
    // Dominican: company header
    producer = _find("(Fruta?\\s+Ecol[oó]gica[^\\n]{5,60})", text);
  }
  if (!producer) {
    // Ecuadorian: AGRICERT pattern
    producer = _find("(AGRICERT[^\\n]{3,40})", text, "");
  }
  if (!producer) {
    // Embarcador line
    producer = _find(
      "EMBARCADOR\\s*:?\\s*\\n?\\s*([A-Z][^\\n]{5,60})",
      text,
    );
  }
  fields.producer = _clean(producer);

  // FLO ID (producer's)
  const floIds = _findAll("FLO\\s*ID\\s*:?\\s*(\\d{3,6})", text).filter(
    (f) => f !== "1068",
  );
  if (floIds.length > 0) {
    fields.flo_id = floIds[0];
  }

  // Containers referenced in the premium invoice
  let containers = _findAllContainers(text);
  // Also parse formatted: CONTENEDOR SUDU:621242-8 or CGMU 494389-6 or "Nro. Contenedor : MNBU 348511-0"
  const contRefsRe =
    /(?:CONT(?:ENEDOR|AINER)|Nro\.\s*Contenedor)\s*[:\s]*([A-Z]{4})[:\s]*(\d{6})-?(\d)?/gi;
  let contRefM: RegExpExecArray | null;
  while ((contRefM = contRefsRe.exec(text)) !== null) {
    const prefix = contRefM[1];
    const num = contRefM[2];
    const check = contRefM[3] || "";
    const full = prefix + num + check;
    if (full.length === 11) {
      containers.push(full);
    } else if (full.length === 10 && check === "") {
      // Missing check digit — still usable for matching
      containers.push(full);
    }
  }
  containers = Array.from(new Set(containers));
  if (containers.length > 0) {
    fields.container_numbers = containers;
    fields.container_number = containers[0];
  }

  // Peruvian FT format: per-container details in "Nro. Contenedor : XXX  Referencia : YYY"
  const perContRe =
    /Nro\.\s*Contenedor\s*:\s*([A-Z]{4})\s*(\d{6})-?(\d)?\s+Referencia\s*N[°o]?\s*:?\s*(\d{4,6})/g;
  const perContainerDetails: ContainerDetail[] = [];
  let perContM: RegExpExecArray | null;
  while ((perContM = perContRe.exec(text)) !== null) {
    const prefix = perContM[1];
    const num = perContM[2];
    const check = perContM[3] || "";
    const ref = perContM[4];
    const contId = prefix + num + check;
    const detail: ContainerDetail = {
      container_number: contId,
      order_number: ref,
    };
    // Look for weight line following this container
    const weightPattern = new RegExp(
      escapeRegex(contId.slice(0, 4)) +
        ".*?" +
        escapeRegex(ref) +
        ".*?" +
        "Peso\\s*Bruto\\s*:\\s*([\\d.,]+).*?Peso\\s*Neto\\s*:\\s*([\\d.,]+)",
      "s",
    );
    const weightM = weightPattern.exec(text);
    if (weightM) {
      detail.gross_weight = weightM[1].replace(/ /g, "");
      detail.nett_weight = weightM[2].replace(/ /g, "");
    }
    perContainerDetails.push(detail);
  }
  if (perContainerDetails.length > 0) {
    fields.container_details = perContainerDetails;
  }

  // Week
  fields.week = _find(
    "(?:SEMANA|WEEK|SEM)\\s*(?:N[°o]\\.?)?\\s*:?\\s*(\\d{1,2})",
    text,
  );

  // Order numbers referenced
  fields.order_numbers = _find(
    "(?:ORDEN(?:ES)?|\\bOC\\b|REF(?:ERENCIA)?|Referencia)\\s*(?:N[°o]\\.?)?\\s*:?\\s*(\\d{4,6}(?:[/,]\\d{4,6})*)",
    text,
  );

  // Multi-container: FT invoices have uniform premium per box, so split is straightforward
  if (containers.length > 1) {
    fields.multi_container = true;
    // Only compute generic split if no per-container details already found
    let qtyStr = (fields.quantity_boxes as string) || "";
    // If no qty but have total and premium, derive qty from total/premium
    if (!qtyStr && fields.total_amount) {
      try {
        const totalVal = parseFloat(
          (fields.total_amount as string).replace(/,/g, ""),
        );
        const premVal = parseFloat(
          ((fields.premium_per_box as string) || "1.00").replace(/,/g, "."),
        );
        if (premVal > 0) {
          const derivedQty = Math.floor(totalVal / premVal);
          qtyStr = String(derivedQty);
          fields.quantity_boxes = qtyStr;
        }
      } catch {
        // ignore parse errors
      }
    }
    if (qtyStr && !fields.container_details) {
      try {
        // Handle both "4,320.00" and "2.160" (Dominican thousands-dot) formats
        let totalQty = Math.floor(parseFloat(qtyStr.replace(/,/g, "")));
        if (totalQty < 100) {
          // Probably Dominican format: "2.160" = 2160
          totalQty = Math.floor(
            parseFloat(qtyStr.replace(/\./g, "").replace(/,/g, ".")),
          );
        }
        if (totalQty > 0) {
          const perCont = Math.floor(totalQty / containers.length);
          const prem = (fields.premium_per_box as string) || "1.00";
          let premVal: number;
          try {
            premVal = parseFloat(prem.replace(/,/g, "."));
          } catch {
            premVal = 1.0;
          }
          const perContainer: ContainerDetail[] = [];
          for (const cont of containers) {
            perContainer.push({
              container_number: cont,
              quantity_boxes: String(perCont),
              amount: (perCont * premVal).toFixed(2),
            });
          }
          fields.container_details = perContainer;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return _cleanup(fields);
}

// ── Packing List ────────────────────────────────────────────────────

/**
 * Extract fields from packing lists (usually XLSX).
 *
 * Packing lists contain per-pallet/box details with producer names,
 * GGN numbers, box counts, and container assignments.
 */
function extractPackingList(
  text: string,
  _docType: string,
  _filename: string,
): Fields {
  const fields: Fields = {};

  // Container numbers
  let containers = _findAllContainers(text);
  // Also parse formatted: TRIU-805147-6 or TRIU:821839-4
  const formattedRe = /([A-Z]{4})[:\-](\d{6,7})-?\d?/g;
  let fmtM: RegExpExecArray | null;
  while ((fmtM = formattedRe.exec(text)) !== null) {
    const full = fmtM[1] + fmtM[2].replace(/-/g, "");
    if (full.length === 11) {
      containers.push(full);
    }
  }
  containers = Array.from(new Set(containers));
  fields.container_numbers = containers;
  if (containers.length > 0) {
    fields.container_number = containers[0];
  }

  // Seal numbers — must be alphanumeric, at least 6 chars with a digit
  let seal = _find(
    "(?:CUSTOMS?\\s*SEAL|Sello\\s*naviera)\\s*:?\\s*([A-Z0-9]{6,20})",
    text,
  );
  if (seal && /\d/.test(seal)) {
    fields.seal_number = seal;
  } else {
    seal = _find("(?:SEAL|Sello)\\s*:?\\s*([A-Z0-9]{6,20})", text);
    if (seal && /\d/.test(seal)) {
      fields.seal_number = seal;
    }
  }

  // Shipper/exporter — extract just the company name
  let producer = _find(
    "(?:SHIPPER|Exporter)\\s*:?\\s*([A-Z][A-Za-z\\s\\-.]+?(?:SAC|SAS|S\\.?A\\.?C\\.?|S\\.?A\\.?S\\.?|S\\.?A\\.?|S\\.?R\\.?L\\.?|BV|LLC))",
    text,
  );
  if (!producer) {
    producer = _find(
      "(?:SHIPPER|Exporter)\\s*:?\\s*([A-Z][A-Za-z\\s\\-.]{5,40}?)(?:\\s+WEEK|\\s+RUC|\\s+\\d|\\n)",
      text,
    );
  }
  if (!producer) {
    producer = _find(
      "(?:DE:)\\s*:?\\s*([A-Z][A-Za-z\\s\\-.]{5,40}?)(?:\\n|\\s{2,})",
      text,
    );
  }
  if (!producer) {
    producer = _find("(COOPERATIVA\\s+AGRARIA[^\\n]{5,40})", text, "");
  }
  if (!producer) {
    producer = _find("(HACIENDA[^\\n]{5,40})", text, "");
  }
  fields.producer = _clean(producer);

  // Week
  fields.week = _find(
    "(?:SEMANA|WEEK|SW|PACKING\\s*WEEK)\\s*(?:N[°o]\\.?)?\\s*:?\\s*(\\d{1,2})",
    text,
  );

  // Reference/order
  fields.order_numbers = _find(
    "(?:REFERENCIA|REFERENCE|REF(?:\\s*NR)?|Ref\\s*nr)\\s*:?\\s*(\\d{4,6}(?:[/,]\\d{4,6})*)",
    text,
  );

  // Vessel
  fields.vessel = _clean(
    _find(
      "(?:VAPOR|BUQUE|Primary\\s*Vessel|Vessel)\\s*:?\\s*\\n?\\s*([A-Z][A-Z\\s]{3,30})",
      text,
    ),
  );

  // Voyage
  fields.voyage = _find(
    "(?:VIAJE|Voyage)\\s*:?\\s*\\n?\\s*([A-Z0-9\\s]{3,15})",
    text,
  );

  // Port — extract just the port name, not trailing text
  let pol = _find(
    "(?:LOADING\\s*PORT)\\s*:?\\s*([A-Z][A-Za-z]{3,15})",
    text,
  );
  if (!pol) {
    if (/\bPAITA\b/.test(text)) {
      pol = "PAITA";
    }
  }
  fields.port_of_loading = pol;

  let pod = _find(
    "(?:PORT\\s*OF\\s*DISCHARGE|DESTINO|Port\\s*of\\s*arrival)\\s*:?\\s*([A-Z][A-Za-z]{3,15})",
    text,
  );
  if (!pod) {
    for (const port of [
      "ROTTERDAM",
      "ANTWERP",
      "ANTWERPEN",
      "VLISSINGEN",
      "AMBERES",
    ]) {
      if (text.includes(port)) {
        pod = port;
        break;
      }
    }
  }
  fields.port_of_discharge = pod;

  // Carrier
  fields.carrier = _find(
    "(?:CARRIER|NAVIERA)\\s*:?\\s*([A-Z][A-Za-z\\s]{3,20})",
    text,
  );

  // Total boxes
  let totalBoxes = _find(
    "(?:TOTAL|Total)\\s*(?:DE\\s*CAJAS|BOXES?|Cajas)?\\s*:?\\s*([\\d,]+)",
    text,
  );
  if (!totalBoxes) {
    // Count from "N CAJAS" column or "EXPORTED BOXES" column
    totalBoxes = _find("TOTAL\\s+([\\d,]+)\\s+TOTAL", text);
  }
  fields.total_boxes = totalBoxes;

  // Number of pallets
  fields.number_of_pallets = _find(
    "(\\d{1,3})\\s*(?:PALLETS?|pallets)",
    text,
  );

  // GGN importer
  fields.ggn_importer = _find(
    "GGN\\s*(?:IMPORTER|Importer)\\s*:?\\s*(\\d{10,20})",
    text,
  );

  return _cleanup(fields);
}

// ── Certificate of Inspection (COI) ────────────────────────────────

/**
 * Extract fields from Certificates of Inspection (organic certificates).
 *
 * COIs are EU import inspection certificates for organic products.
 * They're in Dutch (INSPECTIECERTIFICAAT) with standardized numbered fields.
 */
function extractCoi(text: string, _docType: string, _filename: string): Fields {
  const fields: Fields = {};

  // COI reference number
  fields.coi_number = _find(
    "(?:Referentienummer|Reference\\s*number)\\s*[^\\n]*\\n?\\s*(COI\\.[A-Z]{2}\\.\\d{4}\\.\\d{5,10})",
    text,
  );
  if (!fields.coi_number) {
    fields.coi_number = _find(
      "(COI\\.[A-Z]{2}\\.\\d{4}\\.\\d{5,10})",
      text,
    );
  }

  // Control body — the actual certifying organization name (after "van afgifte")
  let cb = _find(
    "1\\.\\s*Controleautoriteit[^\\n]*\\n\\s*([A-Z][^\\n]+?-\\s*[A-Z]{2}-BIO-\\d{3})",
    text,
  );
  if (!cb) {
    cb = _find(
      "(?:Control Union|Kiwa BCS|CERES|Ecocert|IMO)[^\\n]+",
      text,
      "",
    );
  }
  fields.control_body = _clean(cb);

  // Producer (field 4)
  const producerM = new RegExp(
    "(?:Producent|Producer).*?\\n\\s*((?:[A-Z][^\\n]+\\n?){1,3}?)(?=\\s*(?:CAL|CALLE|Nummer|C/|SITIO|AV))",
  ).exec(text);
  if (producerM) {
    fields.producer = _clean(producerM[1].slice(0, 150));
  }
  if (!fields.producer) {
    fields.producer = _clean(
      _find("4\\.\\s*Producent[^\\n]*\\n\\s*([A-Z][^\\n]+)", text),
    );
  }

  // Exporter (field 5)
  fields.exporter = _clean(
    _find("5\\.\\s*Exporteur[^\\n]*\\n\\s*([A-Z][^\\n]+)", text),
  );

  // Country of origin (field 8)
  const origin = _find(
    "(?:Land van oorsprong|Country of origin)\\s*\\n?\\s*([A-Za-z\\s]+)\\(([A-Z]{2})\\)",
    text,
  );
  if (origin) {
    fields.country_of_origin = origin;
  } else {
    fields.country_of_origin = _find(
      "8\\.\\s*Land van oorsprong\\s*\\n?\\s*([^\\n(]+)",
      text,
    );
  }

  // Country code
  fields.country_code = _find(
    "Land van oorsprong\\s*\\n?\\s*[^\\n]*\\(([A-Z]{2})\\)",
    text,
  );

  // Container numbers (field 14)
  let containers = _findAllContainers(text);
  // Also parse from "14. Containernummer" field
  const contSectionM = /14\.\s*Containernummer\s*\n((?:[^\n]+\n){1,10}?)(?=15\.)/.exec(
    text,
  );
  if (contSectionM) {
    const sectionContainers =
      contSectionM[1].match(/[A-Z]{4}\d{7}/g) || [];
    containers.push(...sectionContainers);
  }
  containers = Array.from(new Set(containers));
  fields.container_numbers = containers;
  if (containers.length > 0) {
    fields.container_number = containers[0];
  }

  // Seal numbers (field 15)
  const sealSectionM =
    /15\.\s*Zegelnummer\s*\n((?:[^\n]+\n){1,5}?)(?=16\.)/.exec(text);
  if (sealSectionM) {
    const seals = (sealSectionM[1].match(/[A-Z0-9]{6,15}/g) || []).filter(
      (s) => /\d/.test(s),
    );
    if (seals.length > 0) {
      fields.seal_numbers = Array.from(new Set(seals));
    }
  }

  // Gross weight (field 16)
  let gw = _find(
    "16\\.\\s*Totaal\\s*brutogewicht\\s*\\n?\\s*(\\d[\\d.,]*)\\s*kg",
    text,
  );
  if (!gw) {
    gw = _find(
      "(?:brutogewicht|gross\\s*weight)\\s*\\n?\\s*(\\d[\\d.,]*)\\s*kg",
      text,
    );
  }
  fields.gross_weight = gw;

  // Net weight (from product table, field 13)
  fields.nett_weight = _find(
    "(\\d[\\d.,]+)\\s*kg\\s*(?:Biologisch|Organic)",
    text,
  );

  // Vessel + voyage (field 17)
  const vesselM =
    /Schip\s+[A-Z0-9]+\s+([A-Z][A-Z\s]+\d{3,4}[A-Z]?)/.exec(text);
  if (vesselM) {
    const v = vesselM[1].trim();
    // Split vessel name from voyage: "ODYSSEUS 606N" -> vessel=ODYSSEUS, voyage=606N
    const vm = /^([A-Z][A-Z\s]+?)\s+(\d{3,5}[A-Z]?)\s*$/.exec(v);
    if (vm) {
      fields.vessel = vm[1].trim();
      fields.voyage = vm[2];
    } else {
      fields.vessel = v;
    }
  }

  // Number of packages
  fields.number_of_packages = _find("(\\d{3,5})\\s*(?:Doos|box)", text);

  // Lot/partij number
  let lot = _find(
    "Nummer van de\\s*\\n?\\s*partij\\s*\\n?\\s*.*?(\\d{4,6})",
    text,
  );
  if (!lot) {
    // From the product table
    lot = _find("BANANAS?\\s*(\\d{4,6})", text);
  }
  fields.lot = lot;

  // GN code
  fields.gn_code = _find("(08\\d{6})", text);

  // Bio certification
  fields.bio_certification = _find("([A-Z]{2}-BIO-\\d{3})", text);

  return _cleanup(fields);
}

// ── Weighing Certificate ────────────────────────────────────────────

/**
 * Extract fields from weighing certificates (weegcertificaat).
 *
 * Dutch banana weighing certificates with standardized fields.
 * Issued at arrival in the Netherlands.
 */
function extractWeighingCert(
  text: string,
  _docType: string,
  _filename: string,
): Fields {
  const fields: Fields = {};

  // Certificate number
  let certNum = _find(
    "(?:nummer\\s*weegcertificaat|certificate\\s*number)\\s*\\n?\\s*.*?(\\d{4}-\\d{4,6}-\\d{4}-\\s*\\d+)",
    text,
  );
  if (!certNum) {
    certNum = _find("(\\d{4}-\\d{5}-\\d{4}-\\s*\\d+)", text);
  }
  fields.certificate_number = certNum;

  // Date
  fields.date = _find(
    "Datum van opstelling.*?\\n?\\s*.*?(\\d{1,2}\\s+\\w+\\s+\\d{4})",
    text,
  );

  // Container number (field 4)
  fields.container_number = _findContainer(text);

  // Country of origin (field 5)
  // "HLBU9120357 PE" -> country code after container
  fields.country_of_origin = _find(
    "[A-Z]{4}\\d{7}\\s+([A-Z]{2})\\b",
    text,
  );

  // Brand/mark (field 8) — typically on line after "Merk(en)" heading
  // WC text has garbled field order; look for known brand patterns
  const brandM =
    /((?:OKE\s*ORG|BIO\s*VILLAGE|KAPI\s*KAPI|TAPED|MAX\s*HAVELAAR)[^\n]*)/.exec(
      text,
    );
  let brand = brandM ? brandM[1].trim() : null;
  if (!brand) {
    brand = _find(
      "8\\.\\s*Merk\\(en\\).*?\\n\\s*([A-Z][A-Z\\s/]+?\\d*)\\s*\\n",
      text,
    );
  }
  fields.brand = brand;

  // Number of packages (field 6)
  fields.number_of_packages = _find(
    "(?:verpakkingseenheden|packages)\\s*.*?\\n?\\s*(\\d{3,5})\\s*(?:kartons|boxes|cartons)",
    text,
  );

  // Net weight (field 7.1) — after "kartons" on the same line
  let nw = _find("\\d{3,5}\\s*kartons\\s+(\\d{4,6})", text);
  if (!nw) {
    nw = _find(
      "7\\.1\\s*Totaal\\s*vastgesteld\\s*nettogewicht\\s*\\(kg\\)\\s*\\n?\\s*.*?(\\d{4,6})",
      text,
    );
  }
  fields.nett_weight = nw;

  // Gross weight (field 7.2) — in WC PDFs the gross weight value is often
  // concatenated with the address "2991 LN Barendrecht" making it unextractable.
  // Look for it, but exclude the postal code 2991.
  const gwM =
    /7\.2\s*Totaal\s*vastgesteld\s*brutogewicht\s*\(kg\)\s*(\d{4,6})/.exec(
      text,
    );
  if (gwM) {
    const gw = gwM[1];
    if (gw !== "2991") {
      // Postal code false positive
      fields.gross_weight = gw;
    }
  }

  // Average net weight per unit (field 14)
  fields.avg_nett_weight = _find(
    "(?:Gemiddeld\\s*nettogewicht|average\\s*net).*?\\n?\\s*.*?(\\d{1,2}[.,]\\d{2})",
    text,
  );

  // Tare (field 13)
  fields.tare_weight = _find(
    "(?:Tarra|Tare).*?\\n?\\s*.*?(\\d+[.,]\\d{2})",
    text,
  );

  // Number of units examined (field 11) — typically a small number (6-10)
  fields.units_examined = _find(
    "11\\.\\s*Aantal\\s*onderzochte\\s*eenheden[^:]*:\\s*(\\d{1,2})\\b",
    text,
  );

  // Lot from order number in certificate number
  fields.lot = _find("\\d{4}-(\\d{5})-\\d{4}", text);

  // Meldingsnummer
  fields.notification_number = _find(
    "meldingsnummer:\\s*\\n?\\s*(\\d+)",
    text,
  );

  return _cleanup(fields);
}

// ── Regex Escape Helper ─────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Router ──────────────────────────────────────────────────────────

const DOC_EXTRACTORS: Record<string, DocExtractor> = {
  Invoice: extractInvoice,
  "Invoice with Origin Declaration": extractInvoice,
  "FairTrade Invoice": extractFairtradeInvoice,
  "Packing List": extractPackingList,
  "Certificate of Inspection": extractCoi,
  "Weighing Certificate": extractWeighingCert,
};

/**
 * Extract fields using document-type-specific template.
 *
 * Returns object with:
 * - fields: extracted field values
 * - method: 'doc_template' or 'none'
 */
export function extractByDocType(
  text: string,
  docType: string,
  filename: string,
): DocTypeExtractionResult {
  const extractor = DOC_EXTRACTORS[docType];
  if (!extractor) {
    return { fields: {}, method: "none" };
  }

  const fields = extractor(text, docType, filename);

  const filledCount = Object.values(fields).filter((v) => v !== null).length;
  console.log(
    `[doc-templates] Extracted ${filledCount} fields for ${docType} from ${filename}`,
  );

  return { fields, method: "doc_template" };
}
