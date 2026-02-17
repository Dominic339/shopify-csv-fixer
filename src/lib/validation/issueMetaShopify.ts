// src/lib/validation/issueMetaShopify.ts
import type { IssueMetaMap } from "./issueMeta";

/**
 * Shopify issue metadata used to power:
 * - Better issue titles/explanations in the UI
 * - Grouping/scoring/readiness summaries
 *
 * Keep this map in sync with the issue codes emitted from:
 * - src/lib/shopifyBasic.ts
 * - src/lib/shopifyOptimizer.ts
 * - src/lib/validation/fixAllShopify.ts
 */

export const SHOPIFY_ISSUE_META: IssueMetaMap = {
  // Structure / headers
  "shopify/missing_required_header": {
    code: "shopify/missing_required_header",
    title: "Missing required column",
    explanation: "Your CSV is missing a required Shopify column header.",
    whyPlatformCares:
      "Shopify validates column headers during import. Missing required headers can prevent Shopify from creating or updating products.",
    howToFix: "Add the missing required column header (even if values are blank).",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/blank_title": {
    code: "shopify/blank_title",
    title: "Missing Title",
    explanation: "Title is blank on at least one row.",
    whyPlatformCares:
      "Shopify requires a product Title to create products. Rows without a Title can fail import or create incomplete products.",
    howToFix: "Fill Title with the product name for each product row.",
    category: "structure",
    blocking: true,
    autoFixable: false,
  },

  "shopify/blank_handle": {
    code: "shopify/blank_handle",
    title: "Missing URL handle",
    explanation: "URL handle is blank on at least one row.",
    whyPlatformCares:
      "Shopify groups variants and images by URL handle, and uses it to update existing products. Missing handles break grouping and updates.",
    howToFix: "Fill URL handle using lowercase letters, numbers, and hyphens (no spaces).",
    category: "variant",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_handle": {
    code: "shopify/invalid_handle",
    title: "Invalid URL handle",
    explanation: "URL handle contains characters Shopify may reject.",
    whyPlatformCares: "Invalid handles can cause import errors and broken product URLs.",
    howToFix: "Use lowercase letters, numbers, and hyphens only.",
    category: "variant",
    blocking: true,
    autoFixable: true,
  },

  // Publishing / status
  "shopify/invalid_boolean_published": {
    code: "shopify/invalid_boolean_published",
    title: "Invalid Published value",
    explanation: "Published on online store has a non-boolean value.",
    whyPlatformCares: "Shopify expects TRUE/FALSE (or blank). Invalid values can block import.",
    howToFix: "Use TRUE, FALSE, or leave blank.",
    category: "publishing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_status": {
    code: "shopify/invalid_status",
    title: "Invalid Status value",
    explanation: "Status is not one of Active, Draft, Archived.",
    whyPlatformCares: "Unexpected status values can cause Shopify to ignore or misinterpret a row.",
    howToFix: 'Use "Active", "Draft", or "Archived" (or leave blank).',
    category: "publishing",
    blocking: true,
    autoFixable: true,
  },

  // Variants
  "shopify/option_order_invalid": {
    code: "shopify/option_order_invalid",
    title: "Option columns out of order",
    explanation: "Option2/Option3 has values while Option1 is blank.",
    whyPlatformCares: "Shopify expects options to be filled sequentially (Option1 then Option2 then Option3).",
    howToFix: "Fill Option1 before Option2, and Option2 before Option3.",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/variant_option_missing_value": {
    code: "shopify/variant_option_missing_value",
    title: "Option name set but value missing",
    explanation: "An option name exists but the corresponding option value is blank.",
    whyPlatformCares: "Missing option values can create invalid or confusing variants.",
    howToFix: "Fill the option value (e.g., Size = Small) or clear the option name.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/option_name_inconsistent": {
    code: "shopify/option_name_inconsistent",
    title: "Option names differ across variants",
    explanation: "Option1/2/3 names should match across rows that share a handle.",
    whyPlatformCares: "Inconsistent option names can cause variants to import incorrectly or appear mis-grouped.",
    howToFix: "Use the same Option1/Option2/Option3 names for all variant rows under the same handle.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/options_not_unique": {
    code: "shopify/options_not_unique",
    title: "Variant options not unique",
    explanation: "Two or more variants under the same handle share identical option values.",
    whyPlatformCares: "Shopify requires each option combination to be unique per product.",
    howToFix: "Make each variant option combination unique (or remove duplicates).",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/mixed_default_title_with_options": {
    code: "shopify/mixed_default_title_with_options",
    title: 'Mixed "Default Title" with real options',
    explanation: 'A handle includes both "Default Title" rows and option-based variant rows.',
    whyPlatformCares: "This usually indicates accidental mixing of single-variant and multi-variant product structures.",
    howToFix:
      'Use "Default Title" only when the product has a single variant. For multi-variant products, use real option values on every variant row.',
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/duplicate_handle_not_variants": {
    code: "shopify/duplicate_handle_not_variants",
    title: "Duplicate handle rows with identical variant details",
    explanation: "Rows share the same handle and appear duplicated without being true variants.",
    whyPlatformCares: "Duplicate rows can create import confusion and unexpected overwrites.",
    howToFix:
      "If variants, ensure option values differ per row (or SKUs differ). If extra images, keep only handle + image fields on the extra rows.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/handle_title_mismatch": {
    code: "shopify/handle_title_mismatch",
    title: "Same handle with different Titles",
    explanation: "Multiple Titles are used for rows sharing the same URL handle.",
    whyPlatformCares: "Shopify groups rows by handle. Conflicting titles can cause overwrites or confusing imports.",
    howToFix: "Use a single consistent Title for all rows under the same handle.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/product_missing_variant_row": {
    code: "shopify/product_missing_variant_row",
    title: "Product has images but no variant row",
    explanation: "A handle appears to contain only image rows.",
    whyPlatformCares:
      "Shopify needs at least one main product/variant row (Title + variant fields) to create the product. Image-only rows by themselves cannot create a product.",
    howToFix:
      "Add a main row for the handle with Title and variant fields (Price/SKU/Options). Keep extra image rows after the main row.",
    category: "structure",
    blocking: true,
    autoFixable: false,
  },

  // Pricing
  "shopify/blank_price": {
    code: "shopify/blank_price",
    title: "Missing Price",
    explanation: "Price is blank on a variant row.",
    whyPlatformCares: "Shopify requires a numeric price to create variants.",
    howToFix: "Fill Price with a number like 19.99.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_numeric_price": {
    code: "shopify/invalid_numeric_price",
    title: "Invalid Price",
    explanation: "Price is not a valid number.",
    whyPlatformCares: "Shopify requires numeric values for pricing fields.",
    howToFix: "Use a number like 19.99.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_numeric_compare_at": {
    code: "shopify/invalid_numeric_compare_at",
    title: "Invalid Compare-at price",
    explanation: "Compare-at price is not a valid number.",
    whyPlatformCares: "Shopify requires numeric values for pricing fields.",
    howToFix: "Use a number like 24.99 or leave blank.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/compare_at_lt_price": {
    code: "shopify/compare_at_lt_price",
    title: "Compare-at price lower than Price",
    explanation: "Compare-at price is lower than Price.",
    whyPlatformCares: "Compare-at price is meant to represent an original higher price.",
    howToFix: "Ensure Compare-at price is ≥ Price, or leave it blank.",
    category: "pricing",
    blocking: false,
    autoFixable: false,
  },

  // Inventory
  "shopify/invalid_integer_inventory_qty": {
    code: "shopify/invalid_integer_inventory_qty",
    title: "Invalid inventory quantity",
    explanation: "Inventory quantity is not a valid integer.",
    whyPlatformCares: "Inventory quantities must be whole numbers.",
    howToFix: "Use an integer like 0, 5, 100.",
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/negative_inventory": {
    code: "shopify/negative_inventory",
    title: "Negative inventory",
    explanation: "Inventory quantity is negative.",
    whyPlatformCares: "Negative inventory is usually a data error and can create fulfillment issues.",
    howToFix: "Use 0 or a positive quantity.",
    category: "inventory",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_inventory_policy": {
    code: "shopify/invalid_inventory_policy",
    title: "Invalid inventory policy",
    explanation: "Continue selling when out of stock is not DENY/CONTINUE.",
    whyPlatformCares: "Inventory policy controls backorder behavior.",
    howToFix: 'Use "DENY" or "CONTINUE" (or leave blank).',
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  // Images
  "shopify/invalid_image_url": {
    code: "shopify/invalid_image_url",
    title: "Invalid image URL",
    explanation: "Product image URL is not a valid http(s) URL.",
    whyPlatformCares: "Shopify must be able to fetch images via a valid URL.",
    howToFix: "Use a full http(s) URL to a publicly accessible image.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_image_position": {
    code: "shopify/invalid_image_position",
    title: "Invalid image position",
    explanation: "Image position is not a valid integer.",
    whyPlatformCares: "Image position controls ordering.",
    howToFix: "Use 1, 2, 3... or leave blank.",
    category: "images",
    blocking: false,
    autoFixable: true,
  },

  "shopify/image_row_has_variant_fields": {
    code: "shopify/image_row_has_variant_fields",
    title: "Image row contains variant fields",
    explanation: "A row looks like an image-only row but includes SKU/Price/Options/Inventory fields.",
    whyPlatformCares: "This can break variant grouping and cause confusing imports.",
    howToFix: "For extra image rows, keep only handle + image fields. Move variant fields to the main row.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/duplicate_image_position": {
    code: "shopify/duplicate_image_position",
    title: "Duplicate image position",
    explanation: "Two rows share the same Image position for the same handle.",
    whyPlatformCares: "Duplicates can lead to unpredictable image ordering.",
    howToFix: "Use unique Image position values per handle (1, 2, 3...).",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/image_alt_text_too_long": {
    code: "shopify/image_alt_text_too_long",
    title: "Image alt text too long",
    explanation: "Image alt text exceeds Shopify's recommended limit.",
    whyPlatformCares: "Overly long alt text may be truncated or cause formatting issues.",
    howToFix: "Shorten alt text to 512 characters or fewer.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  // SKU
  "shopify/duplicate_sku": {
    code: "shopify/duplicate_sku",
    title: "Duplicate SKU",
    explanation: "The same SKU appears on multiple variant rows.",
    whyPlatformCares: "Many inventory and fulfillment workflows expect unique SKUs per variant.",
    howToFix: "Make SKUs unique per variant (or leave blank if you don’t use SKUs).",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/duplicate_sku_across_products": {
    code: "shopify/duplicate_sku_across_products",
    title: "Duplicate SKU across products",
    explanation: "The same SKU appears under different URL handles (different products).",
    whyPlatformCares:
      "Reusing SKUs across products can confuse inventory systems, shipping tools, and analytics.",
    howToFix: "Make SKUs unique across your catalog (recommended) or confirm reuse is intentional.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  // SEO
  "shopify/seo_title_too_long": {
    code: "shopify/seo_title_too_long",
    title: "SEO title too long",
    explanation: "SEO title exceeds recommended length.",
    whyPlatformCares: "Long titles may be truncated in search results.",
    howToFix: "Shorten SEO title to 70 characters or fewer.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_description_too_long": {
    code: "shopify/seo_description_too_long",
    title: "SEO description too long",
    explanation: "SEO description exceeds recommended length.",
    whyPlatformCares: "Long descriptions may be truncated in search snippets.",
    howToFix: "Shorten SEO description to 320 characters or fewer.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_title_missing": {
    code: "shopify/seo_title_missing",
    title: "SEO title missing",
    explanation: "SEO title is blank (Shopify will fall back to Title).",
    whyPlatformCares: "Custom SEO titles can improve click-through rate.",
    howToFix: "Optional: provide a custom SEO title.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_description_missing": {
    code: "shopify/seo_description_missing",
    title: "SEO description missing",
    explanation: "SEO description is blank (Shopify will fall back to Description).",
    whyPlatformCares: "Custom descriptions can improve click-through rate and clarity in search results.",
    howToFix: "Optional: provide a custom SEO description.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  // Strict-mode informational checks
  "shopify/vendor_missing": {
    code: "shopify/vendor_missing",
    title: "Vendor missing",
    explanation: "Vendor is blank on the main product row.",
    whyPlatformCares: "Vendor helps organize products and improves storefront filtering.",
    howToFix: "Add a Vendor/Brand value.",
    category: "structure",
    blocking: false,
    autoFixable: false,
  },

  "shopify/product_category_missing": {
    code: "shopify/product_category_missing",
    title: "Product category missing",
    explanation: "Product category is blank on the main product row.",
    whyPlatformCares: "Categories improve discovery and reporting.",
    howToFix: "Add a Product category.",
    category: "structure",
    blocking: false,
    autoFixable: false,
  },

  "shopify/tags_missing": {
    code: "shopify/tags_missing",
    title: "Tags missing",
    explanation: "Tags are blank on the main product row.",
    whyPlatformCares: "Tags can drive collections and help store search.",
    howToFix: "Add tags (comma-separated).",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/description_too_short": {
    code: "shopify/description_too_short",
    title: "Description is very short",
    explanation: "Description is present but extremely short.",
    whyPlatformCares: "Richer descriptions can improve conversion and SEO.",
    howToFix: "Consider expanding the description.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/status_unrecognized": {
    code: "shopify/status_unrecognized",
    title: "Unusual Status value",
    explanation: "Status has a value outside Shopify's common values.",
    whyPlatformCares: "Unexpected values may be ignored or produce confusing results.",
    howToFix: 'Use "Active", "Draft", or "Archived" (or leave blank).',
    category: "publishing",
    blocking: false,
    autoFixable: false,
  },
};
