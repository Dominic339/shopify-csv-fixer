// src/lib/formats/builtins/shopifyProducts.ts
import type { CsvFormat, CsvRow } from "../types";
import { validateAndFixShopifyOptimizer } from "@/lib/shopifyOptimizer";

export const shopifyProductsFormat: CsvFormat = {
  id: "shopify_products",
  name: "Shopify Import Optimizer",
  description:
    "Strict Shopify schema validation + safe auto-fixes for products, variants, pricing, inventory, images, and SEO.",
  category: "Ecommerce",
  source: "builtin",

  apply: (headers: string[], rows: CsvRow[]) => {
    const res = validateAndFixShopifyOptimizer(headers ?? [], rows ?? []);

    const issues = (res.issues ?? []).map((i: any) => {
      const row1 = typeof i.row === "number" ? i.row : typeof i.rowIndex === "number" ? i.rowIndex + 1 : undefined;
      const rowIndex = typeof row1 === "number" ? Math.max(0, row1 - 1) : -1;

      return {
        rowIndex, // -1 = file-level
        column: i.column ?? i.field ?? "(file)",
        message: i.message,
        severity: (i.severity ?? i.level ?? "error") as "error" | "warning" | "info",
        code: i.code,
        suggestion: i.suggestion,
      };
    });

    return {
      fixedHeaders: res.fixedHeaders ?? (headers ?? []),
      fixedRows: res.fixedRows ?? (rows ?? []),
      issues,
      fixesApplied: res.fixesApplied ?? [],
    };
  },
};
