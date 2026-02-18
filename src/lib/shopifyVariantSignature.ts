// src/lib/shopifyVariantSignature.ts
// Shared helper used by both Shopify validation and import simulation.
// It ensures that "duplicate option combos" are computed the same way everywhere.

export type ShopifyVariantColumns = {
  handle: string;
  opt1Val: string;
  opt2Val: string;
  opt3Val: string;
  sku: string;
  price: string;
};

export type ShopifyVariantSignature = {
  handle: string;
  comboKey: string; // normalized (lowercased) Option1/2/3 Value combo: "v1|v2|v3"
  v1: string;
  v2: string;
  v3: string;
  hasVariantSignals: boolean;
};

export function resolveShopifyVariantColumns(headers: string[]): ShopifyVariantColumns {
  const norm = (s: string) => s.toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();

  const pick = (preferred: string, fallbacks: string[] = []) => {
    const want = [preferred, ...fallbacks].map(norm);
    for (const h of headers) {
      if (want.includes(norm(h))) return h;
    }
    // Best-effort fallback to preferred label even if not present.
    return preferred;
  };

  return {
    handle: pick("Handle"),
    opt1Val: pick("Option1 Value", ["Option 1 Value", "Option1Value"]),
    opt2Val: pick("Option2 Value", ["Option 2 Value", "Option2Value"]),
    opt3Val: pick("Option3 Value", ["Option 3 Value", "Option3Value"]),
    sku: pick("Variant SKU", ["SKU", "VariantSKU"]),
    price: pick("Variant Price", ["Price", "VariantPrice"]),
  };
}

export function getShopifyVariantSignature<RowT>(
  row: RowT,
  cols: ShopifyVariantColumns,
  getter: (row: RowT, col: string) => string
): ShopifyVariantSignature {
  const handle = getter(row, cols.handle).trim();
  const v1 = getter(row, cols.opt1Val).trim();
  const v2 = getter(row, cols.opt2Val).trim();
  const v3 = getter(row, cols.opt3Val).trim();

  const sku = getter(row, cols.sku).trim();
  const price = getter(row, cols.price).trim();

  // Match strict validator behavior: ignore rows that do not look like variant rows.
  // Shopify CSV allows image-only rows where variant fields are blank.
  const hasVariantSignals = Boolean(sku || price || v1 || v2 || v3);

  const comboKey = [v1, v2, v3].join("|").toLowerCase();

  return { handle, comboKey, v1, v2, v3, hasVariantSignals };
}
