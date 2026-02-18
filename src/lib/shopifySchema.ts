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
  // Product
  "Title",
  "URL handle",
  "Description",
  "Vendor",
  "Product category",
  "Type",
  "Tags",
  "Published on online store",
  "Status",

  // Common product/variant boolean fields
  "Charge tax",
  "Requires shipping",
  "Gift card",

  // Variant identifiers + options
  "SKU",
  "Barcode",
  "Option1 name",
  "Option1 value",
  "Option2 name",
  "Option2 value",
  "Option3 name",
  "Option3 value",

  // Pricing
  "Price",
  "Compare-at price",

  // Inventory (single-location quantity + key flags)
  "Inventory tracker",
  "Inventory quantity",
  "Continue selling when out of stock",

  // Shipping / weight
  "Weight unit for display",
  "Weight value (grams)",

  // Fulfillment
  "Fulfillment service",

  // Images
  "Product image URL",
  "Variant image URL",
  "Image position",
  "Image alt text",

  // SEO
  "SEO title",
  "SEO description",
];

export type CanonKey =
  | "Title"
  | "URL handle"
  | "Description"
  | "Vendor"
  | "Product category"
  | "Type"
  | "Tags"
  | "Published on online store"
  | "Status"
  | "Charge tax"
  | "Requires shipping"
  | "Gift card"
  | "SKU"
  | "Barcode"
  | "Option1 name"
  | "Option1 value"
  | "Option2 name"
  | "Option2 value"
  | "Option3 name"
  | "Option3 value"
  | "Price"
  | "Compare-at price"
  | "Inventory tracker"
  | "Inventory quantity"
  | "Continue selling when out of stock"
  | "Weight unit for display"
  | "Weight value (grams)"
  | "Fulfillment service"
  | "Product image URL"
  | "Variant image URL"
  | "Image position"
  | "Image alt text"
  | "SEO title"
  | "SEO description";

export type CanonicalizeResult = {
  fixedHeaders: string[]; // canonical headers first, unknown appended
  fixedRows: CsvRow[]; // every row has keys for every fixedHeader
  unknownHeaders: string[];
  // Map of canonical header -> source header we copied from (useful for debugging)
  sourceMap: Record<string, string | null>;

  // Safety diagnostics (to prevent silent data loss)
  duplicateInputHeaders: Array<{ header: string; count: number }>;
  // Cases where multiple source columns map to the same canonical column via aliases
  headerCollisions: Array<{ canonical: string; sources: string[] }>;
  // Any duplicates in the final fixed header list (should be empty)
  duplicateOutputHeaders: Array<{ header: string; count: number }>;
};

function normHeader(h: string) {
  return String(h ?? "").trim().replace(/\s+/g, " ");
}
function normKey(h: string) {
  return normHeader(h).toLowerCase();
}

export const SHOPIFY_HEADER_ALIASES: Record<CanonKey, string[]> = {
  "Title": ["Title"],
  "URL handle": ["URL handle", "Handle"],
  "Description": ["Description", "Body (HTML)", "Body HTML", "Body"],
  "Vendor": ["Vendor"],
  "Product category": ["Product category", "Google Shopping / Google Product Category", "Google Product Category"],
  "Type": ["Type"],
  "Tags": ["Tags"],
  "Published on online store": ["Published on online store", "Published"],
  "Status": ["Status"],
  "Charge tax": ["Charge tax"],
  "Requires shipping": ["Requires shipping"],
  "Gift card": ["Gift card"],
  "SKU": ["SKU", "Variant SKU"],
  "Barcode": ["Barcode"],
  "Option1 name": ["Option1 name", "Option1 Name"],
  "Option1 value": ["Option1 value", "Option1 Value"],
  "Option2 name": ["Option2 name", "Option2 Name"],
  "Option2 value": ["Option2 value", "Option2 Value"],
  "Option3 name": ["Option3 name", "Option3 Name"],
  "Option3 value": ["Option3 value", "Option3 Value"],
  "Price": ["Price", "Variant Price"],
  "Compare-at price": ["Compare-at price", "Variant Compare At Price", "Compare at price"],
  "Inventory tracker": ["Inventory tracker", "Variant Inventory Tracker", "Inventory Tracker"],
  "Inventory quantity": ["Inventory quantity", "Variant Inventory Qty", "Inventory Qty"],
  "Continue selling when out of stock": ["Continue selling when out of stock", "Variant Inventory Policy"],
  "Weight unit for display": ["Weight unit for display", "Variant Weight Unit", "Weight Unit"],
  "Weight value (grams)": ["Weight value (grams)", "Variant Grams", "Grams", "Weight (g)", "Weight (grams)"],
  "Fulfillment service": ["Fulfillment service", "Variant Fulfillment Service", "Fulfillment Service"],
  "Product image URL": ["Product image URL", "Image Src", "Image URL"],
  "Variant image URL": ["Variant image URL", "Variant Image"],
  "Image position": ["Image position", "Image Position"],
  "Image alt text": ["Image alt text", "Image Alt Text"],
  "SEO title": ["SEO title", "SEO Title"],
  "SEO description": ["SEO description", "SEO Description"],
};

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

  // Detect duplicate headers in the input after normalization (risk of overwriting data)
  const dupMap = new Map<string, { header: string; count: number }>();
  for (const h of inputHeaders) {
    const k = normKey(h);
    const prev = dupMap.get(k);
    if (prev) prev.count += 1;
    else dupMap.set(k, { header: h, count: 1 });
  }
  const duplicateInputHeaders = [...dupMap.values()].filter((v) => v.count > 1);


  // Determine unknown headers (preserve them exactly; appended after canonical)
  const canonicalSet = new Set(SHOPIFY_CANONICAL_HEADERS.map(normKey));
  const unknownHeaders = inputHeaders.filter((h) => !canonicalSet.has(normKey(h)));

  // Build canonical -> source header mapping from aliases
  const sourceMap: Record<string, string | null> = {};
  for (const canon of SHOPIFY_CANONICAL_HEADERS) {
    const key = canon as CanonKey;
    sourceMap[canon] = resolveSourceHeader(inputHeaders, SHOPIFY_HEADER_ALIASES[key] ?? [canon]);
  }

  // Detect alias collisions: more than one input column matches the same canonical field
  const headerCollisions: Array<{ canonical: string; sources: string[] }> = [];
  for (const canon of SHOPIFY_CANONICAL_HEADERS) {
    const key = canon as CanonKey;
    const aliases = SHOPIFY_HEADER_ALIASES[key] ?? [canon];
    const matches: string[] = [];
    for (const h of inputHeaders) {
      const hk = normKey(h);
      if (aliases.some((a) => normKey(a) === hk)) {
        if (!matches.includes(h)) matches.push(h);
      }
    }
    if (matches.length > 1) headerCollisions.push({ canonical: canon, sources: matches });
  }


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

    // 2) unknown fields appended, untouched
    for (const uh of unknownHeaders) {
      const val = r?.[uh] ?? "";
      out[uh] = typeof val === "string" ? val : String(val ?? "");
    }

    // 3) preserve any stray keys (shouldn’t happen often, but never drop)
    for (const [k, v] of Object.entries(r ?? {})) {
      const nk = normHeader(k);
      if (!(nk in out)) out[nk] = typeof v === "string" ? v : String(v ?? "");
    }

    // Ensure every fixed header exists
    for (const h of fixedHeaders) out[h] = out[h] ?? "";

    return out;
  });


  // Detect duplicates in the output header list (should generally be empty; duplicates break imports)
  const outMap = new Map<string, { header: string; count: number }>();
  for (const h of fixedHeaders) {
    const k = normKey(h);
    const prev = outMap.get(k);
    if (prev) prev.count += 1;
    else outMap.set(k, { header: h, count: 1 });
  }
  const duplicateOutputHeaders = [...outMap.values()].filter((v) => v.count > 1);

  return { fixedHeaders, fixedRows, unknownHeaders, sourceMap, duplicateInputHeaders, headerCollisions, duplicateOutputHeaders };

}

export function slugifyShopifyHandle(input: string): string {
  // Shopify: letters, numbers, dashes; no spaces. We’ll be conservative and deterministic.
  const s = String(input ?? "").trim().toLowerCase();
  if (!s) return "";
  const replaced = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ") // remove punctuation
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return replaced;
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

export function parseShopifyMoney(input: string): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
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
