// src/lib/amazonOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

// Amazon Inventory Loader (flat-file) canonical headers.
// This covers the standard Amazon flat-file inventory loader used for existing ASINs.
export const AMAZON_INVENTORY_EXPECTED_HEADERS = [
  "sku",
  "product-id",
  "product-id-type",
  "price",
  "minimum-seller-allowed-price",
  "maximum-seller-allowed-price",
  "quantity",
  "add-delete",
  "will-ship-internationally",
  "expedited-shipping",
  "standard-plus",
  "item-name",
  "item-description",
  "image-url",
  "category1",
  "brand-name",
  "item-condition",
  "item-note",
  "fulfillment-channel",
];

export const AMAZON_INVENTORY_EXAMPLE_ROW: CsvRow = {
  sku: "AMZN-SKU-12345",
  "product-id": "B08XYZABCD",
  "product-id-type": "ASIN",
  price: "29.99",
  "minimum-seller-allowed-price": "",
  "maximum-seller-allowed-price": "",
  quantity: "10",
  "add-delete": "a",
  "will-ship-internationally": "",
  "expedited-shipping": "",
  "standard-plus": "",
  "item-name": "Example Product Title for Amazon",
  "item-description": "Full product description for the Amazon listing.",
  "image-url": "https://example.com/images/product.jpg",
  category1: "Electronics",
  "brand-name": "ExampleBrand",
  "item-condition": "11",
  "item-note": "",
  "fulfillment-channel": "DEFAULT",
};

// Amazon product-id-type enum values
const VALID_PRODUCT_ID_TYPES = new Set(["asin", "upc", "ean", "isbn", "jan", "gcid"]);

// Amazon item-condition codes (numeric)
// 1=Used;Like New, 2=Used;Very Good, 3=Used;Good, 4=Used;Acceptable
// 5=Collectible;Like New, 6=Collectible;Very Good, 7=Collectible;Good, 8=Collectible;Acceptable
// 10=Refurbished, 11=New
const VALID_ITEM_CONDITIONS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "10", "11"]);

// Amazon add-delete values
const VALID_ADD_DELETE = new Set(["a", "d"]);

// Amazon fulfillment channel values
const VALID_FULFILLMENT_CHANNELS = new Set(["default", "amazon_na", "amazon_eu", "amazon_fe"]);

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

function parseIntSafe(v: string) {
  if (!String(v ?? "").trim()) return { ok: true, value: "" };
  const n = Number.parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return { ok: false, value: v };
  return { ok: true, value: String(n) };
}

function canonicalAmazonInventoryHeaders(inputHeaders: string[]): string[] {
  const lowerToCanon = new Map(AMAZON_INVENTORY_EXPECTED_HEADERS.map((h) => [h.toLowerCase(), h] as const));

  const synonyms: Record<string, string> = {
    // SKU
    "seller-sku": "sku",
    seller_sku: "sku",
    "asin-id": "product-id",
    asin: "product-id",
    upc: "product-id",
    // product-id-type
    "product-id type": "product-id-type",
    productidtype: "product-id-type",
    // Pricing
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
    // Description
    description: "item-description",
    "product-description": "item-description",
    // Image
    "image-url": "image-url",
    imageurl: "image-url",
    image: "image-url",
    "picture-url": "image-url",
    // Brand
    brand: "brand-name",
    manufacturer: "brand-name",
    // Condition
    condition: "item-condition",
    "condition-type": "item-condition",
    // Fulfillment
    "fulfillment-center-id": "fulfillment-channel",
    "fulfillment-network": "fulfillment-channel",
    fba: "fulfillment-channel",
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

  // Required header checks
  for (const h of ["sku", "price", "quantity", "item-name"]) {
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
    if (!itemName) {
      issues.push({
        rowIndex,
        column: "item-name",
        severity: "error",
        code: "amazon/missing_item_name",
        message: "Missing item-name.",
        suggestion: "Provide a product title in the item-name column.",
      });
    } else if (itemName.length > 500) {
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
      } else {
        issues.push({
          rowIndex,
          column: "price",
          severity: "error",
          code: "amazon/missing_price",
          message: "Missing price.",
          suggestion: "Provide a listing price.",
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

    // quantity: required, non-negative integer
    const qRaw = out["quantity"] ?? "";
    const qi = parseIntSafe(qRaw);
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

    // product-id-type: must be a known type if provided
    if ("product-id-type" in out) {
      const pidType = (out["product-id-type"] ?? "").trim();
      if (pidType && !VALID_PRODUCT_ID_TYPES.has(pidType.toLowerCase())) {
        issues.push({
          rowIndex,
          column: "product-id-type",
          severity: "warning",
          code: "amazon/invalid_product_id_type",
          message: `product-id-type '${pidType}' is not a recognized Amazon identifier type.`,
          suggestion: "Use ASIN, UPC, EAN, ISBN, or JAN.",
        });
      } else if (pidType) {
        const normalized = pidType.toUpperCase();
        if (normalized !== pidType) {
          out["product-id-type"] = normalized;
          fixesApplied.push(`Normalized product-id-type to '${normalized}' on row ${rowIndex + 1}`);
        }
      }
    }

    // item-condition: Amazon numeric condition codes
    if ("item-condition" in out) {
      const cond = (out["item-condition"] ?? "").trim();
      if (cond && !VALID_ITEM_CONDITIONS.has(cond)) {
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
          suggestion: "Use 'a' to add/update a listing or 'd' to delete it.",
        });
      } else if (ad && ad !== out["add-delete"].trim()) {
        out["add-delete"] = ad;
        fixesApplied.push(`Normalized add-delete to '${ad}' on row ${rowIndex + 1}`);
      }
    }

    // fulfillment-channel
    if ("fulfillment-channel" in out) {
      const fc = (out["fulfillment-channel"] ?? "").trim();
      if (fc && !VALID_FULFILLMENT_CHANNELS.has(fc.toLowerCase())) {
        issues.push({
          rowIndex,
          column: "fulfillment-channel",
          severity: "warning",
          code: "amazon/invalid_fulfillment_channel",
          message: `fulfillment-channel '${fc}' is not a recognized value.`,
          suggestion: "Use DEFAULT (Merchant Fulfilled) or AMAZON_NA (FBA).",
        });
      }
    }

    // Boolean shipping fields: must be y, n, or empty
    for (const col of ["will-ship-internationally", "expedited-shipping"]) {
      if (col in out) {
        const val = (out[col] ?? "").trim().toLowerCase();
        if (val && val !== "y" && val !== "n") {
          issues.push({
            rowIndex,
            column: col,
            severity: "warning",
            code: "amazon/invalid_boolean_field",
            message: `${col} must be 'y' or 'n'. Found '${out[col]}'.`,
            suggestion: "Use 'y' (yes) or 'n' (no), or leave blank.",
            details: { column: col, value: out[col] },
          });
        }
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

  // Final header order: canonical Amazon columns first, then extra columns.
  const extra = canonHeaders.filter((h) => !AMAZON_INVENTORY_EXPECTED_HEADERS.includes(h));
  const fixedHeaders = [...AMAZON_INVENTORY_EXPECTED_HEADERS, ...extra];

  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    return out;
  });

  if (fixedHeaders.join("||") !== canonHeaders.join("||")) {
    fixesApplied.push("Amazon: enforced canonical header names + preferred order");
  }

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
