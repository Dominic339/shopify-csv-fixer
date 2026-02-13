import type { CsvFormat, CsvRow } from "../types";
import { validateAndFixShopifyOptimizer } from "@/lib/shopifyOptimizer";

export const shopifyProductsFormat: CsvFormat = {
  id: "shopify_products",
  name: "Shopify Import Optimizer",
  description: "Strict Shopify schema validation + safe auto-fixes for products, variants, images, pricing, inventory, and SEO.",
  category: "Ecommerce",
  source: "builtin",

  apply: (headers: string[], rows: CsvRow[]) => {
    const res = validateAndFixShopifyOptimizer(headers, rows);

    const issues = (res.issues ?? []).map((i: any) => ({
      rowIndex: typeof i.row === "number" ? Math.max(0, i.row - 1) : -1,
      column: i.column ?? "(file)",
      message: i.message,
      severity: (i.severity ?? i.level ?? "error") as "error" | "warning" | "info",
      code: i.code,
      suggestion: i.suggestion,
    }));

    return {
      fixedHeaders: res.fixedHeaders ?? headers,
      fixedRows: res.fixedRows ?? rows,
      issues,
      fixesApplied: res.fixesApplied ?? [],
    };
  },
};
