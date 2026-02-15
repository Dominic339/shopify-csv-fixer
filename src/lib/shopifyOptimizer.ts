// src/lib/shopifyOptimizer.ts
import type { CsvRow } from "./csv";
import { validateAndFixShopifyBasic, type FixResult, type Issue as BaseIssue } from "./shopifyBasic";
import { validateShopifyStrict } from "./shopifyStrictValidate";

export type ShopifyOptimizeResult = FixResult;

/**
 * Shopify optimizer
 * - Runs the basic canonicalizer + validator/fixer
 * - Adds a thin layer of Shopify-specific checks that are known to cause import failures.
 *
 * IMPORTANT:
 * - This is Shopify-only today, but it should remain generic and portable: checks should be re-usable,
 *   and codes must match issueMetaShopify for scoring/readiness.
 */
export function optimizeShopifyProductCsv(headers: string[], rows: CsvRow[]): ShopifyOptimizeResult {
  const base = validateAndFixShopifyBasic(headers, rows);
  const fixedHeaders = base.fixedHeaders;
  const fixedRows = base.fixedRows;

  const issues: BaseIssue[] = [...base.issues];
  const fixesApplied: string[] = [...base.fixesApplied];

  function add(i: BaseIssue) {
    // normalize older/alias codes -> canonical codes used by issue meta
    const map: Record<string, string> = {
      // base codes are already namespaced, but keep this for safety
      invalid_boolean_continue_selling: "shopify/invalid_inventory_policy",
      invalid_inventory_policy: "shopify/invalid_inventory_policy",
      invalid_numeric_price: "shopify/invalid_numeric_price",
      invalid_numeric_compare_at: "shopify/invalid_numeric_compare_at",
      compare_at_lt_price: "shopify/compare_at_lt_price",
      compare_at_less_than_price: "shopify/compare_at_lt_price",
      invalid_integer_inventory_qty: "shopify/invalid_integer_inventory_qty",
      negative_inventory: "shopify/negative_inventory",
      negative_inventory_qty: "shopify/negative_inventory",
    };

    if (i.code && !i.code.startsWith("shopify/")) {
      const norm = map[i.code];
      if (norm) i.code = norm;
      else i.code = `shopify/${i.code}`;
    }
    issues.push(i);
  }

  function col(name: string) {
    return fixedHeaders.find((h) => h.toLowerCase() === name.toLowerCase()) ?? name;
  }
  function colAny(...names: string[]) {
    for (const n of names) {
      const hit = fixedHeaders.find((h) => h.toLowerCase() === n.toLowerCase());
      if (hit) return hit;
    }
    return names[0];
  }

  const cHandle = colAny("Handle", "URL handle");
  const cTitle = col("Title");

  const anyVariantSignals = fixedRows.some((r) => {
    return (
      String((r as any)["Option1 value"] ?? "").trim() ||
      String((r as any)["Option2 value"] ?? "").trim() ||
      String((r as any)["Option3 value"] ?? "").trim() ||
      String((r as any)["SKU"] ?? "").trim() ||
      String((r as any)["Price"] ?? "").trim()
    );
  });

  // If variants exist but some rows have blank handle, Shopify rejects.
  if (anyVariantSignals) {
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i] as any;
      const row = i + 1;
      const handle = String(r[cHandle] ?? "").trim();
      const title = String(r[cTitle] ?? "").trim();
      if (!handle && title) {
        // Base fixer should have generated it, but keep a strict backstop.
        add({
          severity: "error",
          code: "shopify/blank_handle",
          row,
          column: cHandle,
          message: `Row ${row}: URL handle is blank but variants are present in the file.`,
          suggestion: "Fill URL handle for every row when variants are present.",
        });
      }
    }
  }

  // This file focuses on *detecting* additional Shopify constraints.

  // 1) Strict Shopify help-center validations (adds blockers Shopify actually enforces)
  // These run after the base fixer so we validate canonical columns.
  for (const it of validateShopifyStrict(fixedHeaders, fixedRows)) add(it as any);

  return {
    fixedHeaders,
    fixedRows,
    issues,
    fixesApplied,
  };
}
