// src/lib/shopifyBasic.ts
import type { CsvRow } from "./csv";
import {
  canonicalizeShopifyProductCsv,
  slugifyShopifyHandle,
  normalizeShopifyBool,
  isValidShopifyBool,
  normalizeShopifyInventoryPolicy,
  isValidShopifyInventoryPolicy,
  isValidShopifyHandle,
  parseLocaleNumber,
  formatShopifyMoney,
  isHttpUrl,
  weightToGrams,
} from "./shopifySchema";

const INVENTORY_TRACKERS = new Set(["shopify", "shipwire", "amazon_marketplace_web"]);
const WEIGHT_UNITS: Record<string, string> = {
  g: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kgs: "kg", kilogram: "kg", kilograms: "kg",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  oz: "oz", ounce: "oz", ounces: "oz",
};
const MAX_TAGS_PER_PRODUCT = 250;
const BOOLEAN_CODES: Record<string, string> = {
  "Charge tax": "shopify/invalid_charge_tax",
  "Requires shipping": "shopify/invalid_requires_shipping",
  "Gift card": "shopify/invalid_gift_card",
};
const MAX_IMAGE_ALT = 512;

export type IssueSeverity = "error" | "warning" | "info";

export type Issue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  row?: number; // 1-based
  column?: string;
  suggestion?: string;
  details?: unknown;
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

  // Canonicalization adds every Shopify column; these say which ones the user's file really had.
  const present = (c: string) => canon.sourceMap[c] != null;

  if (!present(cTitle)) {
    issues.push({
      severity: "error",
      code: "shopify/missing_required_header",
      message: `Missing required Shopify column: "Title".`,
      column: "Title",
      suggestion: `Add the "Title" column (even if blank) to meet Shopify import expectations.`,
    });
  }

  if (!present(cHandle)) {
    issues.push({
      severity: "info",
      code: "shopify/handle_generated_column",
      message: `No "URL handle" column found, so handles were generated from Title.`,
      column: "URL handle",
      suggestion: `If you are updating existing products, add their URL handles; otherwise Shopify will create new products.`,
    });
  }

  // Shopify groups rows by URL handle: the first row of a handle carries product-level
  // fields (Title, Status, option names, ...); later rows only carry variant/image values.
  const groupKey = (r: CsvRow) => {
    const raw = get(r, cHandle).trim();
    const lower = raw.toLowerCase();
    return isValidShopifyHandle(lower) ? lower : slugifyShopifyHandle(raw);
  };
  const productRowOf = new Map<string, number>();
  const titledHandles = new Set<string>();
  const optionNamesOf = new Map<string, string[]>();
  for (let i = 0; i < fixedRows.length; i++) {
    const k = groupKey(fixedRows[i]);
    if (!k) continue;
    if (!productRowOf.has(k)) productRowOf.set(k, i);
    if (get(fixedRows[i], cTitle).trim()) titledHandles.add(k);
    if (!optionNamesOf.has(k) && get(fixedRows[i], optNames[0]).trim()) {
      optionNamesOf.set(k, optNames.map((c) => get(fixedRows[i], c).trim()));
    }
  }
  const isProductRow = (i: number) => {
    const k = groupKey(fixedRows[i]);
    return !k || productRowOf.get(k) === i;
  };

  // 3) Per-row validation + deterministic fixes
  const byHandle = new Map<string, number[]>();
  const handleChangeWarned = new Set<string>();
  const missingOption1Rows: number[] = [];

  // NEW: file-wide SKU duplicate tracking (variant rows only; image-only excluded)
  const bySku = new Map<string, number[]>();

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
    const productKey = groupKey(r);
    const productRow = isProductRow(i);
    const inheritedNames = optionNamesOf.get(productKey) ?? ["", "", ""];

    // Variant and image rows may leave Title blank when another row of the same handle has it.
    const imageOnly = isImageOnlyRow(r, cTitle, cHandle, cImgUrl, cSku, cPrice, cInvQty, optNames, optVals);
    if (!title && !imageOnly && !(productKey && titledHandles.has(productKey))) {
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
    } else if (!isValidShopifyHandle(rawHandle)) {
      // Only rewrite handles Shopify would reject. Valid handles (any script) are left alone:
      // Shopify matches existing products by handle, so a changed handle creates a new product.
      const lower = rawHandle.toLowerCase();
      const slug = isValidShopifyHandle(lower) ? lower : slugifyShopifyHandle(rawHandle);
      if (slug) {
        set(r, cHandle, slug);
        fixesApplied.push(`Normalized URL handle "${rawHandle}" to "${slug}" on row ${row}`);
        if (slug !== lower && !handleChangeWarned.has(rawHandle)) {
          handleChangeWarned.add(rawHandle);
          issues.push({
            severity: "info",
            code: "shopify/handle_rewritten",
            row,
            column: cHandle,
            message: `Row ${row}: URL handle "${rawHandle}" was changed to "${slug}".`,
            suggestion: "If this file updates existing products, make sure the new handle matches the product in Shopify, or it will be imported as a new product.",
          });
        }
      } else {
        issues.push({
          severity: "error",
          code: "shopify/invalid_handle",
          row,
          column: cHandle,
          message: `Row ${row}: URL handle "${rawHandle}" has no usable letters or numbers.`,
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
    // Status is product-level: only the product row needs a value.
    if (present(cStatus) && (productRow || statusRaw.trim())) {
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

    // --- Continue selling normalization (aligned with Shopify inventory policy: deny | continue)
    const cs = get(r, cContinue).trim();
    if (cs) {
      // Shopify's "Continue selling when out of stock" is an inventory policy: deny | continue.
      // We accept boolean-ish inputs and normalize deterministically to deny/continue.
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

    // --- Price normalization/validation (already present)
    const priceRaw = get(r, cPrice).trim();
    if (priceRaw) {
      const n = parseLocaleNumber(priceRaw);
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
      const n = parseLocaleNumber(compareRaw);
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

    const p = priceRaw ? parseLocaleNumber(get(r, cPrice)) : null;
    const c = compareRaw ? parseLocaleNumber(get(r, cCompare)) : null;
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
      const parsedInv = parseLocaleNumber(invRaw);
      const n = parsedInv ?? NaN;
      if (Number.isInteger(n) && String(n) !== invRaw) {
        set(r, cInvQty, String(n));
        fixesApplied.push(`Normalized Inventory quantity to "${n}" on row ${row}`);
      }
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
      } else if (img.toLowerCase().startsWith("http://")) {
        issues.push({
          severity: "warning",
          code: "shopify/image_url_not_https",
          row,
          column: cImgUrl,
          message: `Row ${row}: Product image URL uses http:// ("${img}").`,
          suggestion: "Shopify fetches images from public https:// URLs. Use the https:// version if your host supports it.",
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

    validateExtendedRow(r, row, present, issues, fixesApplied);

    // Option names may be given only on the product row; later rows inherit them.
    const n1 = get(r, optNames[0]).trim() || inheritedNames[0];
    const n2 = get(r, optNames[1]).trim() || inheritedNames[1];
    const n3 = get(r, optNames[2]).trim() || inheritedNames[2];
    const v1 = get(r, optVals[0]).trim();
    const v2 = get(r, optVals[1]).trim();
    const v3 = get(r, optVals[2]).trim();

    // NEW (Enforcement 1): Variant data exists but Option1 missing (BLOCKING)
    // Only applies to non-image-only rows.
    const hasVariantFields =
      !imageOnly &&
      (!!get(r, cSku).trim() ||
        !!get(r, cPrice).trim() ||
        !!get(r, cCompare).trim() ||
        !!get(r, cInvQty).trim() ||
        !!get(r, cContinue).trim());

    // Variant data without Option1: decided per handle after the loop (single-variant
    // products get "Default Title"; multi-variant products need real option values).
    if (hasVariantFields && (!n1 || !v1)) missingOption1Rows.push(i);

    // --- Default Title normalization (NEW, safe)
    if (v1.toLowerCase() === "default title" && !v2 && !v3) {
      const n1Lower = n1.toLowerCase();
      // Shopify exports use "Title"; the docs use "Default Title". Both import fine, so only fill blanks.
      if ((!n1 && productRow) || (n1Lower === "default title" && n1 !== "Default Title" && get(r, optNames[0]).trim())) {
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

    // Only warn about a missing option value when variant columns are NOT used.
    // If variant columns are used, the blocking error above will already explain what to do.
    if (!hasVariantFields && n1 && !v1) {
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

    // NEW (Enforcement 3): Track SKU duplicates (warning). Only for variant rows (non-image-only).
    if (!imageOnly) {
      const sku = get(r, cSku).trim();
      if (sku) {
        const list = bySku.get(sku) ?? [];
        list.push(i);
        bySku.set(sku, list);
      }
    }
  }

  // 3b) Variant data without Option1 values
  if (missingOption1Rows.length) {
    const variantRowsByHandle = new Map<string, number>();
    for (const [h, idxs] of byHandle.entries()) {
      variantRowsByHandle.set(
        h,
        idxs.filter((idx) => !isImageOnlyRow(fixedRows[idx], cTitle, cHandle, cImgUrl, cSku, cPrice, cInvQty, optNames, optVals)).length
      );
    }
    for (const idx of missingOption1Rows) {
      const r = fixedRows[idx];
      const row = idx + 1;
      const h = get(r, cHandle).trim();
      const n1 = get(r, optNames[0]).trim() || (optionNamesOf.get(h.toLowerCase()) ?? [""])[0];
      const v1 = get(r, optVals[0]).trim();
      if ((variantRowsByHandle.get(h) ?? 1) <= 1) {
        // Single-variant product: Shopify's convention is a "Default Title" option.
        if (!n1) set(r, optNames[0], "Default Title");
        if (!v1) set(r, optVals[0], "Default Title");
        fixesApplied.push(`Set Option1 to "Default Title" for single-variant product on row ${row}`);
      } else {
        issues.push({
          severity: "error",
          code: "shopify/missing_option1_for_variant_data",
          row,
          column: !n1 ? optNames[0] : optVals[0],
          message: `Row ${row}: Product "${h}" has several variant rows, but this one has no Option1 ${!n1 ? "name" : "value"}.`,
          suggestion: "Give every variant an Option1 name (e.g. Size) and a distinct Option1 value (e.g. M).",
        });
      }
    }
  }

  // 3c) Tags limit per product
  for (const [h, idxs] of byHandle.entries()) {
    const tags = new Set<string>();
    for (const idx of idxs) {
      for (const t of get(fixedRows[idx], cTags).split(",")) if (t.trim()) tags.add(t.trim().toLowerCase());
    }
    if (tags.size > MAX_TAGS_PER_PRODUCT) {
      issues.push({
        severity: "error",
        code: "shopify/too_many_tags",
        row: idxs[0] + 1,
        column: cTags,
        message: `Product "${h}" has ${tags.size} tags (Shopify allows ${MAX_TAGS_PER_PRODUCT}).`,
        suggestion: "Remove tags until there are 250 or fewer per product.",
      });
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

    // NEW (Enforcement 2): Option value combos must be unique per handle (BLOCKING)
    // Ignore image-only rows; evaluate only variant rows.
    if (variantIdxs.length >= 2) {
      const comboMap = new Map<string, number[]>();

      for (const idx of variantIdxs) {
        const r = fixedRows[idx];
        const ov1 = get(r, optVals[0]).trim().toLowerCase();
        const ov2 = get(r, optVals[1]).trim().toLowerCase();
        const ov3 = get(r, optVals[2]).trim().toLowerCase();

        const key = [ov1, ov2, ov3].join("|");
        const list = comboMap.get(key) ?? [];
        list.push(idx);
        comboMap.set(key, list);
      }

      for (const [key, list] of comboMap.entries()) {
        if (list.length <= 1) continue;

        const rowsList = list.map((i) => i + 1).join(", ");

        // Structured details for UI + simulation
        const parts = key.split("|");
        const duplicateCombo = {
          "Option1 value": parts[0] ?? "",
          "Option2 value": parts[1] ?? "",
          "Option3 value": parts[2] ?? "",
        };
        const details = {
          handle,
          rows: list.map((i) => i + 1), // 1-based for display
          duplicateCombo,
        };

        for (const idx of list) {
          issues.push({
            severity: "error",
            code: "shopify/options_not_unique",
            row: idx + 1,
            column: optVals[0],
            message: `Row ${idx + 1}: Two or more variants for handle "${handle}" have identical option values (rows ${rowsList}).`,
            suggestion: "Make each variant option combination unique (Option1/2/3 values).",
            details,
          });
        }
      }
    }

    // 4a) Option name consistency per handle (warn). Blank names on later rows inherit
    // from the product row, so only explicit, differing names are flagged.
    if (variantIdxs.length >= 2) {
      const baseNames = optionNamesOf.get(handle.toLowerCase()) ?? ["", "", ""];
      for (const idx of variantIdxs) {
        const r = fixedRows[idx];
        const row = idx + 1;
        optNames.forEach((col, k) => {
          const n = get(r, col).trim();
          if (n && baseNames[k] && n !== baseNames[k]) {
            issues.push({
              severity: "warning",
              code: "shopify/option_name_inconsistent",
              row,
              column: col,
              message: `Row ${row}: Option${k + 1} name "${n}" differs from other rows for handle "${handle}" ("${baseNames[k]}").`,
              suggestion: "Use consistent Option1/Option2/Option3 names across all variants for the same handle.",
            });
          }
        });
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

  // NEW (Enforcement 3): Emit duplicate SKU warnings (file-wide)
  for (const [sku, idxs] of bySku.entries()) {
    if (idxs.length <= 1) continue;
    const rowsList = idxs.map((i) => i + 1).join(", ");
    for (const idx of idxs) {
      issues.push({
        severity: "warning",
        code: "shopify/duplicate_sku",
        row: idx + 1,
        column: cSku,
        message: `Row ${idx + 1}: The same SKU "${sku}" appears on multiple rows (rows ${rowsList}).`,
        suggestion: "Make SKUs unique per variant (or leave blank if you don’t use SKUs).",
      });
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

  // Final pass: de-duplicate noisy overlaps (same row + code + column).
  // This keeps the UI readable and avoids showing the same issue multiple times.
  const issueDeduped: Issue[] = [];
  const seenIssue = new Set<string>();
  for (const it of issues) {
    const key = `${it.row ?? -1}::${it.code}::${it.column ?? ""}`;
    if (seenIssue.has(key)) continue;
    seenIssue.add(key);
    issueDeduped.push(it);
  }

  // Report only columns the file really has (plus Title/URL handle) so later checks that
  // ask "is this column present?" see the user's file, not every canonical column.
  const reportedHeaders = fixedHeaders.filter(
    (h) => !(h in canon.sourceMap) || present(h) || h === cTitle || h === cHandle
  );

  return {
    fixedHeaders: reportedHeaders,
    fixedRows,
    issues: issueDeduped,
    fixesApplied: dedupe(fixesApplied),
  };
}

/**
 * Rules from Shopify's product CSV reference that the core pass above does not cover:
 * booleans, weight, inventory tracker / fulfillment dependencies, cost, alt text, gift cards,
 * product category format, and packed product dimensions.
 */
function validateExtendedRow(
  r: CsvRow,
  row: number,
  present: (c: string) => boolean,
  issues: Issue[],
  fixesApplied: string[]
) {
  // Booleans
  for (const col of ["Charge tax", "Requires shipping", "Gift card"]) {
    const raw = get(r, col).trim();
    if (!raw) continue;
    const norm = normalizeShopifyBool(raw);
    if (norm !== raw) {
      set(r, col, norm);
      fixesApplied.push(`Normalized ${col} to "${norm}" on row ${row}`);
    }
    if (!isValidShopifyBool(norm)) {
      issues.push({
        severity: "error",
        code: BOOLEAN_CODES[col],
        row,
        column: col,
        message: `Row ${row}: ${col} must be true or false (got "${raw}").`,
        suggestion: `Change to "true" or "false".`,
      });
    }
  }

  if (get(r, "Gift card").trim() === "true") {
    issues.push({
      severity: "warning",
      code: "shopify/gift_card_import",
      row,
      column: "Gift card",
      message: `Row ${row}: Gift card is true, but Shopify cannot create gift cards by CSV import.`,
      suggestion: "Create gift card products in the Shopify admin instead.",
    });
  }

  // Cost per item: number only
  const costRaw = get(r, "Cost per item").trim();
  if (costRaw) {
    const n = parseLocaleNumber(costRaw);
    if (n == null) {
      issues.push({
        severity: "error",
        code: "shopify/invalid_numeric_cost",
        row,
        column: "Cost per item",
        message: `Row ${row}: Cost per item is not a valid number ("${costRaw}").`,
        suggestion: "Use numbers like 7.50 (no currency symbols).",
      });
    } else if (formatShopifyMoney(n) !== costRaw) {
      set(r, "Cost per item", formatShopifyMoney(n));
      fixesApplied.push(`Normalized Cost per item to "${formatShopifyMoney(n)}" on row ${row}`);
    }
  }

  // Weight unit for display: g | kg | lb | oz
  const unitRaw = get(r, "Weight unit for display").trim();
  if (unitRaw) {
    const unit = WEIGHT_UNITS[unitRaw.toLowerCase()];
    if (unit && unit !== unitRaw) {
      set(r, "Weight unit for display", unit);
      fixesApplied.push(`Normalized Weight unit for display to "${unit}" on row ${row}`);
    } else if (!unit) {
      issues.push({
        severity: "error",
        code: "shopify/invalid_weight_unit",
        row,
        column: "Weight unit for display",
        message: `Row ${row}: Weight unit for display must be g, kg, lb, or oz (got "${unitRaw}").`,
        suggestion: `Use "g", "kg", "lb", or "oz".`,
      });
    }
  }

  // Weight value (grams): whole number of grams. Accept "500 g" / "1.2 kg" / "2,5" and convert.
  const wRaw = get(r, "Weight value (grams)").trim();
  if (wRaw) {
    const m = wRaw.match(/^(.*?)\s*(g|gr|grams?|kg|kgs|kilograms?|lbs?|pounds?|oz|ounces?)$/i);
    const grams = m ? weightToGrams(m[1], WEIGHT_UNITS[m[2].toLowerCase()] ?? m[2]) : weightToGrams(wRaw, "g");
    if (grams == null || grams < 0) {
      issues.push({
        severity: "error",
        code: "shopify/invalid_weight",
        row,
        column: "Weight value (grams)",
        message: `Row ${row}: Weight value (grams) must be a whole number of grams (got "${wRaw}").`,
        suggestion: "Enter grams without units or decimals, e.g. 5.125 kg → 5125.",
      });
    } else if (String(grams) !== wRaw) {
      set(r, "Weight value (grams)", String(grams));
      fixesApplied.push(`Converted Weight value (grams) "${wRaw}" to "${grams}" on row ${row}`);
    }
  }

  // Inventory tracker: shopify | shipwire | amazon_marketplace_web | blank
  const trackerRaw = get(r, "Inventory tracker").trim();
  if (trackerRaw) {
    const tracker = trackerRaw.toLowerCase();
    if (tracker !== trackerRaw && INVENTORY_TRACKERS.has(tracker)) {
      set(r, "Inventory tracker", tracker);
      fixesApplied.push(`Normalized Inventory tracker to "${tracker}" on row ${row}`);
    }
    if (!INVENTORY_TRACKERS.has(tracker)) {
      issues.push({
        severity: "error",
        code: "shopify/invalid_inventory_tracker",
        row,
        column: "Inventory tracker",
        message: `Row ${row}: Inventory tracker must be shopify, shipwire, amazon_marketplace_web, or blank (got "${trackerRaw}").`,
        suggestion: `Use "shopify" to track inventory in Shopify, or leave blank for untracked.`,
      });
    } else if (tracker === "shopify") {
      // Shopify: with tracker = shopify, these two can't be blank. Fill Shopify's defaults.
      if (present("Continue selling when out of stock") && !get(r, "Continue selling when out of stock").trim()) {
        set(r, "Continue selling when out of stock", "deny");
        fixesApplied.push(`Filled blank Continue selling when out of stock with "deny" on row ${row}`);
      }
      if (present("Fulfillment service") && !get(r, "Fulfillment service").trim()) {
        set(r, "Fulfillment service", "manual");
        fixesApplied.push(`Filled blank Fulfillment service with "manual" on row ${row}`);
      }
    }
  }

  // Fulfillment service: lowercase handle-style names (manual, or a custom service handle)
  const fsRaw = get(r, "Fulfillment service").trim();
  if (fsRaw) {
    const fs = fsRaw.toLowerCase().replace(/\s+/g, "-");
    if (fs !== fsRaw && /^[a-z0-9_-]+$/.test(fs)) {
      set(r, "Fulfillment service", fs);
      fixesApplied.push(`Normalized Fulfillment service to "${fs}" on row ${row}`);
    }
    if (!/^[a-z0-9_-]+$/.test(get(r, "Fulfillment service"))) {
      issues.push({
        severity: "error",
        code: "shopify/invalid_fulfillment_service",
        row,
        column: "Fulfillment service",
        message: `Row ${row}: Fulfillment service "${fsRaw}" must use lowercase letters, numbers, and dashes.`,
        suggestion: `Use "manual", or the handle of a fulfillment service set up in your Shopify admin.`,
      });
    }
  }

  // Image alt text limit
  const alt = get(r, "Image alt text");
  if (alt.length > MAX_IMAGE_ALT) {
    issues.push({
      severity: "error",
      code: "shopify/image_alt_text_too_long",
      row,
      column: "Image alt text",
      message: `Row ${row}: Image alt text is ${alt.length} characters (max ${MAX_IMAGE_ALT}).`,
      suggestion: "Shorten alt text; under 125 characters works best.",
    });
  }

  // Product category is Shopify's taxonomy (breadcrumb or id like "hg-15-1-2"), not Google's numeric id.
  const cat = get(r, "Product category").trim();
  if (/^\d+$/.test(cat)) {
    issues.push({
      severity: "warning",
      code: "shopify/product_category_looks_like_google",
      row,
      column: "Product category",
      message: `Row ${row}: Product category "${cat}" looks like a Google product category id.`,
      suggestion: `Use a Shopify taxonomy path (e.g. "Apparel & Accessories > Clothing > Shirts & Tops") or id; put Google ids in "Google Shopping / Google product category".`,
    });
  }

  // Packed product dimensions: all four or none (ignored when Requires shipping is false).
  const packed = Object.keys(r).filter((k) => /^packed product (length|width|height|dimension unit)/i.test(k));
  if (packed.length && get(r, "Requires shipping").trim() !== "false") {
    const filled = packed.filter((k) => get(r, k).trim());
    if (filled.length && filled.length < 4) {
      issues.push({
        severity: "error",
        code: "shopify/packed_dimensions_incomplete",
        row,
        column: packed.find((k) => !get(r, k).trim()) ?? packed[0],
        message: `Row ${row}: Packed product length, width, height, and dimension unit must all be filled or all be blank.`,
        suggestion: "Fill the missing packed product fields, or clear all four.",
      });
    }
  }
}
