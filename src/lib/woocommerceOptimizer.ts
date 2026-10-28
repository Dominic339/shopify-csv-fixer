// src/lib/woocommerceOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

export type WooMode = "products" | "variable";

export type WooOptimizerOptions = {
  mode?: WooMode;
};

// WooCommerce's product exporter columns, in export order (WooCommerce core, 2024+).
// Unit-dependent columns use the store's units ("Weight (kg)" is the default store setting).
export const WOO_EXPECTED_HEADERS = [
  "ID",
  "Type",
  "SKU",
  "GTIN, UPC, EAN, or ISBN",
  "Name",
  "Published",
  "Is featured?",
  "Visibility in catalog",
  "Short description",
  "Description",
  "Date sale price starts",
  "Date sale price ends",
  "Tax status",
  "Tax class",
  "In stock?",
  "Stock",
  "Low stock amount",
  "Backorders allowed?",
  "Sold individually?",
  "Weight (kg)",
  "Length (cm)",
  "Width (cm)",
  "Height (cm)",
  "Allow customer reviews?",
  "Purchase note",
  "Sale price",
  "Regular price",
  "Categories",
  "Tags",
  "Shipping class",
  "Images",
  "Download limit",
  "Download expiry days",
  "Parent",
  "Grouped products",
  "Upsells",
  "Cross-sells",
  "External URL",
  "Button text",
  "Position",
  "Brands",
  "Attribute 1 name",
  "Attribute 1 value(s)",
  "Attribute 1 visible",
  "Attribute 1 global",
  "Attribute 1 default",
];

export const WOO_EXAMPLE_ROW: CsvRow = {
  ID: "",
  Type: "simple",
  SKU: "WC-TEE-CLASSIC-S",
  "GTIN, UPC, EAN, or ISBN": "",
  Name: "Classic Tee",
  Published: "1",
  "Is featured?": "0",
  "Visibility in catalog": "visible",
  "Short description": "A short marketing blurb.",
  Description: "Full product description.",
  "Date sale price starts": "",
  "Date sale price ends": "",
  "Tax status": "taxable",
  "Tax class": "",
  "In stock?": "1",
  Stock: "25",
  "Low stock amount": "",
  "Backorders allowed?": "0",
  "Sold individually?": "0",
  "Weight (kg)": "0.2",
  "Length (cm)": "",
  "Width (cm)": "",
  "Height (cm)": "",
  "Allow customer reviews?": "1",
  "Purchase note": "",
  "Sale price": "",
  "Regular price": "24.99",
  Categories: "Clothing > Shirts",
  Tags: "tee, classic",
  "Shipping class": "",
  Images: "https://example.com/images/classic-tee.jpg",
  "Download limit": "",
  "Download expiry days": "",
  Parent: "",
  "Grouped products": "",
  Upsells: "",
  "Cross-sells": "",
  "External URL": "",
  "Button text": "",
  Position: "0",
  Brands: "",
  "Attribute 1 name": "Size",
  "Attribute 1 value(s)": "S",
  "Attribute 1 visible": "1",
  "Attribute 1 global": "1",
  "Attribute 1 default": "",
};

const BASE_TYPES = new Set(["simple", "variable", "variation", "grouped", "external"]);
const TYPE_FLAGS = new Set(["downloadable", "virtual"]);
const VIS_ALLOWED = new Set(["visible", "catalog", "search", "hidden"]);
const TAX_STATUS = new Set(["taxable", "shipping", "none"]);

const BOOL_COLUMNS = ["Is featured?", "Sold individually?", "Allow customer reviews?"];
const ATTR_BOOL_RE = /^Attribute \d+ (visible|global)$/i;

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

function boolValue(raw: string): "1" | "0" | null {
  const s = raw.trim().toLowerCase();
  if (["1", "yes", "y", "true", "t"].includes(s)) return "1";
  if (["0", "no", "n", "false", "f"].includes(s)) return "0";
  return null;
}

/** Map a raw value to an allowed one using `aliases`; null when unrecognized. */
function enumValue(raw: string, aliases: Record<string, string>): string | null {
  const s = raw.trim().toLowerCase();
  return aliases[s] ?? null;
}

// Published: 1 = published, 0 = draft, -1 = private.
const PUBLISHED: Record<string, string> = {
  "1": "1", "0": "0", "-1": "-1",
  yes: "1", true: "1", publish: "1", published: "1",
  no: "0", false: "0", draft: "0",
  private: "-1",
};
// In stock?: 1 = in stock, 0 = out of stock, backorder = on backorder.
const STOCK_STATUS: Record<string, string> = {
  "1": "1", "0": "0", backorder: "backorder",
  yes: "1", true: "1", instock: "1", "in stock": "1",
  no: "0", false: "0", outofstock: "0", "out of stock": "0",
  onbackorder: "backorder", "on backorder": "backorder",
};
// Backorders allowed?: 1 = yes, 0 = no, notify = allow but notify customer.
const BACKORDERS: Record<string, string> = {
  "1": "1", "0": "0", notify: "notify",
  yes: "1", true: "1", no: "0", false: "0",
};

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

// WooCommerce separates list items with commas; a literal comma is escaped as "\,".
function splitList(value: string) {
  return String(value ?? "")
    .split(/(?<!\\),/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeList(value: string) {
  return splitList(value).join(", ");
}

function normalizeCategoryHierarchy(value: string) {
  return splitList(value)
    .map((s) => s.replace(/\s*>\s*/g, " > ").replace(/\s+/g, " "))
    .join(", ");
}

/** Attribute indexes (1, 2, ...) present in the headers. */
function attributeIndexes(headers: string[]) {
  const idx = new Set<number>();
  for (const h of headers) {
    const m = h.match(/^Attribute (\d+) name$/i);
    if (m) idx.add(Number(m[1]));
  }
  return [...idx].sort((a, b) => a - b);
}

function normalizeWooType(v: string) {
  const parts = String(v ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/ product$/, ""))
    .filter(Boolean);
  return parts.join(", ");
}

export function validateAndFixWooCommerceProducts(headers: string[], rows: CsvRow[], opts: WooOptimizerOptions = {}): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];
  const mode: WooMode = opts.mode ?? "products";

  // Canonicalize headers where possible, but keep unknown columns (plugins often add meta columns).
  const map = canonicalHeaderMap(headers);
  const canonHeaders = headers.map((h) => map[h] ?? h.trim());
  const attrIdx = attributeIndexes(canonHeaders);

  // Updates can be keyed by ID or SKU; new products need Name and Type (Type defaults to simple).
  if (!canonHeaders.includes("ID") && !canonHeaders.includes("SKU") && !canonHeaders.includes("Name")) {
    issues.push({
      rowIndex: -1,
      column: "Name",
      severity: "error",
      code: "woocommerce/missing_required_header",
      message: "The file has no ID, SKU, or Name column, so WooCommerce cannot match or create products.",
      suggestion: "Add a Name column for new products, or ID/SKU to update existing ones.",
    });
  }

  // Build per-row normalized view using canonical headers.
  const canonRows: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[canonHeaders[i]] = r?.[headers[i]] ?? "";
    }
    return out;
  });

  const enumCheck = (
    out: CsvRow,
    rowIndex: number,
    col: string,
    aliases: Record<string, string>,
    allowedText: string
  ) => {
    if (!(col in out) || isEmpty(out[col])) return;
    const raw = out[col];
    const v = enumValue(raw, aliases);
    if (v == null) {
      issues.push({
        rowIndex,
        column: col,
        severity: "error",
        code: "woocommerce/invalid_value",
        message: `${col} has a value WooCommerce does not recognise: '${raw}'.`,
        suggestion: `Use ${allowedText}.`,
      });
    } else if (v !== raw.trim()) {
      out[col] = v;
      fixesApplied.push(`Normalized ${col} to '${v}' on row ${rowIndex + 1}`);
    }
  };

  // Per-row validation + safe fixes.
  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    // Type: a base type, optionally combined with flags ("simple, virtual").
    const typeRaw = out["Type"] ?? "";
    const type = normalizeWooType(typeRaw);
    if (typeRaw.trim() !== type && type) {
      out["Type"] = type;
      fixesApplied.push(`Normalized Type to '${type}' on row ${rowIndex + 1}`);
    }
    const typeParts = type ? type.split(", ") : [];
    const baseType = typeParts.find((t) => BASE_TYPES.has(t)) ?? "";
    if (type && (!baseType || typeParts.some((t) => !BASE_TYPES.has(t) && !TYPE_FLAGS.has(t)))) {
      issues.push({
        rowIndex,
        column: "Type",
        severity: "error",
        code: "woocommerce/invalid_type",
        message: `Invalid product Type '${typeRaw}'.`,
        suggestion: "Use simple, variable, variation, grouped, or external (optionally with downloadable/virtual).",
      });
    }

    // Name is required to create a product (variations take theirs from the parent).
    const name = out["Name"]?.trim() ?? "";
    const hasKey = !!(out["ID"]?.trim() || out["SKU"]?.trim());
    if (!name && baseType !== "variation" && !hasKey) {
      issues.push({
        rowIndex,
        column: "Name",
        severity: "error",
        code: "woocommerce/missing_name",
        message: "Missing product Name.",
        suggestion: "Add a Name for this product (or an ID/SKU if you are updating an existing one).",
      });
    }

    enumCheck(out, rowIndex, "Published", PUBLISHED, "1 (published), 0 (draft), or -1 (private)");
    enumCheck(out, rowIndex, "In stock?", STOCK_STATUS, "1 (in stock), 0 (out of stock), or backorder");
    enumCheck(out, rowIndex, "Backorders allowed?", BACKORDERS, "1, 0, or notify");
    enumCheck(
      out,
      rowIndex,
      "Tax status",
      Object.fromEntries([...TAX_STATUS].map((t) => [t, t])),
      "taxable, shipping, or none"
    );

    // Plain 1/0 booleans
    for (const col of Object.keys(out)) {
      if (!BOOL_COLUMNS.includes(col) && !ATTR_BOOL_RE.test(col)) continue;
      const raw = out[col];
      if (isEmpty(raw)) continue;
      const b = boolValue(raw);
      if (b == null) {
        issues.push({
          rowIndex,
          column: col,
          severity: "error",
          code: "woocommerce/invalid_bool",
          message: `${col} must be 1 or 0. Found '${raw}'.`,
          suggestion: "Use 1 (yes) or 0 (no).",
        });
      } else if (b !== raw.trim()) {
        out[col] = b;
        fixesApplied.push(`Normalized ${col} to '${b}' on row ${rowIndex + 1}`);
      }
    }

    // Whole-number columns
    for (const col of ["Stock", "Low stock amount", "Download limit", "Download expiry days", "Position"]) {
      if (!(col in out) || isEmpty(out[col])) continue;
      const raw = out[col].trim();
      const n = parseShopifyMoney(raw);
      if (n == null || !Number.isInteger(n)) {
        issues.push({
          rowIndex,
          column: col,
          severity: "error",
          code: "woocommerce/invalid_int",
          message: `${col} should be a whole number. Found '${raw}'.`,
          suggestion: "Use a whole number (e.g., 0, 5, 12).",
        });
      } else if (String(n) !== raw) {
        out[col] = String(n);
        fixesApplied.push(`Normalized ${col} to '${n}' on row ${rowIndex + 1}`);
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
            severity: "error",
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

    // Categories / Tags (escaped "\," stays inside one item)
    if ("Categories" in out && !isEmpty(out["Categories"])) {
      const before = out["Categories"];
      const after = normalizeCategoryHierarchy(before);
      if (after !== before.trim()) {
        out["Categories"] = after;
        fixesApplied.push(`Normalized Categories formatting on row ${rowIndex + 1}`);
      }
    }
    if ("Tags" in out && !isEmpty(out["Tags"])) {
      const before = out["Tags"];
      const after = normalizeList(before);
      if (after !== before.trim()) {
        out["Tags"] = after;
        fixesApplied.push(`Normalized Tags formatting on row ${rowIndex + 1}`);
      }
    }

    // Images: comma-separated URLs (attachment IDs are also accepted)
    if ("Images" in out && !isEmpty(out["Images"])) {
      const before = out["Images"];
      const items = splitList(before);
      const bad = items.filter((u) => !isHttpUrl(u) && !/^\d+$/.test(u));
      if (bad.length) {
        issues.push({
          rowIndex,
          column: "Images",
          severity: "warning",
          code: "woocommerce/invalid_image_url",
          message: `One or more image URLs are invalid: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`,
          suggestion: "Use full https:// URLs separated by commas.",
          details: { badUrls: bad },
        });
      }
      const cleaned = items.join(", ");
      if (cleaned !== before.trim()) {
        out["Images"] = cleaned;
        fixesApplied.push(`Cleaned Images URL list on row ${rowIndex + 1}`);
      }
    }

    // Variation structure
    if (baseType === "variation") {
      const parent = out["Parent"]?.trim() ?? "";
      if (!parent) {
        issues.push({
          rowIndex,
          column: "Parent",
          severity: "error",
          code: "woocommerce/variation_missing_parent",
          message: "Variation row is missing Parent reference.",
          suggestion: "Set Parent to the variable product's SKU, or id:123 for its product ID.",
        });
      }
      const named = attrIdx.filter((n) => !isEmpty(out[`Attribute ${n} name`] ?? ""));
      if (!named.length) {
        issues.push({
          rowIndex,
          column: attrIdx.length ? `Attribute ${attrIdx[0]} name` : "Attribute 1 name",
          severity: "error",
          code: "woocommerce/variation_missing_attributes",
          message: "Variation row has no attribute (e.g. Attribute 1 name = Size, Attribute 1 value(s) = M).",
          suggestion: "Set the attribute name and this variation's value.",
        });
      }
      for (const n of named) {
        const v = (out[`Attribute ${n} value(s)`] ?? "").trim();
        if (splitList(v).length > 1) {
          issues.push({
            rowIndex,
            column: `Attribute ${n} value(s)`,
            severity: "error",
            code: "woocommerce/variation_multiple_values",
            message: `Variation has several values for ${out[`Attribute ${n} name`]} ('${v}'); a variation takes one.`,
            suggestion: "List all values on the parent row, and one value per variation row.",
          });
        }
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
        severity: "error",
        code: "woocommerce/duplicate_sku",
        message: `Duplicate SKU '${sku}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "WooCommerce requires a unique SKU per product and variation.",
        details: { sku, rows: rows1b },
      });
    }
  }

  // Variations: parents in this file, and unique attribute combinations per parent.
  const fileParents = new Set<string>();
  for (const r of outRows) {
    if (r["SKU"]?.trim()) fileParents.add(r["SKU"].trim().toLowerCase());
    if (r["ID"]?.trim()) fileParents.add(`id:${r["ID"].trim()}`);
  }
  const seen = new Map<string, number[]>();
  for (let i = 0; i < outRows.length; i++) {
    const r = outRows[i];
    if (!normalizeWooType(r["Type"] ?? "").split(", ").includes("variation")) continue;
    const parent = (r["Parent"] ?? "").trim();
    if (!parent) continue;

    if (mode === "variable" && !fileParents.has(parent.toLowerCase())) {
      issues.push({
        rowIndex: i,
        column: "Parent",
        severity: "info",
        code: "woocommerce/parent_not_in_file",
        message: `Parent '${parent}' is not in this file, so it must already exist in your store.`,
        suggestion: "Import the variable (parent) product first, or add its row above its variations.",
      });
    }

    const combo = attrIdx
      .map((n) => `${(r[`Attribute ${n} name`] ?? "").trim().toLowerCase()}=${(r[`Attribute ${n} value(s)`] ?? "").trim().toLowerCase()}`)
      .filter((x) => x !== "=")
      .join("|");
    if (!combo) continue;
    const key = `${parent.toLowerCase()}||${combo}`;
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
        column: attrIdx.length ? `Attribute ${attrIdx[0]} value(s)` : "Attribute 1 value(s)",
        severity: "error",
        code: "woocommerce/duplicate_variation_combo",
        message: `Duplicate variation attribute combination detected for this Parent (${rows1b.join(", ")}).`,
        suggestion: "Each variation under the same parent must have a unique attribute combination.",
        details: { signature: key, rows: rows1b },
      });
    }
  }

  // Output keeps the file's own columns (renamed to WooCommerce's names where recognised).
  // We never add empty columns: when updating products, WooCommerce clears fields whose
  // mapped column is blank.
  const fixedHeaders = canonHeaders;
  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    return out;
  });

  if (canonHeaders.some((h, i) => h !== headers[i].trim())) {
    fixesApplied.push("WooCommerce: renamed recognised columns to WooCommerce's importer names");
  }

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
