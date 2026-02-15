import type { CsvRow } from "./csv";
import { validateAndFixShopifyBasic, type FixResult, type Issue as BaseIssue } from "./shopifyBasic";

/**
 * Shopify Import Optimizer
 *
 * Design goals:
 * - DO NOT break existing Shopify basic validator.
 * - Wrap the base engine, then append stricter checks (and safe normalizations).
 * - Return shape remains compatible: { fixedHeaders, fixedRows, issues, fixesApplied }.
 */
export function validateAndFixShopifyOptimizer(headers: string[], rows: CsvRow[]): FixResult {
  const base = validateAndFixShopifyBasic(headers, rows);

  const fixedHeaders = base.fixedHeaders;
  const fixedRows = base.fixedRows;
  const fixesApplied = [...(base.fixesApplied ?? [])];

  // We dedupe issues aggressively because:
  // - The base validator may emit both a "summary" and a "row-specific" version.
  // - The optimizer adds its own checks.
  const issues: BaseIssue[] = [];
  const seen = new Set<string>();

  function normalizeCode(code: string | undefined | null): string {
    const c = (code ?? "").trim();
    if (!c) return "";

    // If you already use the canonical Shopify codes, keep them.
    if (c.startsWith("shopify/")) return c;

    // Legacy / base-validator codes -> canonical Shopify issue codes used by issueMetaShopify.ts
    const map: Record<string, string> = {
      missing_required_header: "shopify/missing_required_header",
      blank_title: "shopify/blank_title",
      blank_handle: "shopify/blank_handle",
      invalid_handle: "shopify/invalid_handle",
      invalid_boolean_published: "shopify/invalid_boolean_published",
      invalid_boolean_continue_selling: "shopify/invalid_boolean_continue_selling",
      invalid_numeric_price: "shopify/invalid_numeric_price",
      invalid_numeric_compare_at: "shopify/invalid_numeric_compare_at",
      compare_at_lt_price: "shopify/compare_at_lt_price",
      invalid_integer_inventory_qty: "shopify/invalid_integer_inventory_qty",
      negative_inventory: "shopify/negative_inventory",
      invalid_image_url: "shopify/invalid_image_url",
      invalid_image_position: "shopify/invalid_image_position",
      option_order_invalid: "shopify/option_order_invalid",
      duplicate_handle_not_variants: "shopify/duplicate_handle_not_variants",
      seo_title_too_long: "shopify/seo_title_too_long",
      seo_description_too_long: "shopify/seo_description_too_long",
      seo_title_missing: "shopify/seo_title_missing",
      seo_description_missing: "shopify/seo_description_missing",
    };

    return map[c] ?? c;
  }

  function add(issue: BaseIssue) {
    const code = normalizeCode((issue as any).code);
    (issue as any).code = code;

    // Prefer 1-based row if present; base issue type may use "row" or "rowIndex".
    const row =
      (issue as any).row ?? (typeof (issue as any).rowIndex === "number" ? (issue as any).rowIndex + 1 : undefined);
    const col = (issue as any).column ?? "(file)";
    const sev = (issue as any).severity ?? "error";

    // Dedupe key: severity + code + row + column (message can vary slightly but should be treated as the same issue)
    const key = `${sev}|${code}|${row ?? -1}|${col}`;
    if (seen.has(key)) return;
    seen.add(key);

    issues.push(issue);
  }

  // 0) Pull base issues in, but normalize codes + dedupe.
  for (const issue of base.issues ?? []) add(issue);

  // Helper columns (supports both legacy + new Shopify template)
  const col = (name: string) => fixedHeaders.find((h) => h.toLowerCase() === name.toLowerCase());
  const colAny = (...names: string[]) => names.map(col).find(Boolean);

  const cHandle = colAny("Handle", "URL handle");
  const cTitle = col("Title");

  // If there are variants, handle is required (Shopify reality)
  const anyVariantSignals = fixedRows.some((r) => {
    return (
      String((r as any)["Option1 Value"] ?? "").trim() ||
      String((r as any)["Option2 Value"] ?? "").trim() ||
      String((r as any)["Option3 Value"] ?? "").trim() ||
      String((r as any)["Variant SKU"] ?? "").trim() ||
      String((r as any)["Variant Price"] ?? "").trim()
    );
  });

  if (anyVariantSignals && cHandle) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const v = String((fixedRows[i] as any)[cHandle] ?? "").trim();
      if (!v) {
        add({
          severity: "error",
          code: "shopify/blank_handle",
          row,
          column: cHandle,
          message: `Row ${row}: URL handle is blank (required for variants/updates).`,
          suggestion: cTitle
            ? `Fill URL handle. If you have a Title, you can slugify it (e.g., "My Product" → "my-product").`
            : "Fill URL handle (letters, numbers, dashes; no spaces).",
        } as any);
      }
    }
  }

  // NOTE:
  // The optimizer intentionally does not auto-generate handles here.
  // That belongs in the base fixer (deterministic from Title), or a dedicated “safe autofix”.
  // This file focuses on *detecting* additional Shopify constraints.

  return {
    fixedHeaders,
    fixedRows,
    issues,
    fixesApplied: Array.from(new Set(fixesApplied)),
  };
}
