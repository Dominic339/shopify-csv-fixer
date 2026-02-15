// src/lib/shopifyBasic.ts
import type { CsvRow } from "./csv";
import {
  canonicalizeShopifyProductCsv,
  slugifyShopifyHandle,
  normalizeShopifyBool,
  isValidShopifyBool,
  normalizeShopifyInventoryPolicy,
  isValidShopifyInventoryPolicy,
  parseShopifyMoney,
  formatShopifyMoney,
  isHttpUrl,
} from "./shopifySchema";

export type IssueSeverity = "error" | "warning" | "info";

export type Issue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  row?: number; // 1-based
  column?: string;
  suggestion?: string;
};

export type FixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: Issue[];
  fixesApplied: string[];
};

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

function get(r: CsvRow, k: string) {
  const v = r?.[k];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function set(r: CsvRow, k: string, v: string) {
  r[k] = v;
}

export function validateAndFixShopifyBasic(headers: string[], rows: CsvRow[]): FixResult {
  const issues: Issue[] = [];
  const fixesApplied: string[] = [];

  // 1) Canonicalize to modern Shopify column names + order, append unknowns
  const canon = canonicalizeShopifyProductCsv(headers ?? [], rows ?? []);
  const fixedHeaders = canon.fixedHeaders;
  const fixedRows = canon.fixedRows;

  // Canonical column names we operate on
  const cTitle = "Title";
  const cHandle = "URL handle";
  const cDesc = "Description";
  const cVendor = "Vendor";
  const cTags = "Tags";
  const cPublished = "Published on online store";
  const cStatus = "Status";
  const cSku = "SKU";
  const cPrice = "Price";
  const cCompare = "Compare-at price";
  const cInvQty = "Inventory quantity";
  const cContinue = "Continue selling when out of stock";
  const cImgUrl = "Product image URL";
  const cImgPos = "Image position";
  const cSeoTitle = "SEO title";
  const cSeoDesc = "SEO description";

  const optNames = ["Option1 name", "Option2 name", "Option3 name"];
  const optVals = ["Option1 value", "Option2 value", "Option3 value"];

  // 2) File-level checks
  const anyVariantSignals = fixedRows.some((r) => {
    return (
      get(r, cSku).trim() ||
      get(r, cPrice).trim() ||
      get(r, optNames[0]).trim() ||
      get(r, optVals[0]).trim() ||
      get(r, optNames[1]).trim() ||
      get(r, optVals[1]).trim() ||
      get(r, optNames[2]).trim() ||
      get(r, optVals[2]).trim()
    );
  });

  if (!fixedHeaders.includes(cTitle)) {
    issues.push({
      severity: "error",
      code: "shopify/missing_required_header",
      message: `Missing required Shopify column: "Title".`,
      column: "Title",
      suggestion: `Add the "Title" column (even if blank) to meet Shopify import expectations.`,
    });
  }

  if (!fixedHeaders.includes(cHandle)) {
    issues.push({
      severity: "error",
      code: "shopify/missing_required_header",
      message: `Missing required Shopify column: "URL handle".`,
      column: "URL handle",
      suggestion: `Add the "URL handle" column (even if blank). Shopify requires it when updating products and when importing variants.`,
    });
  }

  // 3) Per-row validation + deterministic fixes
  const byHandle = new Map<string, number[]>();

  for (let i = 0; i < fixedRows.length; i++) {
    const r = fixedRows[i];
    const row = i + 1;

    const title = get(r, cTitle).trim();
    if (!title) {
      issues.push({
        severity: "error",
        code: "shopify/blank_title",
        row,
        column: cTitle,
        message: `Row ${row}: Title is blank.`,
        suggestion: "Fill Title with the product name.",
      });
    }

    const rawHandle = get(r, cHandle).trim();
    if (!rawHandle) {
      if (title) {
        const slug = slugifyShopifyHandle(title);
        if (slug) {
          set(r, cHandle, slug);
          fixesApplied.push(`Generated URL handle from Title on row ${row}`);
        } else {
          issues.push({
            severity: "error",
            code: "shopify/blank_handle",
            row,
            column: cHandle,
            message: `Row ${row}: URL handle is blank.`,
            suggestion: "Fill URL handle (letters, numbers, dashes; no spaces).",
          });
        }
      } else if (anyVariantSignals) {
        issues.push({
          severity: "error",
          code: "shopify/blank_handle",
          row,
          column: cHandle,
          message: `Row ${row}: URL handle is blank.`,
          suggestion: "Fill URL handle. Shopify requires it for variants and updates.",
        });
      }
    } else {
      const slug = slugifyShopifyHandle(rawHandle);
      if (slug && slug !== rawHandle) {
        set(r, cHandle, slug);
        fixesApplied.push(`Normalized URL handle on row ${row}`);
      }
      const after = get(r, cHandle).trim();
      if (after.includes(" ")) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_handle",
          row,
          column: cHandle,
          message: `Row ${row}: URL handle contains spaces ("${after}").`,
          suggestion: "Use only letters, numbers, and dashes (no spaces).",
        });
      }
    }

    const pub = get(r, cPublished).trim();
    if (pub) {
      const norm = normalizeShopifyBool(pub);
      if (norm !== pub) {
        set(r, cPublished, norm);
        fixesApplied.push(`Normalized Published on online store to "${norm}" on row ${row}`);
      }
      if (!isValidShopifyBool(get(r, cPublished))) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_boolean_published",
          row,
          column: cPublished,
          message: `Row ${row}: Published on online store must be true or false (got "${pub}").`,
          suggestion: `Change to "true" or "false".`,
        });
      }
    }

    // Shopify expects an inventory policy here: deny | continue
    const cs = get(r, cContinue).trim();
    if (cs) {
      const norm = normalizeShopifyInventoryPolicy(cs);
      if (norm !== cs) {
        set(r, cContinue, norm);
        fixesApplied.push(`Normalized Continue selling when out of stock to "${norm}" on row ${row}`);
      }
      if (!isValidShopifyInventoryPolicy(get(r, cContinue))) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_inventory_policy",
          row,
          column: cContinue,
          message: `Row ${row}: Continue selling when out of stock must be "deny" or "continue" (got "${cs}").`,
          suggestion: `Use "deny" (stop selling) or "continue" (allow oversell).`,
        });
      }
    }

    const priceRaw = get(r, cPrice).trim();
    if (priceRaw) {
      const n = parseShopifyMoney(priceRaw);
      if (n == null) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_numeric_price",
          row,
          column: cPrice,
          message: `Row ${row}: Price is not a valid number ("${priceRaw}").`,
          suggestion: "Use numbers like 19.99 (no currency symbols).",
        });
      } else {
        const formatted = formatShopifyMoney(n);
        if (formatted !== priceRaw) {
          set(r, cPrice, formatted);
          fixesApplied.push(`Normalized Price to "${formatted}" on row ${row}`);
        }
      }
    }

    const compareRaw = get(r, cCompare).trim();
    if (compareRaw) {
      const n = parseShopifyMoney(compareRaw);
      if (n == null) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_numeric_compare_at",
          row,
          column: cCompare,
          message: `Row ${row}: Compare-at price is not a valid number ("${compareRaw}").`,
          suggestion: "Use numbers like 29.99 (no currency symbols).",
        });
      } else {
        const formatted = formatShopifyMoney(n);
        if (formatted !== compareRaw) {
          set(r, cCompare, formatted);
          fixesApplied.push(`Normalized Compare-at price to "${formatted}" on row ${row}`);
        }
      }
    }

    const p = priceRaw ? parseShopifyMoney(get(r, cPrice)) : null;
    const c = compareRaw ? parseShopifyMoney(get(r, cCompare)) : null;
    if (p != null && c != null && c > 0 && p > 0 && c < p) {
      issues.push({
        severity: "warning",
        code: "shopify/compare_at_lt_price",
        row,
        column: cCompare,
        message: `Row ${row}: Compare-at price (${get(r, cCompare)}) is less than Price (${get(r, cPrice)}).`,
        suggestion: "Compare-at price is usually higher than Price when showing a sale.",
      });
    }

    const invRaw = get(r, cInvQty).trim();
    if (invRaw) {
      const n = Number(invRaw);
      if (!Number.isInteger(n)) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_integer_inventory_qty",
          row,
          column: cInvQty,
          message: `Row ${row}: Inventory quantity must be an integer (got "${invRaw}").`,
          suggestion: "Use whole numbers like 0, 5, 12.",
        });
      } else if (n < 0) {
        issues.push({
          severity: "warning",
          code: "shopify/negative_inventory",
          row,
          column: cInvQty,
          message: `Row ${row}: Inventory quantity is negative (${invRaw}).`,
          suggestion: "Negative inventory can be valid in some workflows, but double-check before importing.",
        });
      }
    }

    const img = get(r, cImgUrl).trim();
    if (img) {
      if (!isHttpUrl(img)) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_image_url",
          row,
          column: cImgUrl,
          message: `Row ${row}: Product image URL is not a valid http(s) URL ("${img}").`,
          suggestion: "Use a publicly accessible image URL starting with https://",
        });
      }
    }
    const pos = get(r, cImgPos).trim();
    if (pos) {
      const pn = Number(pos);
      if (!Number.isInteger(pn) || pn < 1) {
        issues.push({
          severity: "warning",
          code: "shopify/invalid_image_position",
          row,
          column: cImgPos,
          message: `Row ${row}: Image position should be a positive integer (got "${pos}").`,
          suggestion: "Use 1, 2, 3... to control image ordering.",
        });
      }
    }

    const n1 = get(r, optNames[0]).trim();
    const n2 = get(r, optNames[1]).trim();
    const n3 = get(r, optNames[2]).trim();
    const v1 = get(r, optVals[0]).trim();
    const v2 = get(r, optVals[1]).trim();
    const v3 = get(r, optVals[2]).trim();

    if ((n2 || v2) && !(n1 || v1)) {
      issues.push({
        severity: "error",
        code: "shopify/option_order_invalid",
        row,
        column: optNames[1],
        message: `Row ${row}: Option2 cannot be used unless Option1 is present.`,
        suggestion: "Fill Option1 name/value before using Option2.",
      });
    }
    if ((n3 || v3) && !(n2 || v2)) {
      issues.push({
        severity: "error",
        code: "shopify/option_order_invalid",
        row,
        column: optNames[2],
        message: `Row ${row}: Option3 cannot be used unless Option2 is present.`,
        suggestion: "Fill Option2 name/value before using Option3.",
      });
    }

    if (n1 && !v1) {
      issues.push({
        severity: "warning",
        code: "shopify/variant_option_missing_value",
        row,
        column: optVals[0],
        message: `Row ${row}: Option1 name is set ("${n1}") but Option1 value is blank.`,
        suggestion: "Fill Option1 value (e.g., Size = Small).",
      });
    }
    if (n2 && !v2) {
      issues.push({
        severity: "warning",
        code: "shopify/variant_option_missing_value",
        row,
        column: optVals[1],
        message: `Row ${row}: Option2 name is set ("${n2}") but Option2 value is blank.`,
        suggestion: "Fill Option2 value (e.g., Color = Blue).",
      });
    }
    if (n3 && !v3) {
      issues.push({
        severity: "warning",
        code: "shopify/variant_option_missing_value",
        row,
        column: optVals[2],
        message: `Row ${row}: Option3 name is set ("${n3}") but Option3 value is blank.`,
        suggestion: "Fill Option3 value if you use a third option.",
      });
    }

    const h = get(r, cHandle).trim();
    if (h) {
      const list = byHandle.get(h) ?? [];
      list.push(i);
      byHandle.set(h, list);
    }
  }
    // 4) Variant grouping + duplicate handle sanity (FIXED)
  for (const [handle, idxs] of byHandle.entries()) {
    if (idxs.length <= 1) continue;

    const sigs = new Map<string, number[]>();

    for (const idx of idxs) {
      const r = fixedRows[idx];
      const sku = get(r, cSku).trim();
      const ov1 = get(r, "Option1 value").trim();
      const ov2 = get(r, "Option2 value").trim();
      const ov3 = get(r, "Option3 value").trim();
      const img = get(r, "Product image URL").trim();

      // IMPORTANT: include the image URL itself so extra-image rows don't look like duplicates.
      const imgKey = img ? img.trim().toLowerCase().slice(0, 180) : "";

      const sig = [sku, ov1, ov2, ov3, imgKey].join("|");
      const list = sigs.get(sig) ?? [];
      list.push(idx);
      sigs.set(sig, list);
    }

    for (const [sig, list] of sigs.entries()) {
      if (list.length <= 1) continue;

      // If these are image-only rows (no sku/options, only an image URL), don't warn.
      // We detect this by checking one representative row for the signature.
      const sampleRow = fixedRows[list[0]];
      const sku = get(sampleRow, cSku).trim();
      const ov1 = get(sampleRow, "Option1 value").trim();
      const ov2 = get(sampleRow, "Option2 value").trim();
      const ov3 = get(sampleRow, "Option3 value").trim();
      const img = get(sampleRow, "Product image URL").trim();

      const imageOnly = !sku && !ov1 && !ov2 && !ov3 && !!img;
      if (imageOnly) continue;

      const rowsList = list.map((i) => i + 1).join(", ");
      for (const idx of list) {
        issues.push({
          severity: "warning",
          code: "shopify/duplicate_handle_not_variants",
          row: idx + 1,
          column: "URL handle",
          message: `Row ${idx + 1}: Handle "${handle}" appears multiple times with identical variant details (rows ${rowsList}).`,
          suggestion:
            "If these are meant to be variants, make sure option values differ per row (or SKUs differ). If they are extra images, keep only URL handle + image fields on the extra rows.",
        });
      }
    }
  }

  // 5) Lightweight SEO guidance
  for (let i = 0; i < fixedRows.length; i++) {
    const r = fixedRows[i];
    const row = i + 1;

    const st = get(r, cSeoTitle).trim();
    const sd = get(r, cSeoDesc).trim();

    if (st && st.length > 70) {
      issues.push({
        severity: "info",
        code: "shopify/seo_title_too_long",
        row,
        column: cSeoTitle,
        message: `Row ${row}: SEO title is ${st.length} characters (recommended ≤ 70).`,
        suggestion: "Shorten the SEO title to improve search snippet display.",
      });
    }
    if (sd && sd.length > 320) {
      issues.push({
        severity: "info",
        code: "shopify/seo_description_too_long",
        row,
        column: cSeoDesc,
        message: `Row ${row}: SEO description is ${sd.length} characters (recommended ≤ 320).`,
        suggestion: "Shorten the SEO description to improve search snippet display.",
      });
    }

    const desc = get(r, cDesc).trim();
    if (desc && !st) {
      issues.push({
        severity: "info",
        code: "shopify/seo_title_missing",
        row,
        column: cSeoTitle,
        message: `Row ${row}: SEO title is blank (Shopify will fall back to Title).`,
        suggestion: "Optional: set a custom SEO title if you want different search wording.",
      });
    }
    if (desc && !sd) {
      issues.push({
        severity: "info",
        code: "shopify/seo_description_missing",
        row,
        column: cSeoDesc,
        message: `Row ${row}: SEO description is blank (Shopify will fall back to Description).`,
        suggestion: "Optional: add an SEO description for better search snippets.",
      });
    }
  }

  return {
    fixedHeaders,
    fixedRows,
    issues,
    fixesApplied: dedupe(fixesApplied),
  };
}
