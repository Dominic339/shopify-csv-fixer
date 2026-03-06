// src/lib/convertCsv.ts
// Format conversion: source CSV → canonical intermediate → target format

import type { CsvRow } from "@/lib/csv";
import type { Plan } from "@/lib/quota";

// ---------------------------------------------------------------------------
// Row limits by plan
// ---------------------------------------------------------------------------

export function getConvertRowLimit(plan: Plan): number | null {
  if (plan === "advanced") return null; // unlimited
  if (plan === "basic") return 1000;
  return 100; // free
}

// ---------------------------------------------------------------------------
// Canonical intermediate representation
// Every field is optional — only fields that the source supports will be set.
// ---------------------------------------------------------------------------

export type CanonicalRow = {
  handle?: string;
  title?: string;
  description?: string;
  vendor?: string;
  type?: string;
  tags?: string;
  published?: string;
  status?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compare_at_price?: string;
  cost_per_item?: string;
  inventory_qty?: string;
  inventory_policy?: string;
  fulfillment_service?: string;
  weight_value?: string;
  weight_unit?: string;
  requires_shipping?: string;
  taxable?: string;
  image_url?: string;
  image_position?: string;
  image_alt?: string;
  variant_image?: string;
  gift_card?: string;
  seo_title?: string;
  seo_description?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  category?: string;
};

// ---------------------------------------------------------------------------
// Source format → canonical mappings
// Each entry: { sourceHeader: canonicalField }
// ---------------------------------------------------------------------------

// Shopify legacy (old headers, Variant Price style)
const SHOPIFY_LEGACY_TO_CANONICAL: Record<string, keyof CanonicalRow> = {
  "handle": "handle",
  "title": "title",
  "body (html)": "description",
  "vendor": "vendor",
  "type": "type",
  "tags": "tags",
  "published": "published",
  "status": "status",
  "variant sku": "sku",
  "variant barcode": "barcode",
  "variant price": "price",
  "variant compare at price": "compare_at_price",
  "cost per item": "cost_per_item",
  "variant inventory qty": "inventory_qty",
  "variant inventory policy": "inventory_policy",
  "variant fulfillment service": "fulfillment_service",
  "variant grams": "weight_value",
  "variant weight unit": "weight_unit",
  "variant requires shipping": "requires_shipping",
  "variant taxable": "taxable",
  "image src": "image_url",
  "image position": "image_position",
  "image alt text": "image_alt",
  "variant image": "variant_image",
  "gift card": "gift_card",
  "seo title": "seo_title",
  "seo description": "seo_description",
  "option1 name": "option1_name",
  "option1 value": "option1_value",
  "option2 name": "option2_name",
  "option2 value": "option2_value",
  "option3 name": "option3_name",
  "option3 value": "option3_value",
  "product category": "category",
};

// Shopify new official template (2024+)
const SHOPIFY_NEW_TO_CANONICAL: Record<string, keyof CanonicalRow> = {
  "url handle": "handle",
  "title": "title",
  "description": "description",
  "vendor": "vendor",
  "type": "type",
  "tags": "tags",
  "published on online store": "published",
  "status": "status",
  "sku": "sku",
  "barcode": "barcode",
  "price": "price",
  "compare-at price": "compare_at_price",
  "cost per item": "cost_per_item",
  "inventory quantity": "inventory_qty",
  "continue selling when out of stock": "inventory_policy",
  "weight value (grams)": "weight_value",
  "weight unit for display": "weight_unit",
  "requires shipping": "requires_shipping",
  "charge tax": "taxable",
  "product image url": "image_url",
  "image position": "image_position",
  "image alt text": "image_alt",
  "variant image url": "variant_image",
  "gift card": "gift_card",
  "seo title": "seo_title",
  "seo description": "seo_description",
  "option1 name": "option1_name",
  "option1 value": "option1_value",
  "option2 name": "option2_name",
  "option2 value": "option2_value",
  "option3 name": "option3_name",
  "option3 value": "option3_value",
  "product category": "category",
};

// WooCommerce Products
const WOO_TO_CANONICAL: Record<string, keyof CanonicalRow> = {
  "name": "title",
  "sku": "sku",
  "description": "description",
  "short description": "description",
  "regular price": "price",
  "sale price": "compare_at_price",
  "published": "published",
  "stock": "inventory_qty",
  "in stock?": "inventory_qty",
  "images": "image_url",
  "tags": "tags",
  "weight (g)": "weight_value",
  "categories": "category",
  "type": "type",
  "meta: _yoast_wpseo_title": "seo_title",
  "meta: _yoast_wpseo_metadesc": "seo_description",
};

// Etsy Listings
const ETSY_TO_CANONICAL: Record<string, keyof CanonicalRow> = {
  "title": "title",
  "description": "description",
  "price": "price",
  "quantity": "inventory_qty",
  "sku": "sku",
  "tags": "tags",
  "image urls": "image_url",
  "type": "type",
};

// eBay Listings
const EBAY_TO_CANONICAL: Record<string, keyof CanonicalRow> = {
  "title": "title",
  "description": "description",
  "startprice": "price",
  "quantity": "inventory_qty",
  "customlabel": "sku",
  "pictureurl": "image_url",
  "categoryid": "category",
};

// Amazon Inventory Loader
const AMAZON_TO_CANONICAL: Record<string, keyof CanonicalRow> = {
  "sku": "sku",
  "item-name": "title",
  "item-description": "description",
  "price": "price",
  "quantity": "inventory_qty",
  "image-url": "image_url",
  "category1": "category",
  "brand-name": "vendor",
  "product-id": "barcode",
};

const SOURCE_MAPS: Record<string, Record<string, keyof CanonicalRow>> = {
  shopify_products: { ...SHOPIFY_LEGACY_TO_CANONICAL, ...SHOPIFY_NEW_TO_CANONICAL },
  woocommerce_products: WOO_TO_CANONICAL,
  woocommerce_variable_products: WOO_TO_CANONICAL,
  etsy_listings: ETSY_TO_CANONICAL,
  ebay_listings: EBAY_TO_CANONICAL,
  ebay_variations: EBAY_TO_CANONICAL,
  amazon_inventory_loader: AMAZON_TO_CANONICAL,
};

// ---------------------------------------------------------------------------
// Target format header definitions + canonical → target field mappings
// ---------------------------------------------------------------------------

type TargetSpec = {
  headers: string[];
  fromCanonical: (c: CanonicalRow) => CsvRow;
};

const SHOPIFY_LEGACY_TARGET: TargetSpec = {
  headers: [
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
    "Published", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams",
    "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card",
    "SEO Title", "SEO Description", "Status",
  ],
  fromCanonical: (c) => ({
    "Handle": c.handle ?? "",
    "Title": c.title ?? "",
    "Body (HTML)": c.description ?? "",
    "Vendor": c.vendor ?? "",
    "Product Category": c.category ?? "",
    "Type": c.type ?? "",
    "Tags": c.tags ?? "",
    "Published": c.published ?? "",
    "Option1 Name": c.option1_name ?? "",
    "Option1 Value": c.option1_value ?? "",
    "Option2 Name": c.option2_name ?? "",
    "Option2 Value": c.option2_value ?? "",
    "Option3 Name": c.option3_name ?? "",
    "Option3 Value": c.option3_value ?? "",
    "Variant SKU": c.sku ?? "",
    "Variant Grams": c.weight_value ?? "",
    "Variant Inventory Tracker": "shopify",
    "Variant Inventory Qty": c.inventory_qty ?? "",
    "Variant Inventory Policy": c.inventory_policy ?? "deny",
    "Variant Fulfillment Service": c.fulfillment_service ?? "manual",
    "Variant Price": c.price ?? "",
    "Variant Compare At Price": c.compare_at_price ?? "",
    "Variant Requires Shipping": c.requires_shipping ?? "true",
    "Variant Taxable": c.taxable ?? "true",
    "Variant Barcode": c.barcode ?? "",
    "Image Src": c.image_url ?? "",
    "Image Position": c.image_position ?? "",
    "Image Alt Text": c.image_alt ?? "",
    "Gift Card": c.gift_card ?? "false",
    "SEO Title": c.seo_title ?? "",
    "SEO Description": c.seo_description ?? "",
    "Status": c.status ?? "active",
  }),
};

const SHOPIFY_NEW_TARGET: TargetSpec = {
  headers: [
    "Title", "URL handle", "Description", "Vendor", "Product category", "Type", "Tags",
    "Published on online store", "Status", "SKU", "Barcode", "Price", "Compare-at price",
    "Cost per item", "Inventory quantity", "Continue selling when out of stock",
    "Weight value (grams)", "Weight unit for display", "Requires shipping", "Charge tax",
    "Product image URL", "Image position", "Image alt text", "Variant image URL",
    "Gift card", "SEO title", "SEO description",
    "Option1 name", "Option1 value", "Option2 name", "Option2 value",
    "Option3 name", "Option3 value",
  ],
  fromCanonical: (c) => ({
    "Title": c.title ?? "",
    "URL handle": c.handle ?? "",
    "Description": c.description ?? "",
    "Vendor": c.vendor ?? "",
    "Product category": c.category ?? "",
    "Type": c.type ?? "",
    "Tags": c.tags ?? "",
    "Published on online store": c.published ?? "",
    "Status": c.status ?? "active",
    "SKU": c.sku ?? "",
    "Barcode": c.barcode ?? "",
    "Price": c.price ?? "",
    "Compare-at price": c.compare_at_price ?? "",
    "Cost per item": c.cost_per_item ?? "",
    "Inventory quantity": c.inventory_qty ?? "",
    "Continue selling when out of stock": c.inventory_policy ?? "",
    "Weight value (grams)": c.weight_value ?? "",
    "Weight unit for display": c.weight_unit ?? "",
    "Requires shipping": c.requires_shipping ?? "",
    "Charge tax": c.taxable ?? "",
    "Product image URL": c.image_url ?? "",
    "Image position": c.image_position ?? "",
    "Image alt text": c.image_alt ?? "",
    "Variant image URL": c.variant_image ?? "",
    "Gift card": c.gift_card ?? "false",
    "SEO title": c.seo_title ?? "",
    "SEO description": c.seo_description ?? "",
    "Option1 name": c.option1_name ?? "",
    "Option1 value": c.option1_value ?? "",
    "Option2 name": c.option2_name ?? "",
    "Option2 value": c.option2_value ?? "",
    "Option3 name": c.option3_name ?? "",
    "Option3 value": c.option3_value ?? "",
  }),
};

const WOO_TARGET: TargetSpec = {
  headers: [
    "ID", "Type", "SKU", "Name", "Published", "Is featured?",
    "Visibility in catalog", "Short description", "Description",
    "Regular price", "Sale price", "Tax status", "Tax class",
    "In stock?", "Stock", "Backorders allowed?", "Sold individually?",
    "Weight (g)", "Categories", "Tags", "Images",
    "Attribute 1 name", "Attribute 1 value(s)",
  ],
  fromCanonical: (c) => ({
    "ID": "",
    "Type": c.type || "simple",
    "SKU": c.sku ?? "",
    "Name": c.title ?? "",
    "Published": c.published ?? "1",
    "Is featured?": "0",
    "Visibility in catalog": "visible",
    "Short description": "",
    "Description": c.description ?? "",
    "Regular price": c.price ?? "",
    "Sale price": c.compare_at_price ?? "",
    "Tax status": "taxable",
    "Tax class": "",
    "In stock?": c.inventory_qty ? "1" : "",
    "Stock": c.inventory_qty ?? "",
    "Backorders allowed?": "0",
    "Sold individually?": "0",
    "Weight (g)": c.weight_value ?? "",
    "Categories": c.category ?? "",
    "Tags": c.tags ?? "",
    "Images": c.image_url ?? "",
    "Attribute 1 name": c.option1_name ?? "",
    "Attribute 1 value(s)": c.option1_value ?? "",
  }),
};

const ETSY_TARGET: TargetSpec = {
  headers: [
    "Listing ID", "Title", "Description", "Price", "Currency",
    "Quantity", "SKU", "Tags", "Materials", "Image URLs",
    "renewal_option", "type",
  ],
  fromCanonical: (c) => ({
    "Listing ID": "",
    "Title": c.title ?? "",
    "Description": c.description ?? "",
    "Price": c.price ?? "",
    "Currency": "USD",
    "Quantity": c.inventory_qty ?? "",
    "SKU": c.sku ?? "",
    "Tags": c.tags ?? "",
    "Materials": "",
    "Image URLs": c.image_url ?? "",
    "renewal_option": "automatic",
    "type": c.type || "physical",
  }),
};

const EBAY_TARGET: TargetSpec = {
  headers: [
    "Action", "CustomLabel", "Title", "Description", "StartPrice",
    "Quantity", "Format", "Duration", "ConditionID",
    "ConditionDescription", "CategoryID", "PictureURL",
  ],
  fromCanonical: (c) => ({
    "Action": "Add",
    "CustomLabel": c.sku ?? "",
    "Title": c.title ?? "",
    "Description": c.description ?? "",
    "StartPrice": c.price ?? "",
    "Quantity": c.inventory_qty ?? "",
    "Format": "FixedPriceItem",
    "Duration": "GTC",
    "ConditionID": "1000",
    "ConditionDescription": "",
    "CategoryID": c.category ?? "",
    "PictureURL": c.image_url ?? "",
  }),
};

const AMAZON_TARGET: TargetSpec = {
  headers: [
    "sku", "product-id", "product-id-type", "price",
    "minimum-seller-allowed-price", "maximum-seller-allowed-price",
    "quantity", "add-delete", "item-name", "item-description",
    "image-url", "category1", "brand-name", "item-condition",
    "fulfillment-channel",
  ],
  fromCanonical: (c) => ({
    "sku": c.sku ?? "",
    "product-id": c.barcode ?? "",
    "product-id-type": c.barcode ? "EAN" : "",
    "price": c.price ?? "",
    "minimum-seller-allowed-price": "",
    "maximum-seller-allowed-price": "",
    "quantity": c.inventory_qty ?? "",
    "add-delete": "a",
    "item-name": c.title ?? "",
    "item-description": c.description ?? "",
    "image-url": c.image_url ?? "",
    "category1": c.category ?? "",
    "brand-name": c.vendor ?? "",
    "item-condition": "11",
    "fulfillment-channel": "DEFAULT",
  }),
};

const TARGET_SPECS: Record<string, TargetSpec> = {
  shopify_products: SHOPIFY_NEW_TARGET,
  shopify_products_legacy: SHOPIFY_LEGACY_TARGET,
  woocommerce_products: WOO_TARGET,
  woocommerce_variable_products: WOO_TARGET,
  etsy_listings: ETSY_TARGET,
  ebay_listings: EBAY_TARGET,
  amazon_inventory_loader: AMAZON_TARGET,
};

// User-facing display names for the converter UI
export const CONVERT_FORMAT_OPTIONS = [
  { id: "shopify_products", label: "Shopify (new template)" },
  { id: "shopify_products_legacy", label: "Shopify (legacy)" },
  { id: "woocommerce_products", label: "WooCommerce Products" },
  { id: "woocommerce_variable_products", label: "WooCommerce Variable Products" },
  { id: "etsy_listings", label: "Etsy Listings" },
  { id: "ebay_listings", label: "eBay Listings" },
  { id: "amazon_inventory_loader", label: "Amazon Inventory Loader" },
];

// ---------------------------------------------------------------------------
// Conversion logic
// ---------------------------------------------------------------------------

export type ConvertResult = {
  headers: string[];
  rows: CsvRow[];
  warnings: string[];
  rowsProcessed: number;
  rowsTotal: number;
  truncated: boolean;
  unmappedSourceFields: string[];
};

/**
 * Convert rows from one format to another via canonical intermediate.
 */
export function convertCsv(
  sourceHeaders: string[],
  sourceRows: CsvRow[],
  sourceFormatId: string,
  targetFormatId: string,
  plan: Plan = "free"
): ConvertResult {
  const warnings: string[] = [];

  // Resolve source map (normalize source ID to handle legacy/new Shopify variants)
  const normalizedSourceId = sourceFormatId === "shopify_products_legacy" ? "shopify_products" : sourceFormatId;
  const sourceMap = SOURCE_MAPS[normalizedSourceId];
  const targetSpec = TARGET_SPECS[targetFormatId];

  if (!sourceMap) {
    return {
      headers: sourceHeaders,
      rows: sourceRows,
      warnings: [`Unsupported source format: ${sourceFormatId}`],
      rowsProcessed: 0,
      rowsTotal: sourceRows.length,
      truncated: false,
      unmappedSourceFields: [],
    };
  }

  if (!targetSpec) {
    return {
      headers: sourceHeaders,
      rows: sourceRows,
      warnings: [`Unsupported target format: ${targetFormatId}`],
      rowsProcessed: 0,
      rowsTotal: sourceRows.length,
      truncated: false,
      unmappedSourceFields: [],
    };
  }

  // Apply row limit
  const limit = getConvertRowLimit(plan);
  const totalRows = sourceRows.length;
  const truncated = limit !== null && totalRows > limit;
  const rowsToProcess = truncated ? sourceRows.slice(0, limit) : sourceRows;

  // Build a case-insensitive lookup map from source header → canonical field
  const headerToCanonical = new Map<string, keyof CanonicalRow>();
  for (const h of sourceHeaders) {
    const key = h.trim().toLowerCase();
    const canonical = sourceMap[key];
    if (canonical) headerToCanonical.set(h, canonical);
  }

  // Detect unmapped source fields
  const mappedSourceFields = new Set(headerToCanonical.keys());
  const unmappedSourceFields = sourceHeaders.filter((h) => !mappedSourceFields.has(h));

  if (unmappedSourceFields.length > 0) {
    warnings.push(
      `${unmappedSourceFields.length} source column(s) could not be mapped and will be dropped: ${unmappedSourceFields.slice(0, 5).join(", ")}${unmappedSourceFields.length > 5 ? "…" : ""}.`
    );
  }

  // Warn about important target fields that won't be populated
  const targetCanonicalFields = new Set(
    targetSpec.headers.map((h) => {
      const key = h.trim().toLowerCase();
      // find canonical fields that map TO this target header
      for (const [_src, canon] of Object.entries(sourceMap)) {
        void _src;
        void canon;
      }
      return key;
    })
  );
  void targetCanonicalFields;

  // Convert rows
  const convertedRows: CsvRow[] = rowsToProcess.map((srcRow) => {
    // Build canonical row
    const canonical: CanonicalRow = {};
    for (const [srcHeader, canonField] of headerToCanonical.entries()) {
      const val = srcRow[srcHeader];
      if (val !== undefined) {
        (canonical as Record<string, string>)[canonField] = val;
      }
    }
    // Map canonical → target
    return targetSpec.fromCanonical(canonical);
  });

  if (truncated) {
    warnings.push(
      `Only the first ${limit} rows were converted (${totalRows} total). Upgrade your plan to convert larger files.`
    );
  }

  return {
    headers: targetSpec.headers,
    rows: convertedRows,
    warnings,
    rowsProcessed: rowsToProcess.length,
    rowsTotal: totalRows,
    truncated,
    unmappedSourceFields,
  };
}
