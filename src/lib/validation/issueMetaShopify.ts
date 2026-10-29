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
    whyPlatformCares: "Shopify expects true or false (or blank). Invalid values can block import.",
    howToFix: "Use true or false, or leave it blank.",
    category: "compliance",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_status": {
    code: "shopify/invalid_status",
    title: "Invalid Status value",
    explanation: "Status is not one of active, draft or archived.",
    whyPlatformCares: "Unexpected status values can cause Shopify to ignore or misinterpret a row.",
    howToFix: 'Use "active", "draft" or "archived" (or leave blank).',
    category: "compliance",
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
    whyPlatformCares: "Why this matters: Shopify merges variants with identical option combinations. This may cause data loss or variant overwrites.",
    howToFix: "Make each variant option combination unique (or remove duplicates).",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/missing_option1_for_variant_data": {
    code: "shopify/missing_option1_for_variant_data",
    title: "Missing Option1 value for variant",
    explanation: "This row looks like variant data but Option1 value is blank.",
    whyPlatformCares:
      "Shopify uses option values to create variant combinations. Missing option values can cause the row to be rejected or imported incorrectly.",
    howToFix: "Fill in Option1 value (or remove variant-only fields from this row).",
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
    checked: false,
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
    whyPlatformCares: "Shopify imports a blank price as 0.00, so the variant would be sold for free.",
    howToFix: "Fill Price with a number like 19.99, unless the variant really is free.",
    category: "pricing",
    blocking: false,
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
    checked: false,
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
    checked: false,
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
    checked: false,
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
    checked: false,
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
    checked: false,
    title: "Unusual Status value",
    explanation: "Status has a value outside Shopify's common values.",
    whyPlatformCares: "Unexpected values may be ignored or produce confusing results.",
    howToFix: 'Use "Active", "Draft", or "Archived" (or leave blank).',
    category: "compliance",
    blocking: false,
    autoFixable: false,
  },

  "shopify/missing_status_value": {
    code: "shopify/missing_status_value",
    title: "Missing Status",
    explanation: "The Status column is present but the product row has no value.",
    whyPlatformCares:
      "Shopify requires a Status value on every product row when the column is included.",
    howToFix: "Set Status to active, draft, or archived.",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/handle_generated_column": {
    code: "shopify/handle_generated_column",
    title: "URL handles generated",
    explanation: "The file had no URL handle column, so handles were created from each Title.",
    whyPlatformCares:
      "Shopify matches existing products by URL handle. Without the real handles, an update creates new products instead.",
    howToFix: "If you are updating products, add a URL handle column with their existing handles.",
    category: "structure",
    blocking: false,
    autoFixable: true,
  },

  "shopify/handle_rewritten": {
    code: "shopify/handle_rewritten",
    title: "URL handle changed",
    explanation: "A URL handle contained characters Shopify does not allow and was rewritten.",
    whyPlatformCares:
      "Shopify matches existing products by URL handle, so a changed handle is imported as a new product.",
    howToFix: "Check that the new handle matches the product in Shopify if you are updating it.",
    category: "structure",
    blocking: false,
    autoFixable: true,
  },

  "shopify/image_url_not_https": {
    code: "shopify/image_url_not_https",
    title: "Image URL uses http",
    explanation: "An image URL starts with http:// instead of https://.",
    whyPlatformCares:
      "Shopify downloads images from publicly accessible https:// URLs; plain http links can fail.",
    howToFix: "Use the https:// address of the image if your host supports it.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_charge_tax": {
    code: "shopify/invalid_charge_tax",
    title: "Invalid Charge tax",
    explanation: "Charge tax is not true or false.",
    whyPlatformCares:
      "Shopify only accepts true or false for Charge tax.",
    howToFix: "Change the value to true or false.",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_requires_shipping": {
    code: "shopify/invalid_requires_shipping",
    title: "Invalid Requires shipping",
    explanation: "Requires shipping is not true or false.",
    whyPlatformCares:
      "Shopify only accepts true or false for Requires shipping.",
    howToFix: "Change the value to true or false.",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_gift_card": {
    code: "shopify/invalid_gift_card",
    title: "Invalid Gift card",
    explanation: "Gift card is not true or false.",
    whyPlatformCares:
      "Shopify only accepts true or false for Gift card.",
    howToFix: "Change the value to true or false.",
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/gift_card_import": {
    code: "shopify/gift_card_import",
    title: "Gift card in CSV",
    explanation: "A row is marked as a gift card.",
    whyPlatformCares:
      "Shopify cannot create gift card products from a CSV import.",
    howToFix: "Create gift card products in the Shopify admin instead.",
    category: "compliance",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_numeric_cost": {
    code: "shopify/invalid_numeric_cost",
    title: "Invalid Cost per item",
    explanation: "Cost per item is not a valid number.",
    whyPlatformCares:
      "Shopify needs a plain number (no currency symbol) for cost.",
    howToFix: "Use a number like 7.50.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_weight": {
    code: "shopify/invalid_weight",
    title: "Invalid weight",
    explanation: "Weight value (grams) is not a whole number of grams.",
    whyPlatformCares:
      "Shopify stores weight in grams without decimals or units.",
    howToFix: "Enter grams only, e.g. 1.5 kg = 1500.",
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_weight_unit": {
    code: "shopify/invalid_weight_unit",
    title: "Invalid weight unit",
    explanation: "Weight unit for display is not g, kg, lb, or oz.",
    whyPlatformCares:
      "Shopify only accepts g, kg, lb, or oz as the display unit.",
    howToFix: "Use g, kg, lb, or oz.",
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_inventory_tracker": {
    code: "shopify/invalid_inventory_tracker",
    title: "Invalid inventory tracker",
    explanation: "Inventory tracker has a value Shopify does not recognise.",
    whyPlatformCares:
      "Shopify accepts shopify, shipwire, amazon_marketplace_web, or blank for untracked inventory.",
    howToFix: "Use shopify to track inventory, or leave it blank.",
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_fulfillment_service": {
    code: "shopify/invalid_fulfillment_service",
    title: "Invalid fulfillment service",
    explanation: "Fulfillment service is not a valid service handle.",
    whyPlatformCares:
      "Shopify expects manual or the handle of a fulfillment service set up in your admin (lowercase, dashes).",
    howToFix: "Use manual, or your custom service's handle.",
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/product_category_looks_like_google": {
    code: "shopify/product_category_looks_like_google",
    title: "Product category looks like a Google id",
    explanation: "Product category contains only digits, like a Google product category id.",
    whyPlatformCares:
      "Shopify's Product category uses Shopify's own taxonomy; Google category ids belong in a separate column.",
    howToFix: "Use a Shopify taxonomy path or id, and move Google ids to “Google Shopping / Google product category”.",
    category: "structure",
    blocking: false,
    autoFixable: false,
  },

  "shopify/packed_dimensions_incomplete": {
    code: "shopify/packed_dimensions_incomplete",
    title: "Packed dimensions incomplete",
    explanation: "Only some of the packed product length, width, height, and unit are filled in.",
    whyPlatformCares:
      "Shopify rejects a row where only part of the packed dimensions are set.",
    howToFix: "Fill all four packed product fields, or clear all four.",
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/too_many_tags": {
    code: "shopify/too_many_tags",
    title: "Too many tags",
    explanation: "A product has more than 250 tags.",
    whyPlatformCares:
      "Shopify allows at most 250 tags per product.",
    howToFix: "Remove tags until there are 250 or fewer.",
    category: "seo",
    blocking: true,
    autoFixable: false,
  },
};
