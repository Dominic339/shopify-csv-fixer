// src/lib/amazonOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

// Amazon Inventory Loader (offer file) columns, used to add or update offers on existing ASINs.
// Category listing templates use other names (item_sku, external_product_id, ...); those
// are recognised too, and a file always keeps its own column names on export.
export const AMAZON_INVENTORY_EXPECTED_HEADERS = [
  "sku",
  "product-id",
  "product-id-type",
  "price",
  "minimum-seller-allowed-price",
  "maximum-seller-allowed-price",
  "item-condition",
  "quantity",
  "add-delete",
  "will-ship-internationally",
  "expedited-shipping",
  "item-note",
  "merchant-shipping-group-name",
  "product_tax_code",
  "fulfillment-center-id",
  "handling-time",
];

export const AMAZON_INVENTORY_EXAMPLE_ROW: CsvRow = {
  sku: "AMZN-SKU-12345",
  "product-id": "B08XYZABCD",
  "product-id-type": "1",
  price: "29.99",
  "minimum-seller-allowed-price": "",
  "maximum-seller-allowed-price": "",
  "item-condition": "11",
  quantity: "10",
  "add-delete": "a",
  "will-ship-internationally": "",
  "expedited-shipping": "",
  "item-note": "",
  "merchant-shipping-group-name": "",
  product_tax_code: "",
  "fulfillment-center-id": "DEFAULT",
  "handling-time": "2",
};

// product-id-type: Inventory Loader uses numbers (1=ASIN, 2=ISBN, 3=UPC, 4=EAN);
// category templates use names.
const PRODUCT_ID_TYPE_NUMBERS: Record<string, string> = { "1": "asin", "2": "isbn", "3": "upc", "4": "ean" };
const VALID_PRODUCT_ID_TYPES = new Set(["asin", "upc", "ean", "isbn", "jan", "gcid", "gtin"]);

// Amazon item-condition codes (numeric)
// 1=Used;Like New, 2=Used;Very Good, 3=Used;Good, 4=Used;Acceptable
// 5=Collectible;Like New, 6=Collectible;Very Good, 7=Collectible;Good, 8=Collectible;Acceptable
// 10=Refurbished, 11=New
// 9=Club (legacy). Category templates use names (New, UsedLikeNew, Refurbished, ...).
// will-ship-internationally: 1/n = US only, 2/y = international (Inventory Loader guide).
const VALID_SHIP_INTERNATIONALLY = new Set(["1", "2", "y", "n"]);
// expedited-shipping options: Next (one day), Second (two day), Domestic, International, Plus.
const EXPEDITED_OPTIONS = new Set(["next", "second", "domestic", "international", "plus"]);

const VALID_ITEM_CONDITIONS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
const VALID_CONDITION_NAMES = new Set([
  "new", "refurbished", "usedlikenew", "usedverygood", "usedgood", "usedacceptable",
  "collectiblelikenew", "collectibleverygood", "collectiblegood", "collectibleacceptable", "club",
]);

// Inventory Loader files need the numeric codes; category templates use the names.
const PRODUCT_ID_TYPE_CODES: Record<string, string> = { asin: "1", isbn: "2", upc: "3", ean: "4" };
const CONDITION_CODES: Record<string, string> = {
  usedlikenew: "1", usedverygood: "2", usedgood: "3", usedacceptable: "4",
  collectiblelikenew: "5", collectibleverygood: "6", collectiblegood: "7", collectibleacceptable: "8",
  club: "9", refurbished: "10", new: "11",
};

// Amazon add-delete values
// a = add/update, d = delete the offer, x = delete the offer and product data
const VALID_ADD_DELETE = new Set(["a", "d", "x"]);

// Amazon fulfillment channel values
const VALID_FULFILLMENT_CHANNELS = new Set(["default", "amazon_na", "amazon_eu", "amazon_fe", "amazon_in"]);

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

function canonicalAmazonInventoryHeaders(inputHeaders: string[]): string[] {
  const lowerToCanon = new Map(AMAZON_INVENTORY_EXPECTED_HEADERS.map((h) => [h.toLowerCase(), h] as const));

  const synonyms: Record<string, string> = {
    // SKU
    "seller-sku": "sku",
    seller_sku: "sku",
    item_sku: "sku",
    "asin-id": "product-id",
    asin: "product-id",
    upc: "product-id",
    external_product_id: "product-id",
    external_product_id_type: "product-id-type",
    // product-id-type
    "product-id type": "product-id-type",
    productidtype: "product-id-type",
    // Pricing
    standard_price: "price",
    "regular-price": "price",
    "listing-price": "price",
    "your-price": "price",
    "minimum-price": "minimum-seller-allowed-price",
    "maximum-price": "maximum-seller-allowed-price",
    // Quantity
    qty: "quantity",
    stock: "quantity",
    inventory: "quantity",
    // Item name/title
    title: "item-name",
    name: "item-name",
    "product-name": "item-name",
    item_name: "item-name",
    // Description
    description: "item-description",
    "product-description": "item-description",
    product_description: "item-description",
    // Image
    "image-url": "image-url",
    imageurl: "image-url",
    image: "image-url",
    "picture-url": "image-url",
    main_image_url: "image-url",
    // Brand
    brand: "brand-name",
    brand_name: "brand-name",
    manufacturer: "brand-name",
    // Condition
    condition: "item-condition",
    "condition-type": "item-condition",
    condition_type: "item-condition",
    "condition-note": "item-note",
    condition_note: "item-note",
    // Fulfillment
    fulfillment_center_id: "fulfillment-center-id",
    "fulfillment-channel": "fulfillment-center-id",
  };

  return inputHeaders.map((h) => {
    const key = h.trim().toLowerCase();
    return lowerToCanon.get(key) ?? synonyms[key] ?? h.trim();
  });
}

export function validateAndFixAmazonInventory(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];

  const canonHeaders = canonicalAmazonInventoryHeaders(headers);
  // Columns only the Inventory Loader (offer file) has; category templates name them differently.
  const isInventoryLoader = headers.some((h) => ["add-delete", "item-condition", "product-id-type"].includes(h.trim().toLowerCase()));

  // Required header checks
  for (const h of ["sku"]) {
    if (!canonHeaders.includes(h)) {
      issues.push({
        rowIndex: -1,
        column: h,
        severity: "error",
        code: "amazon/missing_required_header",
        message: `Missing required column: ${h}`,
        suggestion: `Add the '${h}' column (Amazon flat-file field).`,
      });
    }
  }

  const canonRows: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[canonHeaders[i]] = r?.[headers[i]] ?? "";
    }
    return out;
  });

  // Track duplicate SKUs
  const skuRows = new Map<string, number[]>();

  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    // SKU: required, max 40 chars
    const sku = (out["sku"] ?? "").trim();
    if (!sku) {
      issues.push({
        rowIndex,
        column: "sku",
        severity: "error",
        code: "amazon/missing_sku",
        message: "Missing SKU.",
        suggestion: "Provide a unique SKU for each product listing.",
      });
    } else {
      if (sku.length > 40) {
        issues.push({
          rowIndex,
          column: "sku",
          severity: "error",
          code: "amazon/sku_too_long",
          message: `SKU '${sku.slice(0, 20)}…' is ${sku.length} characters. Amazon SKUs must be 40 characters or fewer.`,
          suggestion: "Shorten the SKU to 40 characters or fewer.",
          details: { length: sku.length, max: 40 },
        });
      }
      const arr = skuRows.get(sku) ?? [];
      arr.push(rowIndex);
      skuRows.set(sku, arr);
    }

    // item-name: required, max 500 chars
    const itemName = (out["item-name"] ?? "").trim();
    const addDelete = (out["add-delete"] ?? "").trim().toLowerCase();
    const isDelete = addDelete === "d" || addDelete === "x";
    if (itemName.length > 500) {
      issues.push({
        rowIndex,
        column: "item-name",
        severity: "warning",
        code: "amazon/item_name_too_long",
        message: `item-name is ${itemName.length} characters. Amazon typically allows up to 500 characters.`,
        suggestion: "Shorten the item-name to 500 characters or fewer.",
        details: { length: itemName.length, max: 500 },
      });
    }

    // price: required, decimal
    const priceRaw = out["price"] ?? "";
    const price = parseShopifyMoney(priceRaw);
    if (price == null) {
      if (!isEmpty(priceRaw)) {
        issues.push({
          rowIndex,
          column: "price",
          severity: "error",
          code: "amazon/invalid_price",
          message: `price should be a decimal number. Found '${priceRaw}'.`,
          suggestion: "Use a plain decimal like 19.99 (no currency symbols).",
        });
      } else if ("price" in out && !isDelete) {
        issues.push({
          rowIndex,
          column: "price",
          severity: "warning",
          code: "amazon/missing_price",
          message: "price is blank. Existing offers keep their price; new offers need one.",
          suggestion: "Provide a price if this is a new offer.",
        });
      }
    } else {
      const formatted = formatShopifyMoney(price);
      if (formatted !== priceRaw.trim()) {
        out["price"] = formatted;
        fixesApplied.push(`Normalized price to '${formatted}' on row ${rowIndex + 1}`);
      }
    }

    // minimum-seller-allowed-price / maximum-seller-allowed-price
    for (const col of ["minimum-seller-allowed-price", "maximum-seller-allowed-price"]) {
      if (!(col in out)) continue;
      const raw = out[col] ?? "";
      if (!isEmpty(raw)) {
        const parsed = parseShopifyMoney(raw);
        if (parsed == null) {
          issues.push({
            rowIndex,
            column: col,
            severity: "warning",
            code: "amazon/invalid_price",
            message: `${col} should be a decimal number. Found '${raw}'.`,
            suggestion: "Use a plain decimal like 19.99 (no currency symbols).",
          });
        } else {
          const formatted = formatShopifyMoney(parsed);
          if (formatted !== raw.trim()) {
            out[col] = formatted;
            fixesApplied.push(`Normalized ${col} to '${formatted}' on row ${rowIndex + 1}`);
          }
        }
      }
    }

    // The price has to sit inside the seller's own min/max range, or Amazon deactivates the offer.
    {
      const min = parseShopifyMoney(out["minimum-seller-allowed-price"] ?? "");
      const max = parseShopifyMoney(out["maximum-seller-allowed-price"] ?? "");
      const price = parseShopifyMoney(out["price"] ?? "");
      if (min != null && max != null && min > max) {
        issues.push({
          rowIndex,
          column: "minimum-seller-allowed-price",
          severity: "error",
          code: "amazon/min_above_max_price",
          message: `minimum-seller-allowed-price (${formatShopifyMoney(min)}) is higher than maximum-seller-allowed-price (${formatShopifyMoney(max)}).`,
          suggestion: "Swap the two values, or clear one of them.",
        });
      } else if (price != null && ((min != null && price < min) || (max != null && price > max))) {
        issues.push({
          rowIndex,
          column: "price",
          severity: "warning",
          code: "amazon/price_outside_allowed_range",
          message: `price (${formatShopifyMoney(price)}) is outside this SKU's allowed range (${min != null ? formatShopifyMoney(min) : "no minimum"} to ${max != null ? formatShopifyMoney(max) : "no maximum"}).`,
          suggestion: "Amazon deactivates offers priced outside the seller-allowed range. Change the price or the range.",
        });
      }
    }

    // quantity: required, non-negative integer
    const qRaw = out["quantity"] ?? "";
    const qn = isEmpty(qRaw) ? null : parseShopifyMoney(qRaw);
    const qi =
      isEmpty(qRaw) ? { ok: true, value: "" } : qn != null && Number.isInteger(qn) && qn >= 0 ? { ok: true, value: String(qn) } : { ok: false, value: qRaw };
    if (!qi.ok) {
      issues.push({
        rowIndex,
        column: "quantity",
        severity: "error",
        code: "amazon/invalid_quantity",
        message: `quantity should be a non-negative integer. Found '${qRaw}'.`,
        suggestion: "Use a whole number like 0, 1, 10.",
      });
    } else if (qi.value !== qRaw.trim()) {
      out["quantity"] = qi.value;
      if (!isEmpty(qRaw)) fixesApplied.push(`Normalized quantity to '${qi.value}' on row ${rowIndex + 1}`);
    }

    // product-id-type: numeric codes (Inventory Loader) or names (category templates)
    let idType = "";
    if ("product-id-type" in out) {
      let pidType = (out["product-id-type"] ?? "").trim();
      const code = PRODUCT_ID_TYPE_CODES[pidType.toLowerCase()];
      if (isInventoryLoader && code) {
        out["product-id-type"] = code;
        fixesApplied.push(`Converted product-id-type '${pidType}' to Inventory Loader code ${code} on row ${rowIndex + 1}`);
        pidType = code;
      }
      idType = PRODUCT_ID_TYPE_NUMBERS[pidType] ?? pidType.toLowerCase();
      if (pidType && !VALID_PRODUCT_ID_TYPES.has(idType)) {
        issues.push({
          rowIndex,
          column: "product-id-type",
          severity: "error",
          code: "amazon/invalid_product_id_type",
          message: `product-id-type '${pidType}' is not a recognized Amazon identifier type.`,
          suggestion: "Inventory Loader: 1 (ASIN), 2 (ISBN), 3 (UPC), 4 (EAN). Category templates: ASIN, UPC, EAN, ISBN, GTIN.",
        });
      }
    }

    // product-id: catch barcodes Excel has mangled, and check length for the type
    if ("product-id" in out) {
      const pid = (out["product-id"] ?? "").trim();
      if (/^\d+(\.\d+)?e\+?\d+$/i.test(pid)) {
        issues.push({
          rowIndex,
          column: "product-id",
          severity: "error",
          code: "amazon/product_id_scientific_notation",
          message: `product-id '${pid}' was turned into scientific notation by a spreadsheet, so digits are lost.`,
          suggestion: "Re-export the product IDs as text (format the column as Text before pasting) and re-enter the full number.",
        });
      } else if (pid && idType) {
        const digits = /^\d+$/.test(pid);
        const expected: Record<string, number[]> = { upc: [12], ean: [13], isbn: [10, 13], gtin: [8, 12, 13, 14], jan: [8, 13] };
        if (idType === "asin" && !/^[A-Z0-9]{10}$/i.test(pid)) {
          issues.push({
            rowIndex,
            column: "product-id",
            severity: "error",
            code: "amazon/invalid_product_id",
            message: `ASIN '${pid}' should be 10 letters and digits (e.g. B08XYZABCD).`,
            suggestion: "Check the ASIN on the product's Amazon page.",
          });
        } else if (expected[idType] && !(digits && expected[idType].includes(pid.length))) {
          const short = digits && expected[idType].some((n) => pid.length === n - 1);
          issues.push({
            rowIndex,
            column: "product-id",
            severity: "error",
            code: "amazon/invalid_product_id",
            message: short
              ? `${idType.toUpperCase()} '${pid}' is one digit short; a spreadsheet may have dropped a leading zero.`
              : `${idType.toUpperCase()} '${pid}' should be ${expected[idType].join(" or ")} digits.`,
            suggestion: short ? `Try '0${pid}', and keep the column formatted as Text.` : "Check the barcode number.",
          });
        }
      }
    }

    // item-condition: Amazon numeric condition codes
    if ("item-condition" in out) {
      let cond = (out["item-condition"] ?? "").trim();
      const condCode = CONDITION_CODES[cond.toLowerCase().replace(/[\s_;-]/g, "")];
      if (isInventoryLoader && condCode) {
        out["item-condition"] = condCode;
        fixesApplied.push(`Converted item-condition '${cond}' to code ${condCode} on row ${rowIndex + 1}`);
        cond = condCode;
      }
      if (cond && !VALID_ITEM_CONDITIONS.has(cond) && !VALID_CONDITION_NAMES.has(cond.toLowerCase().replace(/[\s_-]/g, ""))) {
        issues.push({
          rowIndex,
          column: "item-condition",
          severity: "warning",
          code: "amazon/invalid_item_condition",
          message: `item-condition '${cond}' is not a valid Amazon condition code.`,
          suggestion:
            "Use a numeric condition code: 11=New, 1=Used Like New, 2=Used Very Good, 3=Used Good, 4=Used Acceptable, 10=Refurbished.",
        });
      }
    }

    // add-delete: a or d
    if ("add-delete" in out) {
      const ad = (out["add-delete"] ?? "").trim().toLowerCase();
      if (ad && !VALID_ADD_DELETE.has(ad)) {
        issues.push({
          rowIndex,
          column: "add-delete",
          severity: "warning",
          code: "amazon/invalid_add_delete",
          message: `add-delete value '${out["add-delete"]}' is not valid.`,
          suggestion: "Use 'a' to add/update, 'd' to delete the offer, or 'x' to delete the offer and its product data.",
        });
      } else if (ad && ad !== out["add-delete"].trim()) {
        out["add-delete"] = ad;
        fixesApplied.push(`Normalized add-delete to '${ad}' on row ${rowIndex + 1}`);
      }
    }

    // fulfillment-channel
    if ("fulfillment-center-id" in out) {
      const fc = (out["fulfillment-center-id"] ?? "").trim();
      if (fc && !VALID_FULFILLMENT_CHANNELS.has(fc.toLowerCase())) {
        issues.push({
          rowIndex,
          column: "fulfillment-center-id",
          severity: "warning",
          code: "amazon/invalid_fulfillment_channel",
          message: `fulfillment-center-id '${fc}' is not a recognized value.`,
          suggestion: "Use DEFAULT (merchant fulfilled), or AMAZON_NA / AMAZON_EU / AMAZON_FE / AMAZON_IN for FBA.",
        });
      }
    }

    // Shipping options, as Amazon's Inventory Loader guide defines them.
    // will-ship-internationally: 1 or n = US only, 2 or y = ships internationally.
    if ("will-ship-internationally" in out) {
      const raw = out["will-ship-internationally"] ?? "";
      const val = raw.trim().toLowerCase();
      if (val && !VALID_SHIP_INTERNATIONALLY.has(val)) {
        issues.push({
          rowIndex,
          column: "will-ship-internationally",
          severity: "warning",
          code: "amazon/invalid_boolean_field",
          message: `will-ship-internationally must be 1, 2, y or n. Found '${raw}'.`,
          suggestion: "Use n or 1 to ship within the US only, y or 2 to ship internationally, or leave blank.",
          details: { column: "will-ship-internationally", value: raw },
        });
      }
    }

    // expedited-shipping: a comma-separated list of Next, Second, Domestic, International
    // and Plus, or N (or blank) for none.
    if ("expedited-shipping" in out) {
      const raw = out["expedited-shipping"] ?? "";
      const val = raw.trim().toLowerCase();
      const parts = val.split(",").map((p) => p.trim());
      const ok = !val || val === "n" || parts.every((p) => EXPEDITED_OPTIONS.has(p));
      if (!ok) {
        issues.push({
          rowIndex,
          column: "expedited-shipping",
          severity: "warning",
          code: "amazon/invalid_expedited_shipping",
          message: `expedited-shipping value '${raw}' is not valid.`,
          suggestion: "List the options you offer, separated by commas (Next, Second, Domestic, International, Plus), or use N or leave blank for none.",
          details: { column: "expedited-shipping", value: raw },
        });
      }
    }

    // image-url: validate if present
    if ("image-url" in out) {
      const imgUrl = (out["image-url"] ?? "").trim();
      if (imgUrl && !isHttpUrl(imgUrl)) {
        issues.push({
          rowIndex,
          column: "image-url",
          severity: "warning",
          code: "amazon/invalid_image_url",
          message: `image-url is not a valid URL: '${imgUrl}'.`,
          suggestion: "Use a full https:// URL pointing to the product image.",
        });
      }
    }

    // item-description: max 2000 chars
    if ("item-description" in out) {
      const desc = (out["item-description"] ?? "").trim();
      if (desc.length > 2000) {
        issues.push({
          rowIndex,
          column: "item-description",
          severity: "warning",
          code: "amazon/description_too_long",
          message: `item-description is ${desc.length} characters. Amazon typically allows up to 2000 characters.`,
          suggestion: "Shorten the description to 2000 characters or fewer.",
          details: { length: desc.length, max: 2000 },
        });
      }
    }

    // brand-name: max 50 chars
    if ("brand-name" in out) {
      const brand = (out["brand-name"] ?? "").trim();
      if (brand.length > 50) {
        issues.push({
          rowIndex,
          column: "brand-name",
          severity: "warning",
          code: "amazon/brand_name_too_long",
          message: `brand-name is ${brand.length} characters. Amazon allows up to 50 characters.`,
          suggestion: "Shorten the brand-name to 50 characters or fewer.",
          details: { length: brand.length, max: 50 },
        });
      }
    }

    return out;
  });

  // Cross-row: duplicate SKU detection
  for (const [sku, idxs] of skuRows.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "sku",
        severity: "warning",
        code: "amazon/duplicate_sku",
        message: `Duplicate SKU '${sku}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "Each product should have a unique SKU. Use add-delete='d' to remove duplicates or update existing ones.",
        details: { sku, rows: rows1b },
      });
    }
  }

  // Output keeps the file's own column names and order: Inventory Loader and category
  // templates are matched by exact header, so renaming a column breaks the upload.
  const fixedHeaders = [...headers];
  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    headers.forEach((h, i) => (out[h] = r?.[canonHeaders[i]] ?? ""));
    return out;
  });
  const originalOf = new Map(canonHeaders.map((c, i) => [c, headers[i]] as const));
  for (const it of issues) it.column = originalOf.get(it.column) ?? it.column;

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
