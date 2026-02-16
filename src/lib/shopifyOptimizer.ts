// src/lib/shopifyOptimizer.ts
import type { CsvRow } from "./csv";
import { validateAndFixShopifyBasic, type FixResult, type Issue as BaseIssue } from "./shopifyBasic";

/**
 * Shopify Import Optimizer
 *
 * Design goals:
 * - DO NOT break existing Shopify validator.
 * - Add higher-signal Shopify import safety checks:
 *   1) Duplicate SKUs across different products (different URL handles) => error
 *   2) Same URL handle used with conflicting Titles => warning
 *   3) Variant option collisions are already enforced in shopifyBasic (blocking), keep dedupe + normalization here
 *
 * Return shape remains compatible: { fixedHeaders, fixedRows, issues, fixesApplied }.
 */
export function validateAndFixShopifyOptimizer(headers: string[], rows: CsvRow[]): FixResult {
  const base = validateAndFixShopifyBasic(headers, rows);

  const fixedHeaders = base.fixedHeaders;
  const fixedRows = base.fixedRows;
  const fixesApplied = [...(base.fixesApplied ?? [])];

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

    // Legacy/base codes -> canonical codes used by issueMetaShopify.ts
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

    const row =
      (issue as any).row ?? (typeof (issue as any).rowIndex === "number" ? (issue as any).rowIndex + 1 : undefined);

    const col = (issue as any).column ?? "(file)";
    const sev = (issue as any).severity ?? "error";

    const key = `${sev}|${code}|${row ?? -1}|${col}`;
    if (seen.has(key)) return;
    seen.add(key);

    issues.push(issue);
  }

  // 0) Pull base issues in, normalize + dedupe
  for (const issue of base.issues ?? []) add(issue);

  // ---------------------------------------------------------------------------
  // Step 1: Duplicate SKU detection across different URL handles (cross-product)
  // ---------------------------------------------------------------------------
  // Build sku -> { handles, rows }
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

    // Upgrade to error if the SKU is shared across different products (different handles)
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
  // handle -> distinct titles (case-insensitive)
  const handleTitles = new Map<string, { primary: string; titles: Map<string, string>; rows: number[] }>();

  for (let i = 0; i < fixedRows.length; i++) {
    const r = fixedRows[i];
    // image-only rows can be blank title and should not affect this check
    if (isImageOnlyRow(r)) continue;

    const handle = get(r, cHandle).trim().toLowerCase();
    if (!handle) continue;

    const title = get(r, cTitle).trim();
    if (!title) continue;

    const key = title.toLowerCase();
    const e = handleTitles.get(handle) ?? { primary: title, titles: new Map<string, string>(), rows: [] };

    if (!e.titles.size) {
      e.primary = title;
    }

    e.titles.set(key, title);
    e.rows.push(i);
    handleTitles.set(handle, e);
  }

  for (const [handle, e] of handleTitles.entries()) {
    if (e.titles.size <= 1) continue;

    const distinct = [...e.titles.values()];
    const rowsList = [...new Set(e.rows)].map((x) => x + 1).join(", ");

    for (const idx of new Set(e.rows)) {
      const actual = get(fixedRows[idx], cTitle).trim();
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

  // ---------------------------------------------------------------------------
  // Step 3: Variant option collision detection
  // ---------------------------------------------------------------------------
  // This is already enforced (blocking) in shopifyBasic via shopify/options_not_unique.
  // No additional logic needed here; optimizer is primarily for higher-level catalog consistency.
  // ---------------------------------------------------------------------------

  return {
    fixedHeaders,
    fixedRows,
    issues,
    fixesApplied,
  };
}
