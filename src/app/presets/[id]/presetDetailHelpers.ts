// src/app/presets/[id]/presetDetailHelpers.ts
// Shared helpers used by both the English preset detail page
// and the [locale] variant. Extracting here avoids duplication.

export function sampleValueFor(header: string): string {
  const h = header.toLowerCase();
  if (h.includes("title") || h.includes("name") || h.includes("item")) return "Sample Product";
  if (h.includes("sku")) return "SKU-1001";
  if (h.includes("handle")) return "sample-product";
  if (h.includes("price")) return "19.99";
  if (h.includes("quantity") || h.includes("stock") || h.includes("inventory")) return "10";
  if (h.includes("published")) return "TRUE";
  if (h.includes("url") || h.includes("image")) return "https://example.com/image.jpg";
  if (h.includes("category")) return "Example Category";
  if (h.includes("tag")) return "tag-one, tag-two";
  return "";
}

export function mergeExampleRow(
  headers: string[],
  exampleRow?: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    const v = exampleRow?.[h];
    out[h] = typeof v === "string" ? v : sampleValueFor(h);
  }
  return out;
}
