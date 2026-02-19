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
};
