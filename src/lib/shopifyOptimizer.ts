// src/lib/shopifyOptimizer.ts
import { validateAndFixShopifyBasic, type Issue as BaseIssue } from "./shopifyBasic";

/**
 * Shopify Import Optimizer
 *
 * Design goals:
 * - DO NOT break existing Shopify validator.
 * - Add higher-signal Shopify import safety checks:
 *   1) Duplicate SKUs across different products (different URL handles) => error
 *   2) Same URL handle used with conflicting Titles => warning
 *
 * Return shape remains compatible: { fixedHeaders, fixedRows, issues, fixesApplied }.
 */

// Use a local CsvRow type so we don't depend on any particular export shape.
export type CsvRow = Record<string, string>;

export type ShopifyOptimizerResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: BaseIssue[];
  fixesApplied: string[];
};

export function validateAndFixShopifyOptimizer(headers: string[], rows: CsvRow[]): ShopifyOptimizerResult {
  // validateAndFixShopifyBasic return type differs across versions, so treat it defensively.
  const base: any = validateAndFixShopifyBasic(headers ?? [], rows ?? []);

  const fixedHeaders: string[] = (base?.fixedHeaders ?? headers ?? []) as string[];
  const fixedRows: CsvRow[] = (base?.fixedRows ?? rows ?? []) as CsvRow[];
  const fixesApplied: string[] = [...((base?.fixesApplied ?? []) as string[])];

  const issues: BaseIssue[] = [];
  const seen = new Set<string>();

  // Shopify modern canonical columns (shopifyBasic canonicalizes to these)
  const cTitle = "Title";
  const cHandle = "URL handle";
  const cSku = "SKU";
  const cPrice = "Price";
  const cInvQty = "Inventory quantity";
  const cImgUrl = "Product image URL";
  const optNames = ["Option1 name", "Option2 name", "Option3 name"];
  const optVals = ["Option1 value", "Option2 value", "Option3 value"];

  function get(r: CsvRow, k: string) {
    const v = (r as any)?.[k];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  }

  function isImageOnlyRow(r: CsvRow) {
    // Shopify allows extra image rows where Title is blank as long as:
    // - URL handle present
    // - Product image URL present
    // - No variant-ish fields are present (SKU/Price/Inventory/Options)
    const title = get(r, cTitle).trim();
    const handle = get(r, cHandle).trim();
    const img = get(r, cImgUrl).trim();

    if (title) return false;
    if (!handle) return false;
    if (!img) return false;

    const sku = get(r, cSku).trim();
    const price = get(r, cPrice).trim();
    const inv = get(r, cInvQty).trim();

    const hasOptionSignals =
      !!get(r, optNames[0]).trim() ||
      !!get(r, optVals[0]).trim() ||
      !!get(r, optNames[1]).trim() ||
      !!get(r, optVals[1]).trim() ||
      !!get(r, optNames[2]).trim() ||
      !!get(r, optVals[2]).trim();

    return !sku && !price && !inv && !hasOptionSignals;
  }

  function normalizeCode(code: string | undefined | null): string {
    const c = (code ?? "").trim();
    if (!c) return "";

    // Keep canonical Shopify codes
    if (c.startsWith("shopify/")) return c;

    // Legacy/base codes -> canonical codes used by your UI registry
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
    const anyIssue = issue as any;

    const code = normalizeCode(anyIssue.code);
    anyIssue.code = code;

    const row =
      anyIssue.row ?? (typeof anyIssue.rowIndex === "number" ? anyIssue.rowIndex + 1 : undefined);

    const col = anyIssue.column ?? anyIssue.field ?? "(file)";
    const sev = (anyIssue.severity ?? anyIssue.level ?? "error") as "error" | "warning" | "info";

    const key = `${sev}|${code}|${row ?? -1}|${col}`;
    if (seen.has(key)) return;
    seen.add(key);

    issues.push(issue);
  }

  // 0) Pull base issues in, normalize + dedupe
  for (const issue of (base?.issues ?? []) as BaseIssue[]) add(issue);

  // ---------------------------------------------------------------------------
  // Step 1: Duplicate SKU detection across different URL handles (cross-product)
  // ---------------------------------------------------------------------------
  const skuMap = new Map<
    string,
    {
      handles: Set<string>;
      rows: number[]; // 0-based indexes
    }
  >();

  for (let i = 0; i < fixedRows.length; i++) {
    const r = fixedRows[i];
    if (isImageOnlyRow(r)) continue;

    const sku = get(r, cSku).trim();
    if (!sku) continue;

    const handle = get(r, cHandle).trim().toLowerCase();
    const entry = skuMap.get(sku) ?? { handles: new Set<string>(), rows: [] };

    if (handle) entry.handles.add(handle);
    entry.rows.push(i);

    skuMap.set(sku, entry);
  }

  for (const [sku, entry] of skuMap.entries()) {
    if (entry.rows.length <= 1) continue;

    if (entry.handles.size >= 2) {
      const rowsList = entry.rows.map((x) => x + 1).join(", ");
      for (const idx of entry.rows) {
        add({
          severity: "error",
          code: "shopify/duplicate_sku_across_products",
          row: idx + 1,
          column: cSku,
          message: `Row ${idx + 1}: SKU "${sku}" is reused across different URL handles (rows ${rowsList}).`,
          suggestion:
            "Make SKUs unique per variant across your catalog, or verify you truly intend to share SKUs across products.",
        } as any);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2: Duplicate URL handle with conflicting Titles
  // ---------------------------------------------------------------------------
  const handleTitles = new Map<string, { titles: Map<string, string>; rows: number[] }>();

  for (let i = 0; i < fixedRows.length; i++) {
    const r = fixedRows[i];
    if (isImageOnlyRow(r)) continue;

    const handle = get(r, cHandle).trim().toLowerCase();
    if (!handle) continue;

    const title = get(r, cTitle).trim();
    if (!title) continue;

    const key = title.toLowerCase();
    const e = handleTitles.get(handle) ?? { titles: new Map<string, string>(), rows: [] };

    e.titles.set(key, title);
    e.rows.push(i);

    handleTitles.set(handle, e);
  }

  for (const [handle, e] of handleTitles.entries()) {
    if (e.titles.size <= 1) continue;

    const distinct = [...e.titles.values()];
    const rowsList = [...new Set(e.rows)].map((x) => x + 1).join(", ");

    for (const idx of new Set(e.rows)) {
      add({
        severity: "warning",
        code: "shopify/handle_title_mismatch",
        row: idx + 1,
        column: cTitle,
        message: `Row ${idx + 1}: URL handle "${handle}" is used with multiple different Titles (rows ${rowsList}).`,
        suggestion: `Pick a single Title for this handle (Shopify groups rows by URL handle). Titles seen: ${distinct
          .slice(0, 4)
          .join(" | ")}${distinct.length > 4 ? " | ..." : ""}`,
      } as any);
    }
  }

  return {
    fixedHeaders,
    fixedRows,
    issues,
    fixesApplied,
  };
}
