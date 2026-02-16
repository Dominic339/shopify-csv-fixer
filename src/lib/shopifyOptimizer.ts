// src/lib/shopifyOptimizer.ts
import type { CsvRow } from "./csv";
import { validateAndFixShopifyBasic, type FixResult, type Issue as BaseIssue } from "./shopifyBasic";

function slugifyHandle(input: string) {
  // Shopify handle: lowercase letters, numbers, hyphens. Deterministic and conservative.
  const s = (input ?? "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/g, "")
    .replace(/-$/g, "");
  return s.slice(0, 255);
}

function normalizeMoney2dp(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s) return s;

  // Safe parse: strip currency symbols and thousand separators, then format to 2dp.
  const cleaned = s.replace(/[$£€¥]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return s;

  return n.toFixed(2);
}

/**
 * Shopify Import Optimizer
 *
 * Design goals:
 * - DO NOT break existing Shopify basic validator.
 * - Wrap the base engine, then append stricter checks + deterministic safe autofixes.
 * - Return shape remains compatible: { fixedHeaders, fixedRows, issues, fixesApplied }.
 */
export function validateAndFixShopifyOptimizer(headers: string[], rows: CsvRow[]): FixResult {
  const base = validateAndFixShopifyBasic(headers, rows);

  const fixedHeaders = base.fixedHeaders;

  // Apply deterministic *safe* autofixes on top of the base output.
  // (Clone rows so we don't mutate base.fixedRows in place.)
  const fixedRows = (base.fixedRows ?? []).map((r) => ({ ...(r as any) })) as CsvRow[];

  const fixesApplied = [...(base.fixesApplied ?? [])];

  // Dedupe issues aggressively:
  // - base validator may emit both summary + row-specific versions
  // - optimizer adds its own checks
  const issues: BaseIssue[] = [];
  const seen = new Set<string>();

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

    // Prefer 1-based row if present; base may use row or rowIndex
    const row =
      (issue as any).row ?? (typeof (issue as any).rowIndex === "number" ? (issue as any).rowIndex + 1 : undefined);

    const col = (issue as any).column ?? "(file)";
    const sev = (issue as any).severity ?? "error";

    const key = `${sev}|${code}|${row ?? -1}|${col}`;
    if (seen.has(key)) return;
    seen.add(key);

    issues.push(issue);
  }

  // --- Deterministic safe autofixes (Shopify) ---
  // 1) Auto-generate Handle from Title when missing
  // 2) Normalize key money fields to 2 decimals when parseable
  const priceCols = ["Variant Price", "Variant Compare At Price", "Cost per item"];

  for (let i = 0; i < fixedRows.length; i++) {
    const rowNum = i + 1;
    const r = fixedRows[i] as any;

    const title = String(r["Title"] ?? "").trim();
    const handle = String(r["Handle"] ?? "").trim();
    if (!handle && title) {
      const next = slugifyHandle(title);
      if (next) {
        r["Handle"] = next;
        fixesApplied.push(`Row ${rowNum}: Auto-generated Handle from Title.`);
      }
    }

    for (const pc of priceCols) {
      const before = String(r[pc] ?? "");
      if (!before.trim()) continue;
      const after = normalizeMoney2dp(before);
      if (after !== before) {
        r[pc] = after;
        fixesApplied.push(`Row ${rowNum}: Normalized ${pc} to 2 decimals.`);
      }
    }
  }

  // 0) Pull base issues in, normalize codes + dedupe.
  // Skip issues that are now resolved by our deterministic safe autofixes.
  for (const issue of base.issues ?? []) {
    const code = normalizeCode((issue as any).code);

    const rowIndex =
      typeof (issue as any).rowIndex === "number"
        ? (issue as any).rowIndex
        : typeof (issue as any).row === "number"
          ? (issue as any).row - 1
          : -1;

    if (rowIndex >= 0 && rowIndex < fixedRows.length) {
      const r = fixedRows[rowIndex] as any;

      if (code === "shopify/blank_handle") {
        const v = String(r["Handle"] ?? "").trim();
        if (v) continue;
      }

      if (code === "shopify/invalid_numeric_price") {
        const v = String(r["Variant Price"] ?? "").trim();
        if (v && normalizeMoney2dp(v) === v) {
          continue;
        }
      }

      if (code === "shopify/invalid_numeric_compare_at") {
        const v = String(r["Variant Compare At Price"] ?? "").trim();
        if (v && normalizeMoney2dp(v) === v) {
          continue;
        }
      }
    }

    add(issue);
  }

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

  return {
    fixedHeaders,
    fixedRows,
    issues,
    fixesApplied,
  };
}
