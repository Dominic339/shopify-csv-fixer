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

  // IMPORTANT:
  // BaseIssue type in your project does not contain "level".
  // It likely uses "severity".
  // Also: BaseIssue may not include code/suggestion, so we push as any.
  const issues: BaseIssue[] = [...(base.issues ?? [])];

  // Helper columns (exact Shopify headers)
  const col = (name: string) => fixedHeaders.find((h) => h.toLowerCase() === name.toLowerCase());

  const cHandle = col("Handle");
  const cTitle = col("Title");
  const cVendor = col("Vendor");
  const cStatus = col("Status");
  const cPublished = col("Published");
  const cPrice = col("Variant Price");
  const cCompareAt = col("Variant Compare At Price");
  const cInvPolicy = col("Variant Inventory Policy");
  const cImageSrc = col("Image Src");
  const cSeoTitle = col("SEO Title");
  const cSeoDesc = col("SEO Description");
  const cBody = col("Body (HTML)");

  const optNameCols = [col("Option1 Name"), col("Option2 Name"), col("Option3 Name")].filter(Boolean) as string[];
  const optValCols = [col("Option1 Value"), col("Option2 Value"), col("Option3 Value")].filter(Boolean) as string[];

  function add(issue: {
    row: number;
    column: string;
    message: string;
    severity: "error" | "warning" | "info";
    code?: string;
    suggestion?: string;
  }) {
    issues.push(issue as any);
  }

  function get(r: CsvRow, k?: string) {
    if (!k) return "";
    const v = (r as any)?.[k];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  }

  function isHttpUrl(s: string) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // -----------------------------------------
  // Strict Shopify schema validation additions
  // -----------------------------------------

  // Status normalization (safe) + strict validation
  if (cStatus) {
    const allowed = new Set(["active", "draft", "archived"]);
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i];
      const raw = get(r, cStatus).trim();
      if (!raw) continue;

      const lower = raw.toLowerCase();

      // safe normalization: if lower is allowed and raw differs, normalize
      if (allowed.has(lower) && raw !== lower) {
        (r as any)[cStatus] = lower;
        fixesApplied.push(`Normalized Status to "${lower}" on row ${i + 1}`);
      } else if (!allowed.has(lower)) {
        add({
          row: i + 1,
          column: cStatus,
          message: `Invalid Status "${raw}". Use active, draft, or archived.`,
          severity: "error",
          code: "shopify/invalid_status",
          suggestion: `Set Status to active, draft, or archived.`,
        });
      }
    }
  }

  // Published strict validation safety net
  if (cPublished) {
    for (let i = 0; i < fixedRows.length; i++) {
      const raw = get(fixedRows[i], cPublished).trim();
      if (!raw) continue;
      const u = raw.toUpperCase();
      if (u !== "TRUE" && u !== "FALSE") {
        add({
          row: i + 1,
          column: cPublished,
          message: `Published must be TRUE or FALSE (got "${raw}").`,
          severity: "error",
          code: "shopify/invalid_boolean_published",
          suggestion: `Change Published to TRUE or FALSE.`,
        });
      }
    }
  }

  // Option structure validation (Option2 requires Option1; Option3 requires Option2)
  if (optNameCols.length || optValCols.length) {
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i];

      const n1 = get(r, optNameCols[0]).trim();
      const n2 = get(r, optNameCols[1]).trim();
      const n3 = get(r, optNameCols[2]).trim();

      const v1 = get(r, optValCols[0]).trim();
      const v2 = get(r, optValCols[1]).trim();
      const v3 = get(r, optValCols[2]).trim();

      if ((n2 || v2) && !(n1 || v1)) {
        add({
          row: i + 1,
          column: optNameCols[1] ?? optValCols[1] ?? "Option2",
          message: "Option2 cannot be used unless Option1 is present.",
          severity: "error",
          code: "shopify/option_order_invalid",
          suggestion: "Fill Option1 Name/Value before using Option2.",
        });
      }

      if ((n3 || v3) && !(n2 || v2)) {
        add({
          row: i + 1,
          column: optNameCols[2] ?? optValCols[2] ?? "Option3",
          message: "Option3 cannot be used unless Option2 is present.",
          severity: "error",
          code: "shopify/option_order_invalid",
          suggestion: "Fill Option2 Name/Value before using Option3.",
        });
      }

      if (n1 && !v1) {
        add({
          row: i + 1,
          column: optValCols[0] ?? "Option1 Value",
          message: `Option1 Name is set ("${n1}") but Option1 Value is blank.`,
          severity: "warning",
          code: "shopify/variant_option_missing_value",
          suggestion: "Fill Option1 Value (e.g., Size = Small).",
        });
      }
      if (n2 && !v2) {
        add({
          row: i + 1,
          column: optValCols[1] ?? "Option2 Value",
          message: `Option2 Name is set ("${n2}") but Option2 Value is blank.`,
          severity: "warning",
          code: "shopify/variant_option_missing_value",
          suggestion: "Fill Option2 Value (e.g., Color = Blue).",
        });
      }
      if (n3 && !v3) {
        add({
          row: i + 1,
          column: optValCols[2] ?? "Option3 Value",
          message: `Option3 Name is set ("${n3}") but Option3 Value is blank.`,
          severity: "warning",
          code: "shopify/variant_option_missing_value",
          suggestion: "Fill Option3 Value if you use a third option.",
        });
      }
    }
  }

  // Compare-at sanity checks
  function toNum(s: string) {
    const cleaned = s.replace(/[$,]/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  if (cPrice || cCompareAt) {
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i];
      const priceRaw = get(r, cPrice).trim();
      const compareRaw = get(r, cCompareAt).trim();
      const price = priceRaw ? toNum(priceRaw) : null;
      const compare = compareRaw ? toNum(compareRaw) : null;

      if (priceRaw && price == null && cPrice) {
        add({
          row: i + 1,
          column: cPrice,
          message: `Variant Price is not a valid number ("${priceRaw}").`,
          severity: "error",
          code: "shopify/invalid_numeric_price",
          suggestion: "Use plain numbers like 19.99 (no currency symbols).",
        });
      }

      if (compareRaw && compare == null && cCompareAt) {
        add({
          row: i + 1,
          column: cCompareAt,
          message: `Variant Compare At Price is not a valid number ("${compareRaw}").`,
          severity: "error",
          code: "shopify/invalid_numeric_price",
          suggestion: "Use plain numbers like 29.99 (no currency symbols).",
        });
      }

      if (price != null && compare != null && compare < price && cCompareAt) {
        add({
          row: i + 1,
          column: cCompareAt,
          message: `Compare at price (${compare}) is lower than price (${price}).`,
          severity: "warning",
          code: "shopify/compare_at_lt_price",
          suggestion: "Set Compare at Price >= Price, or leave it blank.",
        });
      }
    }
  }

  // Vendor consistency checks within same handle group
  if (cHandle && cVendor) {
    const byHandle = new Map<string, { vendor?: string; rows: number[] }>();

    for (let i = 0; i < fixedRows.length; i++) {
      const handle = get(fixedRows[i], cHandle).trim();
      if (!handle) continue;
      const v = get(fixedRows[i], cVendor).trim();

      const entry = byHandle.get(handle) ?? { vendor: undefined, rows: [] };
      entry.rows.push(i);
      if (!entry.vendor && v) entry.vendor = v;
      byHandle.set(handle, entry);
    }

    for (const [handle, entry] of byHandle.entries()) {
      if (!entry.vendor) continue;
      for (const idx of entry.rows) {
        const v = get(fixedRows[idx], cVendor).trim();
        if (v && v !== entry.vendor) {
          add({
            row: idx + 1,
            column: cVendor,
            message: `Vendor "${v}" differs from other rows for handle "${handle}" (expected "${entry.vendor}").`,
            severity: "warning",
            code: "shopify/vendor_inconsistent",
            suggestion: "Make vendor consistent across all rows for the same Handle.",
          });
        }
      }
    }
  }

  // Image URL validation + duplicate detection
  if (cImageSrc) {
    const seen = new Map<string, number>();

    for (let i = 0; i < fixedRows.length; i++) {
      const url = get(fixedRows[i], cImageSrc).trim();
      if (!url) continue;

      if (!isHttpUrl(url)) {
        add({
          row: i + 1,
          column: cImageSrc,
          message: `Image Src must be a valid http(s) URL (got "${url}").`,
          severity: "warning",
          code: "shopify/invalid_image_url",
          suggestion: "Use a publicly accessible URL starting with http:// or https://.",
        });
      }

      const prev = seen.get(url);
      if (prev != null) {
        add({
          row: i + 1,
          column: cImageSrc,
          message: `Duplicate image URL (also appears on row ${prev + 1}).`,
          severity: "info",
          code: "shopify/duplicate_image_url",
          suggestion: "Remove duplicates or adjust Image Position if intentional.",
        });
      } else {
        seen.set(url, i);
      }
    }
  }

  // SEO checks (lightweight)
  const titles: string[] = [];
  if (cTitle) {
    for (let i = 0; i < fixedRows.length; i++) {
      const t = get(fixedRows[i], cTitle).trim();
      if (t) titles.push(t);
      if (t && (t.length < 10 || t.length > 120)) {
        add({
          row: i + 1,
          column: cTitle,
          message: `Title length is ${t.length} characters (recommended ~10–120).`,
          severity: "warning",
          code: "shopify/seo_title_length",
          suggestion: "Adjust the product title length for better SEO and readability.",
        });
      }
    }
  }

  if (cTitle && titles.length) {
    const counts = new Map<string, number>();
    for (const t of titles) counts.set(t, (counts.get(t) ?? 0) + 1);

    for (let i = 0; i < fixedRows.length; i++) {
      const t = get(fixedRows[i], cTitle).trim();
      if (!t) continue;
      if ((counts.get(t) ?? 0) > 1) {
        add({
          row: i + 1,
          column: cTitle,
          message: `Duplicate Title appears multiple times: "${t}".`,
          severity: "info",
          code: "shopify/seo_duplicate_title",
          suggestion: "Consider making titles unique to improve SEO and reduce catalog confusion.",
        });
      }
    }
  }

  if (cSeoTitle) {
    for (let i = 0; i < fixedRows.length; i++) {
      const v = get(fixedRows[i], cSeoTitle).trim();
      if (!v) {
        add({
          row: i + 1,
          column: cSeoTitle,
          message: "SEO Title is blank (optional but recommended).",
          severity: "info",
          code: "shopify/seo_missing_title",
          suggestion: "Add a concise SEO title optimized for search.",
        });
      }
    }
  }

  if (cSeoDesc) {
    for (let i = 0; i < fixedRows.length; i++) {
      const v = get(fixedRows[i], cSeoDesc).trim();
      if (!v) {
        add({
          row: i + 1,
          column: cSeoDesc,
          message: "SEO Description is blank (optional but recommended).",
          severity: "info",
          code: "shopify/seo_missing_description",
          suggestion: "Add a short SEO description (~120–160 chars).",
        });
      } else if (v.length < 50 || v.length > 320) {
        add({
          row: i + 1,
          column: cSeoDesc,
          message: `SEO Description length is ${v.length} characters (recommended ~120–160).`,
          severity: "warning",
          code: "shopify/seo_description_length",
          suggestion: "Adjust SEO description length for better snippet display.",
        });
      }
    }
  }

  if (cBody) {
    for (let i = 0; i < fixedRows.length; i++) {
      const v = get(fixedRows[i], cBody).trim();
      if (!v) continue;

      if (v.length < 50) {
        add({
          row: i + 1,
          column: cBody,
          message: `Body (HTML) is very short (${v.length} chars).`,
          severity: "info",
          code: "shopify/seo_body_short",
          suggestion: "Consider adding a richer description to improve SEO and conversion.",
        });
      } else if (v.length > 5000) {
        add({
          row: i + 1,
          column: cBody,
          message: `Body (HTML) is very long (${v.length} chars).`,
          severity: "info",
          code: "shopify/seo_body_long",
          suggestion: "Consider trimming for readability.",
        });
      }
    }
  }

  // Inventory policy strict validation safety net
  if (cInvPolicy) {
    for (let i = 0; i < fixedRows.length; i++) {
      const v = get(fixedRows[i], cInvPolicy).trim().toLowerCase();
      if (!v) continue;
      if (v !== "deny" && v !== "continue") {
        add({
          row: i + 1,
          column: cInvPolicy,
          message: `Variant Inventory Policy must be "deny" or "continue" (got "${v}").`,
          severity: "error",
          code: "shopify/invalid_inventory_policy",
          suggestion: `Use deny (no oversell) or continue (allow oversell).`,
        });
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
