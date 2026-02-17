// src/lib/formats/engine.ts
import type { CsvFixResult, CsvRow, CsvIssue, CsvFormat } from "./types";

export function applyFormatToParsedCsv(headers: string[], rows: CsvRow[], format: CsvFormat): CsvFixResult {
  const res = format.apply(headers, rows);

  // ✅ Enforce strict Shopify template output (headers + order + key mappings)
  if (format.id === "shopify_products") {
    const inHeaders = res.fixedHeaders ?? headers;
    const inRows = res.fixedRows ?? rows;

    const enforced = enforceShopifyOfficialTemplate(inHeaders, inRows);
    const remappedIssues = remapIssuesToShopifyTemplate(res.issues ?? [], inHeaders);

    return {
      ...res,
      fixedHeaders: enforced.headers,
      fixedRows: enforced.rows,
      issues: remappedIssues,
      fixesApplied: [
        ...(res.fixesApplied ?? []),
        "Shopify: forced official import template header names + order",
      ],
    };
  }

  return res;
}

// Safe general cleanup used by multiple formats
export function normalizeRowsSafe(headers: string[], rows: CsvRow[]) {
  const fixesApplied: string[] = [];
  const fixedRows: CsvRow[] = rows.map((r) => {
    const out: CsvRow = {};
    for (const h of headers) {
      const v = r?.[h];
      out[h] = typeof v === "string" ? v : v == null ? "" : String(v);
    }
    return out;
  });

  // Trim whitespace everywhere (safe default)
  let trimmedCount = 0;
  for (const r of fixedRows) {
    for (const h of headers) {
      const before = r[h] ?? "";
      const after = (before ?? "").toString().trim();
      if (after !== before) {
        r[h] = after;
        trimmedCount++;
      }
    }
  }
  if (trimmedCount) fixesApplied.push("Trimmed whitespace in cells");

  return { fixedRows, fixesApplied };
}

/* -------------------------------------------
   Shopify official template enforcement
-------------------------------------------- */

const SHOPIFY_OFFICIAL_HEADERS: string[] = [
  "Title",
  "URL handle",
  "Description",
  "Vendor",
  "Product category",
  "Type",
  "Tags",
  "Published on online store",
  "Status",
  "SKU",
  "Barcode",
  "Option1 name",
  "Option1 value",
  "Option1 Linked To",
  "Option2 name",
  "Option2 value",
  "Option2 Linked To",
  "Option3 name",
  "Option3 value",
  "Option3 Linked To",
  "Price",
  "Compare-at price",
  "Cost per item",
  "Charge tax",
  "Tax code",
  "Unit price total measure",
  "Unit price total measure unit",
  "Unit price base measure",
  "Unit price base measure unit",
  "Inventory tracker",
  "Inventory quantity",
  "Continue selling when out of stock",
  "Weight value (grams)",
  "Weight unit for display",
  "Requires shipping",
  "Fulfillment service",
  "Product image URL",
  "Image position",
  "Image alt text",
  "Variant image URL",
  "Gift card",
  "SEO title",
  "SEO description",
  "Color (product.metafields.shopify.color-pattern)",
  "Google Shopping / Google product category",
  "Google Shopping / Gender",
  "Google Shopping / Age group",
  "Google Shopping / Manufacturer part number (MPN)",
  "Google Shopping / Ad group name",
  "Google Shopping / Ads labels",
  "Google Shopping / Condition",
  "Google Shopping / Custom product",
  "Google Shopping / Custom label 0",
  "Google Shopping / Custom label 1",
  "Google Shopping / Custom label 2",
  "Google Shopping / Custom label 3",
  "Google Shopping / Custom label 4",
];

// Legacy → Official mapping (common Shopify “old template” / variant style)
const SHOPIFY_LEGACY_TO_OFFICIAL: Record<string, string> = {
  // handle/body/published
  "Handle": "URL handle",
  "URL handle": "URL handle",
  "Body (HTML)": "Description",
  "Description": "Description",
  "Published": "Published on online store",
  "Published on online store": "Published on online store",

  // variant identity
  "Variant SKU": "SKU",
  "SKU": "SKU",
  "Variant Barcode": "Barcode",
  "Barcode": "Barcode",

  // options
  "Option1 Name": "Option1 name",
  "Option1 name": "Option1 name",
  "Option1 Value": "Option1 value",
  "Option1 value": "Option1 value",
  "Option2 Name": "Option2 name",
  "Option2 name": "Option2 name",
  "Option2 Value": "Option2 value",
  "Option2 value": "Option2 value",
  "Option3 Name": "Option3 name",
  "Option3 name": "Option3 name",
  "Option3 Value": "Option3 value",
  "Option3 value": "Option3 value",

  // pricing
  "Variant Price": "Price",
  "Price": "Price",
  "Variant Compare At Price": "Compare-at price",
  "Compare-at price": "Compare-at price",

  // inventory / shipping
  "Variant Inventory Qty": "Inventory quantity",
  "Inventory quantity": "Inventory quantity",
  "Variant Inventory Policy": "Continue selling when out of stock",
  "Continue selling when out of stock": "Continue selling when out of stock",
  "Variant Requires Shipping": "Requires shipping",
  "Requires shipping": "Requires shipping",
  "Variant Fulfillment Service": "Fulfillment service",
  "Fulfillment service": "Fulfillment service",

  // weight
  "Variant Grams": "Weight value (grams)",
  "Weight value (grams)": "Weight value (grams)",
  "Variant Weight": "Weight value (grams)", // (used with Variant Weight Unit)

  // images
  "Image Src": "Product image URL",
  "Product image URL": "Product image URL",
  "Image Position": "Image position",
  "Image position": "Image position",
  "Image Alt Text": "Image alt text",
  "Image alt text": "Image alt text",
  "Variant Image": "Variant image URL",
  "Variant image URL": "Variant image URL",

  // seo / gift
  "Gift Card": "Gift card",
  "Gift card": "Gift card",
  "SEO Title": "SEO title",
  "SEO title": "SEO title",
  "SEO Description": "SEO description",
  "SEO description": "SEO description",
};

function enforceShopifyOfficialTemplate(inputHeaders: string[], inputRows: CsvRow[]) {
  const headerIndex = new Map<string, string>();
  for (const h of inputHeaders) headerIndex.set(h, h);

  // Build per-row output with only official headers, mapped from legacy keys
  const outRows: CsvRow[] = inputRows.map((row) => {
    const mapped: CsvRow = {};

    // 1) Pull values from matching official columns (if already present)
    for (const h of SHOPIFY_OFFICIAL_HEADERS) {
      mapped[h] = (row?.[h] ?? "").toString();
    }

    // 2) Pull values from legacy columns into official columns (if official missing)
    for (const [legacy, official] of Object.entries(SHOPIFY_LEGACY_TO_OFFICIAL)) {
      const v = row?.[legacy];
      if (v == null) continue;
      const s = typeof v === "string" ? v : String(v);
      if (!mapped[official]) mapped[official] = s;
    }

    // 3) Normalize key Shopify booleans + numbers to what Shopify expects
    mapped["Published on online store"] = normalizeBool(mapped["Published on online store"]);
    mapped["Continue selling when out of stock"] = normalizeBool(mapped["Continue selling when out of stock"]);
    mapped["Requires shipping"] = normalizeBool(mapped["Requires shipping"]);
    mapped["Charge tax"] = normalizeBool(mapped["Charge tax"]);
    mapped["Gift card"] = normalizeBool(mapped["Gift card"]);

    // 4) Normalize prices (Shopify expects numeric text or blank)
    mapped["Price"] = normalizeMoney(mapped["Price"]);
    mapped["Compare-at price"] = normalizeMoney(mapped["Compare-at price"]);
    mapped["Cost per item"] = normalizeMoney(mapped["Cost per item"]);

    // 5) Weight: support legacy Variant Weight + Variant Weight Unit → grams
    const legacyWeight = (row?.["Variant Weight"] ?? "").toString().trim();
    const legacyUnit = (row?.["Variant Weight Unit"] ?? "").toString().trim().toLowerCase();
    if (!mapped["Weight value (grams)"] && legacyWeight) {
      const grams = weightToGramsSafe(legacyWeight, legacyUnit);
      if (grams != null) mapped["Weight value (grams)"] = String(grams);
    }
    if (!mapped["Weight unit for display"]) {
      // if they provided Variant Weight Unit, keep display unit sensible; otherwise default blank
      if (legacyUnit) mapped["Weight unit for display"] = normalizeWeightDisplayUnit(legacyUnit);
    }

    // 6) Inventory quantity should be integer text
    mapped["Inventory quantity"] = normalizeInteger(mapped["Inventory quantity"]);

    // 7) Common cleanup: avoid "undefined"
    for (const h of SHOPIFY_OFFICIAL_HEADERS) {
      const v = mapped[h];
      mapped[h] = v == null ? "" : String(v);
    }

    return mapped;
  });

  return { headers: SHOPIFY_OFFICIAL_HEADERS, rows: outRows };
}

function remapIssuesToShopifyTemplate(issues: CsvIssue[], inputHeaders: string[]) {
  if (!issues?.length) return issues;

  // If your format currently emits legacy column names, remap them so the UI highlights
  return issues.map((it) => {
    const col = it.column ?? "(file)";
    const mappedCol = SHOPIFY_LEGACY_TO_OFFICIAL[col] ?? col;
    return { ...it, column: mappedCol };
  });
}

/* -------------------------------------------
   Normalizers
-------------------------------------------- */

function normalizeBool(v: string): string {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (!s) return "";
  if (["true", "t", "yes", "y", "1"].includes(s)) return "true";
  if (["false", "f", "no", "n", "0"].includes(s)) return "false";

  // Shopify legacy "published"/blank sometimes appears
  if (s === "published") return "true";
  if (s === "unpublished") return "false";

  // If unknown, keep original (so validation can flag it)
  return (v ?? "").toString().trim();
}

function normalizeMoney(v: string): string {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  // Strip $, commas, spaces
  const cleaned = s.replace(/[$,\s]/g, "");
  // Allow plain numbers like 12, 12.3, 12.30
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return s; // keep as-is so validator can complain
  return cleaned;
}

function normalizeInteger(v: string): string {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  // allow "5", "0", "-1" (Shopify typically expects non-negative, but we won't hard force here)
  if (!/^-?\d+$/.test(s)) return s;
  return s;
}

function weightToGramsSafe(valueRaw: string, unitRaw: string): number | null {
  const s = valueRaw.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!isFinite(n)) return null;

  const u = (unitRaw ?? "").trim().toLowerCase();
  if (!u || u === "g" || u === "gram" || u === "grams") return Math.round(n);
  if (u === "kg" || u === "kilogram" || u === "kilograms") return Math.round(n * 1000);
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return Math.round(n * 453.59237);
  if (u === "oz" || u === "ounce" || u === "ounces") return Math.round(n * 28.349523125);

  // unknown unit
  return null;
}

function normalizeWeightDisplayUnit(u: string): string {
  const s = (u ?? "").trim().toLowerCase();
  if (!s) return "";
  if (["g", "gram", "grams"].includes(s)) return "g";
  if (["kg", "kilogram", "kilograms"].includes(s)) return "kg";
  if (["lb", "lbs", "pound", "pounds"].includes(s)) return "lb";
  if (["oz", "ounce", "ounces"].includes(s)) return "oz";
  return s;
}
