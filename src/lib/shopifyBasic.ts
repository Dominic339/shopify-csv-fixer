// src/lib/shopifyBasic.ts
import type { CsvRow } from "./csv";
import {
  canonicalizeShopifyProductCsv,
  slugifyShopifyHandle,
  normalizeShopifyBool,
  isValidShopifyBool,
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

function normalizeTags(raw: string) {
  // Split by commas, trim each tag, drop empties, dedupe (case-insensitive), rejoin with ", "
  const parts = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of parts) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.join(", ");
}

function normalizeStatus(raw: string): { value: string | null; mappedFrom?: string } {
  const s = (raw ?? "").toString().trim().toLowerCase();
  if (!s) return { value: null };

  // Shopify accepted values
  if (s === "active" || s === "draft" || s === "archived") return { value: s };

  // Common legacy / user-entered values we can safely map
  const map: Record<string, string> = {
    enabled: "active",
    disabled: "draft",
    published: "active",
    unpublished: "draft",
  };

  if (map[s]) return { value: map[s], mappedFrom: s };

  return { value: "__invalid__" };
}

function isImageOnlyRow(
  r: CsvRow,
  cTitle: string,
  cHandle: string,
  cImgUrl: string,
  cSku: string,
  cPrice: string,
  cInvQty: string,
  optNames: string[],
  optVals: string[]
) {
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

    // --- Tags normalization (safe)
    const tagsRaw = get(r, cTags);
    if (tagsRaw && tagsRaw.includes(",")) {
      const normalized = normalizeTags(tagsRaw);
      if (normalized !== tagsRaw) {
        set(r, cTags, normalized);
        fixesApplied.push(`Normalized Tags formatting on row ${row}`);
      }
    }

    const title = get(r, cTitle).trim();

    // Allow Shopify image-only rows to have blank Title
    const imageOnly = isImageOnlyRow(r, cTitle, cHandle, cImgUrl, cSku, cPrice, cInvQty, optNames, optVals);
    if (!title && !imageOnly) {
      issues.push({
        severity: "error",
        code: "shopify/blank_title",
        row,
        column: cTitle,
        message: `Row ${row}: Title is blank.`,
        suggestion: "Fill Title with the product name (Title can be blank only for image-only rows).",
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
        // If the file contains variants/updates, missing handle is still a blocker (including image-only rows)
        issues.push({
          severity: "error",
          code: "shopify/blank_handle",
          row,
          column: cHandle,
          message: `Row ${row}: URL handle is blank.`,
          suggestion: "Fill URL handle. Shopify requires it for variants, updates, and image rows.",
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

    // --- Published normalization/validation (already present)
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

    // --- Status normalization/fix (NEW)
    const statusRaw = get(r, cStatus);
    if (fixedHeaders.includes(cStatus)) {
      const st = normalizeStatus(statusRaw);
      const pubNorm = get(r, cPublished).trim().toLowerCase();

      if (st.value === null) {
        // Status column exists but value is blank => derive safely
        let derived = "draft";
        if (isValidShopifyBool(pubNorm)) {
          derived = pubNorm === "true" ? "active" : "draft";
        }
        set(r, cStatus, derived);
        fixesApplied.push(`Filled blank Status with "${derived}" on row ${row}`);
      } else if (st.value === "__invalid__") {
        issues.push({
          severity: "error",
          code: "shopify/invalid_status",
          row,
          column: cStatus,
          message: `Row ${row}: Status must be active, draft, or archived (got "${statusRaw}").`,
          suggestion: `Use "active", "draft", or "archived".`,
        });
      } else {
        const target = st.value;
        if (target !== statusRaw.trim()) {
          set(r, cStatus, target);
          fixesApplied.push(
            st.mappedFrom
              ? `Mapped Status "${st.mappedFrom}" to "${target}" on row ${row}`
              : `Normalized Status to "${target}" on row ${row}`
          );
        }
      }
    }

    // --- Continue selling normalization (already present, but align code with meta)
    const cs = get(r, cContinue).trim();
    if (cs) {
      const lower = cs.toLowerCase();
      if (lower === "continue" || lower === "deny") {
        const mapped = lower === "continue" ? "true" : "false";
        set(r, cContinue, mapped);
        fixesApplied.push(`Mapped legacy inventory policy "${cs}" to Continue selling = "${mapped}" on row ${row}`);
      } else {
        const norm = normalizeShopifyBool(cs);
        if (norm !== cs) {
          set(r, cContinue, norm);
          fixesApplied.push(`Normalized Continue selling when out of stock to "${norm}" on row ${row}`);
        }
      }
      if (!isValidShopifyBool(get(r, cContinue))) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_inventory_policy",
          row,
          column: cContinue,
          message: `Row ${row}: Continue selling when out of stock must be true or false (got "${cs}").`,
          suggestion: `Change to "true" or "false".`,
        });
      }
    }

    // --- Price normalization/validation (already present)
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

    // --- Default Title normalization (NEW, safe)
    if (v1.toLowerCase() === "default title" && !v2 && !v3) {
      const n1Lower = n1.toLowerCase();
      if (!n1 || n1Lower === "title" || n1Lower === "default title") {
        if (n1 !== "Default Title") {
          set(r, optNames[0], "Default Title");
          fixesApplied.push(`Normalized Option1 name to "Default Title" on row ${row}`);
        }
      }
      if (v1 !== "Default Title") {
        set(r, optVals[0], "Default Title");
        fixesApplied.push(`Normalized Option1 value to "Default Title" on row ${row}`);
      }
    }

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

  // 4) Variant grouping + duplicate handle sanity (FIXED + EXTENDED)
  for (const [handle, idxs] of byHandle.entries()) {
    if (idxs.length <= 1) continue;

    // Collect variant rows (non image-only) for option consistency checks
    const variantIdxs = idxs.filter((idx) => {
      const r = fixedRows[idx];
      return !isImageOnlyRow(r, cTitle, cHandle, cImgUrl, cSku, cPrice, cInvQty, optNames, optVals);
    });

    // 4a) Option name consistency per handle (warn)
    if (variantIdxs.length >= 2) {
      const base = fixedRows[variantIdxs[0]];
      const baseN1 = get(base, optNames[0]).trim();
      const baseN2 = get(base, optNames[1]).trim();
      const baseN3 = get(base, optNames[2]).trim();

      for (const idx of variantIdxs.slice(1)) {
        const r = fixedRows[idx];
        const row = idx + 1;

        const n1 = get(r, optNames[0]).trim();
        const n2 = get(r, optNames[1]).trim();
        const n3 = get(r, optNames[2]).trim();

        if ((baseN1 || n1) && n1 !== baseN1) {
          issues.push({
            severity: "warning",
            code: "shopify/option_name_inconsistent",
            row,
            column: optNames[0],
            message: `Row ${row}: Option1 name "${n1 || "(blank)"}" differs from other rows for handle "${handle}" ("${baseN1 || "(blank)"}").`,
            suggestion: "Use consistent Option1/Option2/Option3 names across all variants for the same handle.",
          });
        }
        if ((baseN2 || n2) && n2 !== baseN2) {
          issues.push({
            severity: "warning",
            code: "shopify/option_name_inconsistent",
            row,
            column: optNames[1],
            message: `Row ${row}: Option2 name "${n2 || "(blank)"}" differs from other rows for handle "${handle}" ("${baseN2 || "(blank)"}").`,
            suggestion: "Use consistent Option1/Option2/Option3 names across all variants for the same handle.",
          });
        }
        if ((baseN3 || n3) && n3 !== baseN3) {
          issues.push({
            severity: "warning",
            code: "shopify/option_name_inconsistent",
            row,
            column: optNames[2],
            message: `Row ${row}: Option3 name "${n3 || "(blank)"}" differs from other rows for handle "${handle}" ("${baseN3 || "(blank)"}").`,
            suggestion: "Use consistent Option1/Option2/Option3 names across all variants for the same handle.",
          });
        }
      }
    }

    // 4b) Mixed Default Title with real options (warn)
    if (variantIdxs.length >= 2) {
      let hasDefaultTitle = false;
      let hasRealOptions = false;

      for (const idx of variantIdxs) {
        const r = fixedRows[idx];
        const v1 = get(r, optVals[0]).trim().toLowerCase();
        const v2 = get(r, optVals[1]).trim();
        const v3 = get(r, optVals[2]).trim();

        if (v1 === "default title") hasDefaultTitle = true;
        if (v1 && v1 !== "default title") hasRealOptions = true;
        if (v2 || v3) hasRealOptions = true;
      }

      if (hasDefaultTitle && hasRealOptions) {
        for (const idx of variantIdxs) {
          const row = idx + 1;
          issues.push({
            severity: "warning",
            code: "shopify/mixed_default_title_with_options",
            row,
            column: optVals[0],
            message: `Row ${row}: Handle "${handle}" mixes "Default Title" rows with option-based variant rows.`,
            suggestion:
              'Use "Default Title" only when the product has a single variant. For multi-variant products, use real option values (Size/Color/etc) on every variant row.',
          });
        }
      }
    }

    // 4c) Image-only rows that contain variant fields (warn)
    for (const idx of idxs) {
      const r = fixedRows[idx];
      const row = idx + 1;

      const isImgOnly = isImageOnlyRow(r, cTitle, cHandle, cImgUrl, cSku, cPrice, cInvQty, optNames, optVals);
      if (!isImgOnly) continue;

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

      if (sku || price || inv || hasOptionSignals) {
        issues.push({
          severity: "warning",
          code: "shopify/image_row_has_variant_fields",
          row,
          column: cImgUrl,
          message: `Row ${row}: This looks like an image-only row for handle "${handle}", but it contains variant fields (SKU/Price/Options/Inventory).`,
          suggestion:
            "For extra image rows, keep only URL handle + image fields. Move variant fields to the main product/variant rows.",
        });
      }
    }

    // 4d) Duplicate Image position per handle (warn)
    const imagePosMap = new Map<string, number[]>();
    for (const idx of idxs) {
      const r = fixedRows[idx];
      const img = get(r, cImgUrl).trim();
      if (!img) continue;

      const pos = get(r, cImgPos).trim();
      if (!pos) continue;

      const list = imagePosMap.get(pos) ?? [];
      list.push(idx);
      imagePosMap.set(pos, list);
    }

    for (const [pos, list] of imagePosMap.entries()) {
      if (list.length <= 1) continue;
      const rowsList = list.map((i) => i + 1).join(", ");
      for (const idx of list) {
        issues.push({
          severity: "warning",
          code: "shopify/duplicate_image_position",
          row: idx + 1,
          column: cImgPos,
          message: `Row ${idx + 1}: Handle "${handle}" has duplicate Image position "${pos}" (rows ${rowsList}).`,
          suggestion: "Use unique Image position values per handle (1, 2, 3, ...) to control ordering.",
        });
      }
    }

    // Existing duplicate-handle signature logic (kept)
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
            "If these are meant to be variants, make sure option values differ per row (or SKUs differ). If these are extra images, keep only URL handle + image fields on additional rows.",
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
