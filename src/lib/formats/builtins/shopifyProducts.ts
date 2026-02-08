import type { CsvFormat, CsvRow, CsvIssue, CsvFixResult } from "../types";
import { validateAndFixShopifyBasic } from "@/lib/shopifyBasic";

export const shopifyProductsFormat: CsvFormat = {
  id: "shopify_products",
  name: "Shopify Products",
  description: "Fixes common product import issues and exports a Shopify-ready CSV.",
  category: "Ecommerce",
  source: "builtin",
  apply: (headers: string[], rows: CsvRow[]): CsvFixResult => {
    const result = validateAndFixShopifyBasic(headers, rows);

    const issues: CsvIssue[] = (result.issues ?? []).map((it: any) => {
      const rowIndex =
        typeof it.rowIndex === "number"
          ? it.rowIndex
          : typeof it.row === "number"
            ? Math.max(0, it.row - 1)
            : 0;

      const column = (it.column ?? it.field ?? "").toString() || (headers[0] ?? "");
      const severity = ((it.severity ?? it.level ?? "error") as any) as "error" | "warning" | "info";

      return {
        rowIndex,
        column,
        message: it.message ?? "Issue",
        severity,
      };
    });

    return {
      fixedHeaders: result.fixedHeaders ?? headers,
      fixedRows: result.fixedRows ?? rows,
      issues,
      fixesApplied: result.fixesApplied ?? [],
    };
  },
};
