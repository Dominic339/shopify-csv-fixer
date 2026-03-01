// src/lib/validation/issueMetaWooCommerce.ts
import type { IssueMetaMap } from "./issueMeta";

export const WOOCOMMERCE_ISSUE_META: IssueMetaMap = {
  "woocommerce/missing_required_header": {
    code: "woocommerce/missing_required_header",
    title: "Missing required column",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "One or more required WooCommerce import columns are missing from the header row.",
    whyPlatformCares: "WooCommerce relies on specific column names to map fields during import.",
    howToFix: "Export a fresh WooCommerce sample CSV and ensure all required columns are present and spelled exactly.",
  },

  "woocommerce/unknown_header": {
    code: "woocommerce/unknown_header",
    title: "Unknown column",
    category: "structure",
    blocking: false,
    autoFixable: false,
    explanation: "This column is not recognized by the WooCommerce importer.",
    whyPlatformCares: "Unknown columns are ignored and can hide data issues.",
    howToFix: "Remove the column or rename it to a supported WooCommerce import header.",
  },

  "woocommerce/missing_type": {
    code: "woocommerce/missing_type",
    title: "Missing product type",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "The Type column is required and determines how the row is interpreted.",
    whyPlatformCares: "WooCommerce uses Type to decide whether a row is a product, variation, or parent grouping.",
    howToFix: "Set Type to simple, variable, variation, grouped, or external for each row.",
  },

  "woocommerce/invalid_type": {
    code: "woocommerce/invalid_type",
    title: "Invalid product type",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "The Type value is not one of WooCommerce's supported types.",
    whyPlatformCares: "Invalid types can cause rows to import incorrectly or be rejected.",
    howToFix: "Use one of: simple, variable, variation, grouped, external.",
  },

  "woocommerce/missing_name": {
    code: "woocommerce/missing_name",
    title: "Missing product name",
    category: "compliance",
    blocking: true,
    autoFixable: false,
    explanation: "Non-variation product rows should have a Name.",
    whyPlatformCares: "Products without names are not usable in the storefront.",
    howToFix: "Provide a Name for all non-variation rows.",
  },

  "woocommerce/variation_missing_parent": {
    code: "woocommerce/variation_missing_parent",
    title: "Variation missing parent linkage",
    category: "variant",
    blocking: true,
    autoFixable: true,
    explanation: "Variation rows must link to a parent variable product using the Parent field.",
    whyPlatformCares: "Orphaned variations cannot be imported correctly.",
    howToFix: "Set Parent to the parent product's ID (or enable auto-create parents in the Variable import preset).",
  },

  "woocommerce/variation_missing_attributes": {
    code: "woocommerce/variation_missing_attributes",
    title: "Variation missing attributes",
    category: "attributes",
    blocking: true,
    autoFixable: false,
    explanation: "Variation rows need attribute name/value pairs to form a valid variation combination.",
    whyPlatformCares: "Without attributes, WooCommerce cannot build a distinct variation.",
    howToFix: "Fill Attribute name and Attribute value for variation rows.",
  },

  "woocommerce/duplicate_variation_combo": {
    code: "woocommerce/duplicate_variation_combo",
    title: "Duplicate variation combination",
    category: "variant",
    blocking: false,
    autoFixable: false,
    explanation: "Two or more variations under the same parent share the same attribute combination.",
    whyPlatformCares: "Duplicate combinations can overwrite each other or cause unexpected merges.",
    howToFix: "Ensure each variation has a unique attribute value combination under its parent.",
  },

  "woocommerce/missing_sku": {
    code: "woocommerce/missing_sku",
    title: "Missing SKU",
    category: "sku",
    blocking: false,
    autoFixable: false,
    explanation: "A missing SKU reduces update reliability and can break inventory tracking.",
    whyPlatformCares: "SKUs are used for matching, updates, and integrations.",
    howToFix: "Provide a unique SKU for each product/variation where possible.",
  },

  "woocommerce/duplicate_sku": {
    code: "woocommerce/duplicate_sku",
    title: "Duplicate SKU risk",
    category: "sku",
    blocking: false,
    autoFixable: false,
    explanation: "Two or more rows share the same SKU.",
    whyPlatformCares: "During import, duplicate SKUs can overwrite existing products or attach data to the wrong item.",
    howToFix: "Make SKUs unique. If you need duplicates intentionally, split catalogs or use a consistent parent/child strategy.",
  },

  "woocommerce/invalid_regular_price": {
    code: "woocommerce/invalid_regular_price",
    title: "Invalid regular price",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "Regular price must be a valid number.",
    whyPlatformCares: "Invalid price values cause import failures or incorrect storefront pricing.",
    howToFix: "Use numeric values like 19.99 (no currency symbols).",
  },

  "woocommerce/invalid_sale_price": {
    code: "woocommerce/invalid_sale_price",
    title: "Invalid sale price",
    category: "pricing",
    blocking: false,
    autoFixable: false,
    explanation: "Sale price must be a valid number.",
    whyPlatformCares: "Invalid sale price may be ignored or cause pricing issues.",
    howToFix: "Use numeric values like 14.99 (no currency symbols).",
  },

  "woocommerce/missing_image": {
    code: "woocommerce/missing_image",
    title: "Missing image",
    category: "media",
    blocking: false,
    autoFixable: false,
    explanation: "This product row has no image URL.",
    whyPlatformCares: "Imports can succeed without images, but missing images reduce listing quality and conversions.",
    howToFix: "Provide an Images URL (or multiple URLs separated by commas) for products.",
  },

  "woocommerce/invalid_bool": {
    code: "woocommerce/invalid_bool",
    title: "Invalid boolean value",
    category: "structure",
    blocking: false,
    autoFixable: true,
    explanation: "Boolean fields like Published, In stock?, and Is featured? expect 1/0 or true/false values.",
    whyPlatformCares: "WooCommerce's importer may interpret unexpected values incorrectly, causing products to be hidden or misconfigured.",
    howToFix: "Use 1 (yes/true) or 0 (no/false). We can normalize common variants (yes, no, true, false) automatically.",
  },

  "woocommerce/invalid_price": {
    code: "woocommerce/invalid_price",
    title: "Invalid price value",
    category: "pricing",
    blocking: false,
    autoFixable: false,
    explanation: "A price field contains a non-numeric value.",
    whyPlatformCares: "WooCommerce expects plain decimal prices. Currency symbols or text cause import failures or zero prices.",
    howToFix: "Use plain decimals like 19.99 (no currency symbols, commas, or text).",
  },

  "woocommerce/invalid_int": {
    code: "woocommerce/invalid_int",
    title: "Invalid integer value",
    category: "inventory",
    blocking: false,
    autoFixable: false,
    explanation: "An integer field (like Stock) contains a non-integer value.",
    whyPlatformCares: "WooCommerce expects whole numbers for stock quantities. Decimal values may be truncated or rejected.",
    howToFix: "Use a whole number like 0, 5, or 12.",
  },

  "woocommerce/invalid_visibility": {
    code: "woocommerce/invalid_visibility",
    title: "Invalid visibility value",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "Visibility in catalog must be one of the four accepted values.",
    whyPlatformCares: "An unrecognized visibility value may cause the product to default to visible or fail to import.",
    howToFix: "Use one of: visible, catalog, search, or hidden.",
  },

  "woocommerce/invalid_image_url": {
    code: "woocommerce/invalid_image_url",
    title: "Invalid image URL",
    category: "media",
    blocking: false,
    autoFixable: false,
    explanation: "One or more image URLs in the Images column are not valid http(s) URLs.",
    whyPlatformCares: "WooCommerce fetches images from the provided URLs during import. Invalid URLs result in products without images.",
    howToFix: "Use full https:// URLs separated by commas. Ensure images are publicly accessible.",
  },

  "woocommerce/sale_price_not_lower": {
    code: "woocommerce/sale_price_not_lower",
    title: "Sale price not lower than regular price",
    category: "pricing",
    blocking: false,
    autoFixable: false,
    explanation: "The Sale price should be less than the Regular price for the discount to be meaningful.",
    whyPlatformCares: "WooCommerce may display both prices as a crossed-out/sale pair. If sale price equals or exceeds regular price, it creates confusing or incorrect pricing display.",
    howToFix: "Set Sale price to a value lower than Regular price, or clear the Sale price field.",
  },
};
