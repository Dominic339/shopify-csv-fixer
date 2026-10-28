// src/lib/shopifyOutput.ts
// Decide which columns a fixed Shopify file is exported with.
//
// Shopify treats a blank cell as "erase this value" when overwriting products, but a
// missing column as "leave unchanged". So we never add an empty column the user didn't
// have: output = Shopify columns present in the input (official names + order), plus
// Title / URL handle, plus any Shopify column the fixer filled in, then every other
// input column (metafields, Collection, market prices, ...) untouched.

import type { CsvRow } from "@/lib/csv";
import { SHOPIFY_CANONICAL_HEADERS, SHOPIFY_HEADER_ALIASES } from "@/lib/shopifySchema";

const ALWAYS = new Set(["Title", "URL handle"]);

function key(h: string) {
  return String(h ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function shapeShopifyOutput(inputHeaders: string[], fixedHeaders: string[], fixedRows: CsvRow[]) {
  const inputKeys = new Set(inputHeaders.map(key));
  const canonical = new Set(SHOPIFY_CANONICAL_HEADERS);

  const inInput = (canon: string) =>
    [canon, ...(SHOPIFY_HEADER_ALIASES[canon] ?? [])].some((h) => inputKeys.has(key(h)));
  const hasValues = (canon: string) => fixedRows.some((r) => (r[canon] ?? "").trim() !== "");

  // Shopify renamed "Barcode" to "Barcodes" and rejects files containing both.
  const barcodeName = inputKeys.has("barcodes") ? "Barcodes" : "Barcode";
  const outName = (canon: string) => (canon === "Barcode" ? barcodeName : canon);

  const canonicalOut = SHOPIFY_CANONICAL_HEADERS.filter((c) => ALWAYS.has(c) || inInput(c) || hasValues(c));
  const extras = fixedHeaders.filter((h) => !canonical.has(h));

  const headers = [...canonicalOut.map(outName), ...extras];
  const rows = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (const c of canonicalOut) out[outName(c)] = r[c] ?? "";
    for (const h of extras) out[h] = r[h] ?? "";
    return out;
  });

  return {
    headers,
    rows,
    renameColumn: (col: string) => (col === "Barcode" ? barcodeName : col),
  };
}
