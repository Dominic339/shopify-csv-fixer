// src/lib/formats/builtins/woocommerceProducts.ts

import type { CsvFormat } from "../types";
import { validateAndFixWooCommerceProducts, WOO_EXPECTED_HEADERS, WOO_EXAMPLE_ROW } from "@/lib/woocommerceOptimizer";

export const woocommerceProducts: CsvFormat = {
  id: "woocommerce_products",
  name: "WooCommerce Products",
  description: "Validate and auto-fix WooCommerce Product CSV imports (core importer schema).",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: WOO_EXPECTED_HEADERS,
  exampleRow: WOO_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "WooCommerce's built-in Product CSV Importer is strict about column names, data types, and variation structure. This preset validates your file against the canonical importer fields and applies safe normalizations so your import runs cleanly.",
      "Use it for migrations, bulk price updates, adding categories/tags, and importing variable products with variations. Anything risky stays in the issue list for manual review.",
    ],
    howItWorks: [
      "Upload your WooCommerce product CSV (export or import template).",
      "We canonicalize headers, normalize common values, and flag missing required fields.",
      "Safe fixes are applied automatically (booleans, prices, URL cleanup).",
      "Review remaining issues, then export an import-ready CSV.",
    ],
    commonFixes: [
      "Normalize Published / In stock? / Backorders allowed? / Sold individually?",
      "Normalize Regular price / Sale price to plain decimals (no currency symbols)",
      "Trim whitespace everywhere and normalize category/tag separators",
      "Validate image URLs and remove empty entries",
      "Detect duplicate variation attribute combinations under the same parent",
    ],
    faq: [
      {
        q: "Does this work with WooCommerce's built-in importer?",
        a: "Yes. This preset is built around WooCommerce's core Product CSV importer fields and the common export headers you map in the import UI.",
      },
      {
        q: "Will it handle variations?",
        a: "It validates variation structure (Parent + attributes) and detects duplicate variation combinations. Safe fixes are applied automatically; structural mistakes remain as blockers.",
      },
      {
        q: "What about plugin-specific columns?",
        a: "We keep extra columns intact and place them after the canonical WooCommerce columns on export.",
      },
    ],
  },
  apply: validateAndFixWooCommerceProducts,
};
