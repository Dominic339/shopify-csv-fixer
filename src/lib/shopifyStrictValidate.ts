// src/lib/shopifyStrictValidate.ts
import type { CsvRow } from "./csv";
import type { Issue } from "./shopifyBasic";
import { isHttpUrl, isValidShopifyBool, normalizeShopifyBool, isValidShopifyInventoryPolicy, normalizeShopifyInventoryPolicy } from "./shopifySchema";

/**
 * Shopify Strict Validator
 *
 * Purpose:
 * - Add checks that match Shopify Help Center rules that are not covered by the base fixer.
 * - Stay conservative: do NOT rewrite user data unless it is a safe normalization (case/boolean/policy normalization).
 *
 * References:
 * - Shopify Help Center: Using CSV files to import and export products
 */
export function validateShopifyStrict(headers: string[], rows: CsvRow[]): Issue[] {
  const issues: Issue[] = [];

  const fixedHeaders = headers ?? [];
  const fixedRows = rows ?? [];

  const has = (name: string) => fixedHeaders.some((h) => String(h).toLowerCase() === name.toLowerCase());
  const get = (r: CsvRow, k: string) => {
    const v = (r as any)?.[k];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  };
  const set = (r: CsvRow, k: string, v: string) => {
    (r as any)[k] = v;
  };

  // Canonical columns (from Shopify template)
  const COL = {
    title: "Title",
    handle: "URL handle",
    status: "Status",
    sku: "SKU",
    price: "Price",
    barcode: "Barcode",
    opt1Name: "Option1 name",
    opt1Val: "Option1 value",
    opt2Name: "Option2 name",
    opt2Val: "Option2 value",
    opt3Name: "Option3 name",
    opt3Val: "Option3 value",
    published: "Published on online store",
    chargeTax: "Charge tax",
    requiresShipping: "Requires shipping",
    giftCard: "Gift card",
    inventoryTracker: "Inventory tracker",
    inventoryQty: "Inventory quantity",
    continueSelling: "Continue selling when out of stock",
    weightUnit: "Weight unit for display",
    weightGrams: "Weight value (grams)",
    productImageUrl: "Product image URL",
    variantImageUrl: "Variant image URL",
    imagePosition: "Image position",
    imageAlt: "Image alt text",
    fulfillmentService: "Fulfillment service",
  };

  // 1) Status: if the column exists, it must have a value (Shopify rule)
  if (has(COL.status)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const raw = get(r, COL.status).trim();
      if (!raw) {
        issues.push({
          severity: "error",
          code: "shopify/missing_status_value",
          row,
          column: COL.status,
          message: `Row ${row}: Status is blank, but the Status column is present.`,
          suggestion: 'Set Status to "active", "draft", or "archived".',
        });
        continue;
      }
      const lower = raw.toLowerCase();
      if (lower !== raw && (lower === "active" || lower === "draft" || lower === "archived")) {
        set(r, COL.status, lower);
      }
      const after = get(r, COL.status).trim().toLowerCase();
      if (!(after === "active" || after === "draft" || after === "archived")) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_status",
          row,
          column: COL.status,
          message: `Row ${row}: Status must be "active", "draft", or "archived" (got "${raw}").`,
          suggestion: 'Use "active" (default), "draft", or "archived".',
        });
      }
    }
  }

  // 2) Inventory tracker values (Shopify allowlist)
  if (has(COL.inventoryTracker)) {
    const allowed = new Set(["", "shopify", "shipwire", "amazon_marketplace_web"]);
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const raw = get(r, COL.inventoryTracker).trim();
      if (!raw) continue;
      const lower = raw.toLowerCase();
      if (lower !== raw) set(r, COL.inventoryTracker, lower);
      if (!allowed.has(lower)) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_inventory_tracker",
          row,
          column: COL.inventoryTracker,
          message: `Row ${row}: Inventory tracker must be "shopify", "shipwire", "amazon_marketplace_web", or blank (got "${raw}").`,
          suggestion: 'Use "shopify" (common) or leave blank if inventory is not tracked.',
        });
      }
    }
  }

  // 3) Continue selling when out of stock (deny | continue)
  if (has(COL.continueSelling)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const raw = get(r, COL.continueSelling).trim();
      if (!raw) continue;
      const norm = normalizeShopifyInventoryPolicy(raw);
      if (norm !== raw) set(r, COL.continueSelling, norm);
      if (!isValidShopifyInventoryPolicy(get(r, COL.continueSelling))) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_inventory_policy",
          row,
          column: COL.continueSelling,
          message: `Row ${row}: Continue selling when out of stock must be "deny" or "continue" (got "${raw}").`,
          suggestion: 'Use "deny" (stop selling) or "continue" (allow oversell).',
        });
      }
    }
  }

  // 4) Weight unit allowlist (g, kg, lb, oz)
  if (has(COL.weightUnit)) {
    const allowed = new Set(["", "g", "kg", "lb", "oz"]);
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const raw = get(r, COL.weightUnit).trim();
      if (!raw) continue;
      const lower = raw.toLowerCase();
      if (lower !== raw) set(r, COL.weightUnit, lower);
      if (!allowed.has(lower)) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_weight_unit",
          row,
          column: COL.weightUnit,
          message: `Row ${row}: Weight unit for display must be g, kg, lb, or oz (got "${raw}").`,
          suggestion: 'Use one of: g, kg, lb, oz (kg is the default).',
        });
      }
    }
  }

  // 5) Boolean fields: Published, Charge tax, Requires shipping, Gift card
  const boolCols = [COL.published, COL.chargeTax, COL.requiresShipping, COL.giftCard];
  for (const bc of boolCols) {
    if (!has(bc)) continue;
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const raw = get(r, bc).trim();
      if (!raw) continue;
      const norm = normalizeShopifyBool(raw);
      if (norm !== raw) set(r, bc, norm);
      if (!isValidShopifyBool(get(r, bc))) {
        const code =
          bc === COL.chargeTax
            ? "shopify/invalid_charge_tax"
            : bc === COL.requiresShipping
              ? "shopify/invalid_requires_shipping"
              : bc === COL.giftCard
                ? "shopify/invalid_gift_card"
                : "shopify/invalid_boolean_published";

        issues.push({
          severity: "error",
          code,
          row,
          column: bc,
          message: `Row ${row}: ${bc} must be true or false (got "${raw}").`,
          suggestion: 'Use "true" or "false".',
        });
      }
    }
  }

  // 6) Image URL validation for both Product image URL and Variant image URL
  const imgCols = [COL.productImageUrl, COL.variantImageUrl];
  for (const ic of imgCols) {
    if (!has(ic)) continue;
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const raw = get(r, ic).trim();
      if (!raw) continue;
      if (!isHttpUrl(raw)) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_image_url",
          row,
          column: ic,
          message: `Row ${row}: ${ic} is not a valid http(s) URL (got "${raw}").`,
          suggestion: "Use a publicly accessible image URL starting with https://",
        });
      }
    }
  }

  // 7) Image alt text length (Shopify max 512 chars)
  if (has(COL.imageAlt)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const raw = get(fixedRows[i], COL.imageAlt);
      if (raw && raw.length > 512) {
        issues.push({
          severity: "warning",
          code: "shopify/image_alt_text_too_long",
          row,
          column: COL.imageAlt,
          message: `Row ${row}: Image alt text is ${raw.length} characters (max 512).`,
          suggestion: "Shorten alt text to 512 characters or fewer.",
        });
      }
    }
  }

  // 8) Variant data dependencies: if variant data columns are present, Option1 name/value must be present too
  // Shopify warns that including variant fields (like SKU) without Option1 name/value can delete variants.
  const variantDataCols = [
    COL.sku,
    COL.barcode,
    COL.price,
    COL.inventoryTracker,
    COL.inventoryQty,
    COL.continueSelling,
    COL.weightGrams,
    COL.weightUnit,
    COL.requiresShipping,
    COL.fulfillmentService,
  ];

  const anyVariantDataInFile = fixedRows.some((r) => variantDataCols.some((c) => get(r, c).trim()));

  if (anyVariantDataInFile && has(COL.opt1Name) && has(COL.opt1Val)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];

      // Skip pure image-only rows (common Shopify pattern)
      const title = get(r, COL.title).trim();
      const handle = get(r, COL.handle).trim();
      const hasImgOnly =
        !!handle &&
        !title &&
        !!get(r, COL.productImageUrl).trim() &&
        !variantDataCols.some((c) => get(r, c).trim()) &&
        !get(r, COL.opt1Name).trim() &&
        !get(r, COL.opt1Val).trim();
      if (hasImgOnly) continue;

      const rowHasVariantData = variantDataCols.some((c) => get(r, c).trim());
      if (!rowHasVariantData) continue;

      const o1n = get(r, COL.opt1Name).trim();
      const o1v = get(r, COL.opt1Val).trim();
      if (!o1n || !o1v) {
        issues.push({
          severity: "error",
          code: "shopify/missing_option1_for_variant_data",
          row,
          column: !o1n ? COL.opt1Name : COL.opt1Val,
          message: `Row ${row}: Option1 name/value must be present when variant data columns are used (to avoid deleting variants).`,
          suggestion: "Fill Option1 name and Option1 value for variant rows.",
        });
      }
    }
  }

  // 9) Options uniqueness per product (within a handle group)
  // Shopify errors when option combinations are not unique.
  const byHandle = new Map<string, number[]>();
  for (let i = 0; i < fixedRows.length; i++) {
    const h = get(fixedRows[i], COL.handle).trim();
    if (!h) continue;
    const list = byHandle.get(h) ?? [];
    list.push(i);
    byHandle.set(h, list);
  }

  for (const [handle, idxs] of byHandle.entries()) {
    if (idxs.length <= 1) continue;

    const seenCombos = new Map<string, number[]>();

    for (const idx of idxs) {
      const r = fixedRows[idx];
      const v1 = get(r, COL.opt1Val).trim();
      const v2 = get(r, COL.opt2Val).trim();
      const v3 = get(r, COL.opt3Val).trim();

      // Image-only rows shouldn't be treated as variants.
      const sku = get(r, COL.sku).trim();
      const price = get(r, COL.price).trim();
      const hasVariantSignals = Boolean(sku || price || v1 || v2 || v3);
      if (!hasVariantSignals) continue;

      const combo = [v1, v2, v3].join("|").toLowerCase();
      const list = seenCombos.get(combo) ?? [];
      list.push(idx);
      seenCombos.set(combo, list);
    }

    for (const [combo, list] of seenCombos.entries()) {
      if (!combo.replace(/\|/g, "").trim()) continue;
      if (list.length <= 1) continue;

      const rowsList = list.map((i) => i + 1).join(", ");
      for (const idx of list) {
        issues.push({
          severity: "error",
          code: "shopify/options_not_unique",
          row: idx + 1,
          column: COL.opt1Val,
          message: `Row ${idx + 1}: Option values for handle "${handle}" are not unique (rows ${rowsList}).`,
          suggestion: "Make each variant option combination unique (Option1/2/3 values).",
        });
      }
    }
  }

  // 10) Price can't be blank when a row is clearly a variant row (Shopify common import failure)
  if (has(COL.price)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const r = fixedRows[i];
      const handle = get(r, COL.handle).trim();
      if (!handle) continue;

      const title = get(r, COL.title).trim();
      const img = get(r, COL.productImageUrl).trim();

      const variantSignals =
        get(r, COL.sku).trim() ||
        get(r, COL.barcode).trim() ||
        get(r, COL.opt1Val).trim() ||
        get(r, COL.opt2Val).trim() ||
        get(r, COL.opt3Val).trim() ||
        get(r, COL.inventoryTracker).trim() ||
        get(r, COL.inventoryQty).trim() ||
        get(r, COL.weightGrams).trim() ||
        get(r, COL.weightUnit).trim() ||
        get(r, COL.requiresShipping).trim() ||
        get(r, COL.fulfillmentService).trim();

      // Skip image-only rows
      const imageOnly = !!img && !title && !variantSignals;
      if (imageOnly) continue;

      if (variantSignals) {
        const price = get(r, COL.price).trim();
        if (!price) {
          issues.push({
            severity: "error",
            code: "shopify/blank_price",
            row,
            column: COL.price,
            message: `Row ${row}: Price can't be blank for a variant row.`,
            suggestion: "Fill Price with a number like 19.99.",
          });
        }
      }
    }
  }

  // 11) Duplicate SKUs across file (warning)
  if (has(COL.sku)) {
    const seen = new Map<string, number[]>();
    for (let i = 0; i < fixedRows.length; i++) {
      const sku = get(fixedRows[i], COL.sku).trim();
      if (!sku) continue;
      const key = sku.toLowerCase();
      const list = seen.get(key) ?? [];
      list.push(i);
      seen.set(key, list);
    }

    for (const [sku, list] of seen.entries()) {
      if (list.length <= 1) continue;
      const rowsList = list.map((i) => i + 1).join(", ");
      for (const idx of list) {
        issues.push({
          severity: "warning",
          code: "shopify/duplicate_sku",
          row: idx + 1,
          column: COL.sku,
          message: `Row ${idx + 1}: SKU "${sku}" is duplicated (rows ${rowsList}).`,
          suggestion: "If you use SKUs for fulfillment/inventory, keep them unique per variant.",
        });
      }
    }
  }

  // 12) Minimal guard: handle can't contain spaces (Shopify rule)
  // Base fixer already slugifies; this is just a strict backstop.
  if (has(COL.handle)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const raw = get(fixedRows[i], COL.handle).trim();
      if (!raw) continue;
      if (raw.includes(" ")) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_handle",
          row,
          column: COL.handle,
          message: `Row ${row}: URL handle contains spaces ("${raw}").`,
          suggestion: "Use only letters, numbers, and dashes (no spaces).",
        });
      }
    }
  }

  // 13) Product images should be http(s) URLs (already checked above), but also flag obvious non-URL text.
  // We keep the strict validator conservative: we do not fetch URLs.
  if (has(COL.productImageUrl)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const row = i + 1;
      const raw = get(fixedRows[i], COL.productImageUrl).trim();
      if (!raw) continue;
      if (!isHttpUrl(raw) && raw.length < 10) {
        issues.push({
          severity: "error",
          code: "shopify/invalid_image_url",
          row,
          column: COL.productImageUrl,
          message: `Row ${row}: Product image URL looks invalid ("${raw}").`,
          suggestion: "Use a full https:// URL to a publicly accessible image.",
        });
      }
    }
  }

  return issues;
}
