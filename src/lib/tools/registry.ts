// src/lib/tools/registry.ts
// The free single-purpose tools: URL slug and translation key (src/i18n/*.json → smallTools.tools).

export const SMALL_TOOLS = [
  { slug: "csv-splitter", key: "split" },
  { slug: "remove-duplicate-rows", key: "dedupe" },
  { slug: "fix-csv-encoding", key: "encoding" },
  { slug: "fix-barcodes", key: "barcodes" },
  { slug: "excel-to-csv", key: "excel" },
  { slug: "shopify-handle-generator", key: "handles" },
] as const;

export type SmallToolKey = (typeof SMALL_TOOLS)[number]["key"];

export const smallToolBySlug = (slug: string) => SMALL_TOOLS.find((x) => x.slug === slug);
