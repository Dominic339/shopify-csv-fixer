// src/lib/shopifySchema.ts
import type { CsvRow } from "./csv";

/**
 * Shopify Product CSV canonical schema (core, stable columns we actively support).
 *
 * Notes:
 * - Shopify’s product CSV supports many more columns (markets, metafields, etc.).
 * - StriveFormats must NEVER drop unknown columns; they are appended after canonical headers.
 * - We canonicalize legacy exports ("Handle", "Body (HTML)", "Image Src", etc.) into the newer names
 *   ("URL handle", "Description", "Product image URL", etc.).
 *
 * Shopify references:
 * - Shopify Help Center: "Using CSV files to import and export products"
 *   (Title + URL handle are key requirements, and the modern naming is URL handle, Published on online store, etc.)
 */
export const SHOPIFY_CANONICAL_HEADERS: string[] = [
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

export type CanonKey = string;

export type CanonicalizeResult = {
  fixedHeaders: string[]; // canonical headers first, unknown appended
  fixedRows: CsvRow[]; // every row has keys for every fixedHeader
  unknownHeaders: string[];
  // Map of canonical header -> source header we copied from (null = not in the input file)
  sourceMap: Record<string, string | null>;
};

function normHeader(h: string) {
  return String(h ?? "").trim().replace(/\s+/g, " ");
}
function normKey(h: string) {
  return normHeader(h).toLowerCase();
}

/**
 * Alternate header names Shopify (or older Shopify exports) use for each canonical column.
 * Matching is case-insensitive. The canonical name itself always matches.
 */
export const SHOPIFY_HEADER_ALIASES: Record<string, string[]> = {
  "URL handle": ["Handle"],
  "Description": ["Body (HTML)", "Body HTML", "Body"],
  "Published on online store": ["Published"],
  "SKU": ["Variant SKU"],
  // Shopify now exports "Barcodes"; a file may contain one or the other, never both.
  "Barcode": ["Barcodes", "Variant Barcode"],
  "Option1 Linked To": ["Option1 LinkedTo"],
  "Option2 Linked To": ["Option2 LinkedTo"],
  "Option3 Linked To": ["Option3 LinkedTo"],
  "Price": ["Variant Price"],
  "Compare-at price": ["Variant Compare At Price", "Compare at price"],
  "Cost per item": ["Variant Cost"],
  "Charge tax": ["Variant Taxable"],
  "Tax code": ["Variant Tax Code"],
  "Inventory tracker": ["Variant Inventory Tracker"],
  "Inventory quantity": ["Variant Inventory Qty", "Inventory Qty"],
  "Continue selling when out of stock": ["Variant Inventory Policy"],
  "Weight value (grams)": ["Variant Grams", "Grams", "Weight (g)", "Weight (grams)"],
  "Weight unit for display": ["Variant Weight Unit", "Weight Unit"],
  "Requires shipping": ["Variant Requires Shipping"],
  "Fulfillment service": ["Variant Fulfillment Service"],
  "Product image URL": ["Image Src", "Image URL"],
  "Variant image URL": ["Variant Image"],
  // NOTE: Google's category is a separate column from Shopify's "Product category" taxonomy.
  "Google Shopping / Google product category": ["Google Product Category"],
  "Google Shopping / Manufacturer part number (MPN)": ["Google Shopping / MPN"],
  "Google Shopping / Ad group name": ["Google Shopping / AdWords Grouping"],
  "Google Shopping / Ads labels": ["Google Shopping / AdWords Labels"],
};

const LEGACY_WEIGHT_HEADER = "Variant Weight";

function resolveSourceHeader(inputHeaders: string[], possible: string[]): string | null {
  const lookup = new Map<string, string>();
  for (const h of inputHeaders) lookup.set(normKey(h), normHeader(h));
  for (const p of possible) {
    const hit = lookup.get(normKey(p));
    if (hit) return hit;
  }
  return null;
}

export function canonicalizeShopifyProductCsv(headers: string[], rows: CsvRow[]): CanonicalizeResult {
  const inputHeaders = (headers ?? []).map(normHeader).filter((h) => h.length > 0);

  // Build canonical -> source header mapping from aliases (canonical name preferred)
  const sourceMap: Record<string, string | null> = {};
  const consumed = new Set<string>();
  for (const canon of SHOPIFY_CANONICAL_HEADERS) {
    const src = resolveSourceHeader(inputHeaders, [canon, ...(SHOPIFY_HEADER_ALIASES[canon] ?? [])]);
    sourceMap[canon] = src;
    if (src) consumed.add(normKey(src));
  }

  // Unknown headers (metafields, Collection, market prices, ...) are preserved exactly,
  // appended after canonical. Alias columns that fed a canonical column are not repeated.
  const legacyWeightSrc = sourceMap["Weight value (grams)"]
    ? null
    : resolveSourceHeader(inputHeaders, [LEGACY_WEIGHT_HEADER]);
  if (legacyWeightSrc) {
    consumed.add(normKey(legacyWeightSrc));
    sourceMap["Weight value (grams)"] = legacyWeightSrc;
  }

  const unknownHeaders = inputHeaders.filter((h) => !consumed.has(normKey(h)));

  // Build fixed header order: canonical first, then unknown appended (stable)
  const fixedHeaders = [...SHOPIFY_CANONICAL_HEADERS, ...unknownHeaders];

  // Build rows with canonical keys filled from whichever source exists (prefer direct canonical col if present)
  const fixedRows: CsvRow[] = (rows ?? []).map((r) => {
    const out: CsvRow = {};

    // 1) canonical fields
    for (const canon of SHOPIFY_CANONICAL_HEADERS) {
      const src = sourceMap[canon];
      const val = src ? (r?.[src] ?? "") : "";
      out[canon] = typeof val === "string" ? val : String(val ?? "");
    }

    // Legacy "Variant Weight" + "Variant Weight Unit" → grams
    if (legacyWeightSrc) {
      const grams = weightToGrams(r?.[legacyWeightSrc] ?? "", out["Weight unit for display"] ?? "");
      if (grams != null) out["Weight value (grams)"] = String(grams);
    }

    // 2) unknown fields appended, untouched
    for (const uh of unknownHeaders) {
      const val = r?.[uh] ?? "";
      out[uh] = typeof val === "string" ? val : String(val ?? "");
    }

    // Ensure every fixed header exists
    for (const h of fixedHeaders) out[h] = out[h] ?? "";

    return out;
  });

  return { fixedHeaders, fixedRows, unknownHeaders, sourceMap };
}

// Handle characters Shopify keeps: lowercase letters (any script), digits, single dashes.
const HANDLE_RE = /^[\p{Ll}\p{Lo}\p{Lm}\p{N}]+(?:-[\p{Ll}\p{Lo}\p{Lm}\p{N}]+)*$/u;

export function isValidShopifyHandle(input: string): boolean {
  return HANDLE_RE.test(String(input ?? "").trim());
}

/**
 * Turn arbitrary text into a Shopify-style handle.
 * Keeps letters from every script (Japanese, Cyrillic, ...); strips accents only from
 * Latin letters (café → cafe) so marks like Japanese dakuten are not destroyed.
 */
export function slugifyShopifyHandle(input: string): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/([A-Za-z])\p{M}+/gu, "$1")
    .normalize("NFC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeShopifyBool(input: string): string {
  // Shopify docs show lowercase true/false for several fields.
  const s = String(input ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "true" || s === "false") return s;
  if (s === "yes" || s === "y" || s === "1") return "true";
  if (s === "no" || s === "n" || s === "0") return "false";
  // keep original if ambiguous (validator will flag)
  return String(input ?? "").trim();
}

export function isValidShopifyBool(input: string): boolean {
  const s = String(input ?? "").trim().toLowerCase();
  return s === "true" || s === "false";
}

// Shopify "Continue selling when out of stock" is an inventory policy: deny | continue
export function normalizeShopifyInventoryPolicy(input: string): string {
  const s = String(input ?? "").trim().toLowerCase();
  if (!s) return "";

  // Accept canonical values
  if (s === "deny" || s === "continue") return s;

  // Common boolean-ish inputs: map to Shopify policy
  if (s === "true" || s === "t" || s === "yes" || s === "y" || s === "1") return "continue";
  if (s === "false" || s === "f" || s === "no" || s === "n" || s === "0") return "deny";

  // Keep original if ambiguous (validator will flag)
  return String(input ?? "").trim();
}

export function isValidShopifyInventoryPolicy(input: string): boolean {
  const s = String(input ?? "").trim().toLowerCase();
  return s === "deny" || s === "continue";
}

/**
 * Parse a number written in US or European style, with optional currency symbols/codes.
 *   "19.99"  "$1,234.56"  "€12,50"  "1.234,56 €"  "CHF 1'299.00"  "12 345,67"
 * Returns null when the text is not a number.
 */
export function parseLocaleNumber(input: string): number | null {
  let s = String(input ?? "").trim();
  if (!s) return null;

  // Currency symbols/codes at either end, and grouping spaces/apostrophes inside.
  s = s
    .replace(/^[^\d\-.,]+/, "")
    .replace(/[^\d.,]+$/, "")
    .replace(/[\s\u00a0\u202f\u2009'’]/g, "");

  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalized: string;

  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: whichever comes last is the decimal separator.
    const dec = lastDot > lastComma ? "." : ",";
    const group = dec === "." ? "," : ".";
    const [intPart, frac, ...rest] = s.split(dec);
    if (rest.length) return null;
    if (!isGrouped(intPart, group)) return null;
    normalized = intPart.split(group).join("") + "." + frac;
  } else if (lastComma >= 0) {
    const parts = s.split(",");
    if (parts.length > 2) {
      if (!isGrouped(s, ",")) return null;
      normalized = parts.join("");
    } else if (parts[1].length === 3 && /^[1-9]\d{0,2}$/.test(parts[0])) {
      normalized = parts.join(""); // "1,234" → 1234 (thousands)
    } else {
      normalized = parts[0] + "." + parts[1]; // "12,50" → 12.50 (decimal comma)
    }
  } else if (lastDot >= 0 && s.indexOf(".") !== lastDot) {
    if (!isGrouped(s, ".")) return null;
    normalized = s.split(".").join(""); // "1.234.567"
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function isGrouped(intPart: string, sep: string): boolean {
  if (!intPart.includes(sep)) return /^\d+$/.test(intPart);
  return new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(intPart);
}

/** @deprecated name kept for existing callers; parses US and European formats. */
export function parseShopifyMoney(input: string): number | null {
  return parseLocaleNumber(input);
}

export function formatShopifyMoney(n: number): string {
  // Shopify accepts plain numbers; we keep 2 decimals for determinism
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function isHttpUrl(s: string): boolean {
  const raw = String(s ?? "").trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function weightToGrams(valueRaw: string, unitRaw: string): number | null {
  const n = parseLocaleNumber(valueRaw);
  if (n == null) return null;
  const u = String(unitRaw ?? "").trim().toLowerCase();
  if (!u || u === "g" || u === "gram" || u === "grams") return Math.round(n);
  if (u === "kg" || u === "kilogram" || u === "kilograms") return Math.round(n * 1000);
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return Math.round(n * 453.59237);
  if (u === "oz" || u === "ounce" || u === "ounces") return Math.round(n * 28.349523125);
  return null;
}
