// src/lib/woocommerceOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

export type WooMode = "products" | "variable";

export type WooOptimizerOptions = {
  mode?: WooMode;
  // When enabled (used by the Variable preset), missing parent rows are auto-created
  // as safe placeholders so variations aren't orphaned.
  autoCreateMissingParents?: boolean;
};

// Canonical header order pulled from WooCommerce's import UI mapping list.
// It is intentionally "core" (plugin meta columns are preserved but appended).
export const WOO_EXPECTED_HEADERS = [
  "ID",
  "Type",
  "SKU",
  "Name",
  "Published",
  "Is featured?",
  "Visibility in catalog",
  "Short description",
  "Description",
  "Regular price",
  "Sale price",
  "Date sale price starts",
  "Date sale price ends",
  "Tax status",
  "Tax class",
  "In stock?",
  "Stock",
  "Backorders allowed?",
  "Sold individually?",
  "Weight (g)",
  "Length (cm)",
  "Width (cm)",
  "Height (cm)",
  "Categories",
  "Tags",
  "Shipping class",
  "Images",
  "Parent",
  "Upsells",
  "Cross-sells",
  "Grouped products",
  "External URL",
  "Button text",
  "Download name",
  "Download URL",
  "Download limit",
  "Download expiry days",
  "Attribute name",
  "Attribute value(s)",
  "Is a global attribute?",
  "Attribute visibility",
  "Default attribute",
  "Allow customer reviews?",
  "Purchase note",
  "Import as meta",
  "Position",
];

export const WOO_EXAMPLE_ROW: CsvRow = {
  ID: "",
  Type: "simple",
  SKU: "WC-TEE-CLASSIC-S",
  Name: "Classic Tee",
  Published: "1",
  "Is featured?": "0",
  "Visibility in catalog": "visible",
  "Short description": "A short marketing blurb.",
  Description: "Full product description.",
  "Regular price": "24.99",
  "Sale price": "",
  "Date sale price starts": "",
  "Date sale price ends": "",
  "Tax status": "taxable",
  "Tax class": "",
  "In stock?": "1",
  Stock: "25",
  "Backorders allowed?": "0",
  "Sold individually?": "0",
  "Weight (g)": "200",
  "Length (cm)": "",
  "Width (cm)": "",
  "Height (cm)": "",
  Categories: "Clothing > Shirts",
  Tags: "tee,classic",
  "Shipping class": "",
  Images: "https://example.com/images/classic-tee.jpg",
  Parent: "",
  Upsells: "",
  "Cross-sells": "",
  "Grouped products": "",
  "External URL": "",
  "Button text": "",
  "Download name": "",
  "Download URL": "",
  "Download limit": "",
  "Download expiry days": "",
  "Attribute name": "",
  "Attribute value(s)": "",
  "Is a global attribute?": "",
  "Attribute visibility": "",
  "Default attribute": "",
  "Allow customer reviews?": "1",
  "Purchase note": "",
  "Import as meta": "",
  Position: "0",
};

const TYPE_ALLOWED = new Set(["simple", "variable", "variation", "grouped", "external"]);
const VIS_ALLOWED = new Set(["visible", "catalog", "search", "hidden"]);

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

// Normalize common boolean-ish values to 1/0.
function normalizeWooBool(input: string): { normalized: string | null; didNormalize: boolean } {
  const raw = String(input ?? "").trim();
  if (!raw) return { normalized: "", didNormalize: false };
  const s = raw.toLowerCase();
  if (s === "1" || s === "yes" || s === "y" || s === "true" || s === "t") return { normalized: "1", didNormalize: raw !== "1" };
  if (s === "0" || s === "no" || s === "n" || s === "false" || s === "f") return { normalized: "0", didNormalize: raw !== "0" };
  return { normalized: null, didNormalize: false };
}

function canonicalHeaderMap(inputHeaders: string[]) {
  const canon = new Map<string, string>();
  for (const h of WOO_EXPECTED_HEADERS) canon.set(h.toLowerCase(), h);

  // Common synonyms seen in exports/plugins.
  const synonyms: Record<string, string> = {
    status: "Published",
    published_status: "Published",
    featured: "Is featured?",
    visibility: "Visibility in catalog",
    regular_price: "Regular price",
    sale_price: "Sale price",
    stock_quantity: "Stock",
    stock_status: "In stock?",
    image: "Images",
    images: "Images",
    parent_id: "Parent",
  };

  const out: Record<string, string> = {};
  for (const h of inputHeaders) {
    const key = h.trim().toLowerCase();
    const direct = canon.get(key);
    if (direct) out[h] = direct;
    else if (synonyms[key]) out[h] = synonyms[key];
  }
  return out;
}

function normalizeList(value: string) {
  const parts = String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(",");
}

function normalizeCategoryHierarchy(value: string) {
  const cats = String(value ?? "")
    .split(",")
    .map((s) =>
      s
        .trim()
        .replace(/\s*>\s*/g, " > ")
        .replace(/\s+/g, " ")
    )
    .filter(Boolean);
  return cats.join(",");
}

function parseIntSafe(v: string) {
  if (!String(v ?? "").trim()) return { ok: true, value: "" };
  const n = Number.parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n)) return { ok: false, value: v };
  return { ok: true, value: String(n) };
}

function normalizeWooType(v: string) {
  const t = String(v ?? "").trim().toLowerCase();
  if (!t) return "";
  if (t === "variable product") return "variable";
  if (t === "simple product") return "simple";
  return t;
}

export function validateAndFixWooCommerceProducts(headers: string[], rows: CsvRow[], opts: WooOptimizerOptions = {}): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];
  const mode: WooMode = opts.mode ?? "products";
  const autoCreateMissingParents = Boolean(opts.autoCreateMissingParents) || mode === "variable";

  // Canonicalize headers where possible, but keep unknown columns (plugins often add meta columns).
  const map = canonicalHeaderMap(headers);
  const canonHeaders = headers.map((h) => map[h] ?? h.trim());

  // Ensure expected core headers exist.
  for (const h of ["Type", "Name", "Published"]) {
    if (!canonHeaders.includes(h)) {
      issues.push({
        rowIndex: -1,
        column: h,
        severity: "error",
        code: "woocommerce/missing_required_header",
        message: `Missing required column: ${h}`,
        suggestion: `Add the '${h}' column (WooCommerce importer field).`,
      });
    }
  }

  // Build per-row normalized view using canonical headers.
  const canonRows: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[canonHeaders[i]] = r?.[headers[i]] ?? "";
    }
    return out;
  });

  // Per-row validation + safe fixes.
  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    // Type
    const typeRaw = out["Type"] ?? "";
    const type = normalizeWooType(typeRaw);
    if (typeRaw !== type && type) {
      out["Type"] = type;
      fixesApplied.push(`Normalized Type to '${type}' on row ${rowIndex + 1}`);
    }
    if (type && !TYPE_ALLOWED.has(type)) {
      issues.push({
        rowIndex,
        column: "Type",
        severity: "error",
        code: "woocommerce/invalid_type",
        message: `Invalid product Type '${typeRaw}'.`,
        suggestion: "Use one of: simple, variable, variation, grouped, external.",
      });
    }

    // Name required for non-variation rows
    const name = out["Name"]?.trim() ?? "";
    if (!name && type !== "variation") {
      issues.push({
        rowIndex,
        column: "Name",
        severity: "error",
        code: "woocommerce/missing_name",
        message: "Missing product Name.",
        suggestion: "Add a Name for this product.",
      });
    }

    // Published boolean
    if ("Published" in out) {
      const p = normalizeWooBool(out["Published"]);
      if (p.normalized != null && p.normalized !== out["Published"].trim()) {
        out["Published"] = p.normalized;
        if (p.didNormalize) fixesApplied.push(`Normalized Published to '${p.normalized}' on row ${rowIndex + 1}`);
      }
      if (p.normalized == null && !isEmpty(out["Published"])) {
        issues.push({
          rowIndex,
          column: "Published",
          severity: "warning",
          code: "woocommerce/invalid_bool",
          message: `Published should be boolean-like (1/0, true/false). Found '${out["Published"]}'.`,
          suggestion: "Use 1 (published) or 0 (draft).",
        });
      }
    }

    // In stock? boolean + Stock integer
    if ("In stock?" in out) {
      const s = normalizeWooBool(out["In stock?"]);
      if (s.normalized != null && s.normalized !== out["In stock?"]?.trim()) {
        out["In stock?"] = s.normalized;
        if (s.didNormalize) fixesApplied.push(`Normalized In stock? to '${s.normalized}' on row ${rowIndex + 1}`);
      }
      if (s.normalized == null && !isEmpty(out["In stock?"])) {
        issues.push({
          rowIndex,
          column: "In stock?",
          severity: "warning",
          code: "woocommerce/invalid_bool",
          message: `In stock? should be boolean-like. Found '${out["In stock?"]}'.`,
          suggestion: "Use 1 (in stock) or 0 (out of stock).",
        });
      }
    }

    if ("Stock" in out) {
      const p = parseIntSafe(out["Stock"]);
      if (!p.ok) {
        issues.push({
          rowIndex,
          column: "Stock",
          severity: "warning",
          code: "woocommerce/invalid_int",
          message: `Stock should be a whole number. Found '${out["Stock"]}'.`,
          suggestion: "Use an integer (e.g., 0, 5, 12).",
        });
      } else if (p.value !== out["Stock"]?.trim()) {
        out["Stock"] = p.value;
      }
    }

    // Visibility
    if ("Visibility in catalog" in out) {
      const v = out["Visibility in catalog"]?.trim().toLowerCase();
      if (v && !VIS_ALLOWED.has(v)) {
        issues.push({
          rowIndex,
          column: "Visibility in catalog",
          severity: "warning",
          code: "woocommerce/invalid_visibility",
          message: `Visibility in catalog should be one of: visible, catalog, search, hidden. Found '${out["Visibility in catalog"]}'.`,
          suggestion: "Use: visible, catalog, search, or hidden.",
        });
      } else if (v && v !== out["Visibility in catalog"]) {
        out["Visibility in catalog"] = v;
        fixesApplied.push(`Normalized Visibility in catalog to '${v}' on row ${rowIndex + 1}`);
      }
    }

    // Prices: parse, normalize, and cross-check sale vs regular price
    let regularPriceParsed: number | null = null;
    let salePriceParsed: number | null = null;
    for (const col of ["Regular price", "Sale price"]) {
      if (!(col in out)) continue;
      const raw = out[col];
      const parsed = parseShopifyMoney(raw);
      if (parsed == null) {
        if (!isEmpty(raw)) {
          issues.push({
            rowIndex,
            column: col,
            severity: "warning",
            code: "woocommerce/invalid_price",
            message: `${col} should be a decimal number. Found '${raw}'.`,
            suggestion: "Use plain decimals like 19.99 (no currency symbols).",
          });
        }
      } else {
        const formatted = formatShopifyMoney(parsed);
        if (formatted !== raw.trim()) {
          out[col] = formatted;
          fixesApplied.push(`Normalized ${col} to '${formatted}' on row ${rowIndex + 1}`);
        }
        if (col === "Regular price") regularPriceParsed = parsed;
        if (col === "Sale price") salePriceParsed = parsed;
      }
    }
    if (regularPriceParsed != null && salePriceParsed != null && salePriceParsed >= regularPriceParsed) {
      issues.push({
        rowIndex,
        column: "Sale price",
        severity: "warning",
        code: "woocommerce/sale_price_not_lower",
        message: `Sale price (${formatShopifyMoney(salePriceParsed)}) is not lower than Regular price (${formatShopifyMoney(regularPriceParsed)}).`,
        suggestion: "Sale price should be less than the regular price. Remove the sale price or correct the values.",
      });
    }

    // Categories / Tags
    if ("Categories" in out) {
      const before = out["Categories"];
      const after = normalizeCategoryHierarchy(before);
      if (after !== before.trim()) {
        out["Categories"] = after;
        if (!isEmpty(before)) fixesApplied.push(`Normalized Categories formatting on row ${rowIndex + 1}`);
      }
    }
    if ("Tags" in out) {
      const before = out["Tags"];
      const after = normalizeList(before);
      if (after !== before.trim()) {
        out["Tags"] = after;
        if (!isEmpty(before)) fixesApplied.push(`Normalized Tags formatting on row ${rowIndex + 1}`);
      }
    }

    // Images (comma-separated URLs)
    if ("Images" in out) {
      const before = out["Images"];
      const urls = String(before ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) {
        issues.push({
          rowIndex,
          column: "Images",
          severity: "warning",
          code: "woocommerce/invalid_image_url",
          message: `One or more image URLs are invalid: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`,
          suggestion: "Use full http(s) URLs separated by commas.",
          details: { badUrls: bad },
        });
      }
      const cleaned = urls.join(",");
      if (cleaned !== String(before ?? "").trim()) {
        out["Images"] = cleaned;
        if (!isEmpty(before)) fixesApplied.push(`Cleaned Images URL list on row ${rowIndex + 1}`);
      }
    }

    // Variation structure
    if (type === "variation") {
      const parent = out["Parent"]?.trim() ?? "";
      if (!parent) {
        issues.push({
          rowIndex,
          column: "Parent",
          severity: "error",
          code: "woocommerce/variation_missing_parent",
          message: "Variation row is missing Parent reference.",
          suggestion: "Set Parent to the variable product (ID or SKU depending on your workflow).",
        });
      }
      const attrName = out["Attribute name"]?.trim() ?? "";
      const attrVals = out["Attribute value(s)"]?.trim() ?? "";
      if (!attrName || !attrVals) {
        issues.push({
          rowIndex,
          column: "Attribute value(s)",
          severity: "error",
          code: "woocommerce/variation_missing_attributes",
          message: "Variation row is missing attribute name/value(s).",
          suggestion: "Provide Attribute name and Attribute value(s) for variations.",
        });
      }
    }

    return out;
  });

  // Cross-row: duplicate SKU detection
  const skuRows = new Map<string, number[]>();
  for (let i = 0; i < outRows.length; i++) {
    const sku = (outRows[i]["SKU"] ?? "").trim();
    if (sku) {
      const arr = skuRows.get(sku) ?? [];
      arr.push(i);
      skuRows.set(sku, arr);
    }
  }
  for (const [sku, idxs] of skuRows.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "SKU",
        severity: "warning",
        code: "woocommerce/duplicate_sku",
        message: `Duplicate SKU '${sku}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "Each product/variation should have a unique SKU to avoid import conflicts.",
        details: { sku, rows: rows1b },
      });
    }
  }

  // Duplicate variation attribute combos under same Parent.
  const seen = new Map<string, number[]>();
  for (let i = 0; i < outRows.length; i++) {
    const r = outRows[i];
    const type = normalizeWooType(r["Type"] ?? "");
    if (type !== "variation") continue;
    const parent = (r["Parent"] ?? "").trim();
    const n = (r["Attribute name"] ?? "").trim().toLowerCase();
    const v = (r["Attribute value(s)"] ?? "").trim().toLowerCase();
    if (!parent || !n || !v) continue;
    const key = `${parent}||${n}||${v}`;
    const arr = seen.get(key) ?? [];
    arr.push(i);
    seen.set(key, arr);
  }
  for (const [key, idxs] of seen.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "Attribute value(s)",
        severity: "error",
        code: "woocommerce/duplicate_variation_combo",
        message: `Duplicate variation attribute combination detected for this Parent (${rows1b.join(", ")}).`,
        suggestion: "Each variation under the same parent must have a unique attribute combination.",
        details: { signature: key, rows: rows1b },
      });
    }
  }

  // Final header order: canonical WooCommerce columns first, then append any extra columns.
  const extra = canonHeaders.filter((h) => !WOO_EXPECTED_HEADERS.includes(h));
  const fixedHeaders = [...WOO_EXPECTED_HEADERS, ...extra];

  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    return out;
  });

  if (fixedHeaders.join("||") !== canonHeaders.join("||")) {
    fixesApplied.push("WooCommerce: enforced canonical header names + preferred order");
  }

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
