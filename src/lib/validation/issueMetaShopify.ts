// src/lib/validation/issueMetaShopify.ts
import type { IssueMetaMap } from "./issueMeta";

export const SHOPIFY_ISSUE_META: IssueMetaMap = {
  "shopify/missing_required_header": {
    code: "shopify/missing_required_header",
    title: "Missing required column",
    explanation: "Your CSV is missing a column Shopify expects for product imports/updates.",
    whyPlatformCares: "Shopify maps fields by header name. Missing required columns can block imports or updates.",
    howToFix: "Add the missing column header exactly as Shopify expects. Values can be blank if not needed yet.",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/blank_title": {
    code: "shopify/blank_title",
    title: "Blank Title",
    explanation: "A row is missing the product Title.",
    whyPlatformCares: "Shopify requires Title to create/import products.",
    howToFix: "Fill Title with the product name.",
    category: "structure",
    blocking: true,
  },

  "shopify/blank_handle": {
    code: "shopify/blank_handle",
    title: "Blank URL handle",
    explanation: "A row has an empty URL handle (Handle). Handles group variants and identify products.",
    whyPlatformCares: "Shopify uses URL handle to identify and update products, and to group variants.",
    howToFix: "Fill URL handle (letters, numbers, dashes; no spaces). For variants, all rows share the same handle.",
    category: "variant",
    blocking: true,
    autoFixable: true, // we can generate from Title
  },

  "shopify/invalid_handle": {
    code: "shopify/invalid_handle",
    title: "Invalid URL handle",
    explanation: "URL handle contains invalid characters (e.g., spaces).",
    whyPlatformCares: "Handles are used in URLs and must be URL-safe.",
    howToFix: "Use only letters, numbers, and dashes. No spaces.",
    category: "variant",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_boolean_published": {
    code: "shopify/invalid_boolean_published",
    title: "Invalid Published value",
    explanation: "Published on online store must be true or false.",
    whyPlatformCares: "Shopify rejects invalid boolean values in boolean columns.",
    howToFix: 'Set Published on online store to "true" or "false".',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_boolean_continue_selling": {
    code: "shopify/invalid_boolean_continue_selling",
    title: "Invalid Continue selling value",
    explanation: "Continue selling when out of stock must be true or false.",
    whyPlatformCares: "Shopify needs a valid boolean to interpret overselling behavior.",
    howToFix: 'Set Continue selling when out of stock to "true" or "false".',
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_status": {
    code: "shopify/invalid_status",
    title: "Invalid Status",
    explanation: "Status must be active, draft, or archived.",
    whyPlatformCares: "Shopify only supports these values in the Status column.",
    howToFix: "Change Status to active, draft, or archived.",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_numeric_price": {
    code: "shopify/invalid_numeric_price",
    title: "Invalid Price",
    explanation: "Price must be a numeric value.",
    whyPlatformCares: "Shopify rejects non-numeric pricing values.",
    howToFix: "Use numbers like 19.99 (avoid currency symbols).",
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_numeric_compare_at": {
    code: "shopify/invalid_numeric_compare_at",
    title: "Invalid Compare-at price",
    explanation: "Compare-at price must be a numeric value.",
    whyPlatformCares: "Shopify rejects non-numeric pricing values.",
    howToFix: "Use numbers like 29.99 (avoid currency symbols).",
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/compare_at_less_than_price": {
    code: "shopify/compare_at_less_than_price",
    title: "Compare-at price looks wrong",
    explanation: "Compare-at price is less than price, which is usually the reverse for a sale.",
    whyPlatformCares: "Not always rejected, but commonly indicates a pricing mistake.",
    howToFix: "Set Compare-at price higher than Price (or leave it blank if not used).",
    category: "pricing",
    blocking: false,
  },

  "shopify/invalid_integer_inventory_qty": {
    code: "shopify/invalid_integer_inventory_qty",
    title: "Invalid Inventory quantity",
    explanation: "Inventory quantity must be a whole number.",
    whyPlatformCares: "Shopify expects integer stock values in this column.",
    howToFix: "Use whole numbers like 0, 5, 12.",
    category: "inventory",
    blocking: true,
  },

  "shopify/negative_inventory_qty": {
    code: "shopify/negative_inventory_qty",
    title: "Negative inventory quantity",
    explanation: "Inventory is negative.",
    whyPlatformCares: "Not always rejected, but often indicates an inventory sync issue.",
    howToFix: "Double-check whether negative stock is intended for your workflow.",
    category: "inventory",
    blocking: false,
  },

  "shopify/invalid_image_url": {
    code: "shopify/invalid_image_url",
    title: "Invalid image URL",
    explanation: "Image URL must be a valid http(s) URL.",
    whyPlatformCares: "Shopify imports images by downloading them from public URLs.",
    howToFix: "Use a publicly accessible https:// image URL.",
    category: "images",
    blocking: true,
  },

  "shopify/invalid_image_position": {
    code: "shopify/invalid_image_position",
    title: "Invalid image position",
    explanation: "Image position should be a positive integer (1, 2, 3...).",
    whyPlatformCares: "Position controls ordering; invalid values can cause confusing results.",
    howToFix: "Use 1, 2, 3... or leave blank.",
    category: "images",
    blocking: false,
  },

  "shopify/option_order_invalid": {
    code: "shopify/option_order_invalid",
    title: "Option order invalid",
    explanation: "Option2 requires Option1; Option3 requires Option2.",
    whyPlatformCares: "Variant option data depends on previous option columns.",
    howToFix: "Fill Option1 name/value before Option2, and Option2 before Option3.",
    category: "variant",
    blocking: true,
  },

  "shopify/variant_option_missing_value": {
    code: "shopify/variant_option_missing_value",
    title: "Option name missing a value",
    explanation: "An option name is present but its value is blank.",
    whyPlatformCares: "Blank option values can create confusing variants or defaults.",
    howToFix: "Fill the corresponding Option value (e.g., Size = Small).",
    category: "variant",
    blocking: false,
  },

  "shopify/duplicate_handle_not_variants": {
    code: "shopify/duplicate_handle_not_variants",
    title: "Duplicate handle rows look identical",
    explanation: "Multiple rows share the same handle and appear to repeat identical variant details.",
    whyPlatformCares: "This can cause overwrites or duplicate variants during import.",
    howToFix: "Ensure variants differ by option values/SKU, or make extra rows image-only rows.",
    category: "variant",
    blocking: false,
  },

  "shopify/seo_title_too_long": {
    code: "shopify/seo_title_too_long",
    title: "SEO title too long",
    explanation: "SEO titles are commonly recommended to stay within ~70 characters.",
    whyPlatformCares: "Long titles may be truncated in search results.",
    howToFix: "Shorten the SEO title.",
    category: "seo",
    blocking: false,
  },

  "shopify/seo_description_too_long": {
    code: "shopify/seo_description_too_long",
    title: "SEO description too long",
    explanation: "SEO descriptions are commonly recommended to stay within ~320 characters.",
    whyPlatformCares: "Long descriptions may be truncated in search results.",
    howToFix: "Shorten the SEO description.",
    category: "seo",
    blocking: false,
  },

  "shopify/seo_title_missing": {
    code: "shopify/seo_title_missing",
    title: "SEO title missing",
    explanation: "SEO title is blank (Shopify will fall back to Title).",
    whyPlatformCares: "Optional optimization for better search snippets.",
    howToFix: "Optional: add a custom SEO title.",
    category: "seo",
    blocking: false,
  },

  "shopify/seo_description_missing": {
    code: "shopify/seo_description_missing",
    title: "SEO description missing",
    explanation: "SEO description is blank (Shopify will fall back to Description).",
    whyPlatformCares: "Optional optimization for better search snippets.",
    howToFix: "Optional: add a custom SEO description.",
    category: "seo",
    blocking: false,
  },
};
