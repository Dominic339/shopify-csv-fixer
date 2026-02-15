// src/lib/validation/issueMetaShopify.ts
import type { IssueMetaMap } from "./issueMeta";

export const SHOPIFY_ISSUE_META: IssueMetaMap = {
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
    title: "Missing Handle",
    explanation: "URL handle is blank on at least one row.",
    whyPlatformCares:
      "Handles are used to group variants/images and to update existing products. Missing handles can break variant grouping and updates.",
    howToFix: "Fill URL handle using letters/numbers/dashes (no spaces).",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_handle": {
    code: "shopify/invalid_handle",
    title: "Invalid Handle",
    explanation: "URL handle contains invalid characters (often spaces).",
    whyPlatformCares:
      "Shopify requires handles to be URL-safe. Spaces and invalid characters can cause import failures or weird URL behavior.",
    howToFix: "Use only letters, numbers, and dashes (no spaces).",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_boolean_published": {
    code: "shopify/invalid_boolean_published",
    title: "Invalid Published value",
    explanation: 'Published must be TRUE or FALSE (Shopify template).',
    whyPlatformCares:
      "Shopify parses Published as a boolean. Invalid values can fail import or mis-publish products.",
    howToFix: 'Change Published to TRUE or FALSE.',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_inventory_policy": {
    code: "shopify/invalid_inventory_policy",
    title: "Invalid inventory policy",
    explanation: 'Continue selling when out of stock must be "deny" or "continue".',
    whyPlatformCares:
      "Shopify expects a specific inventory policy value. Invalid values can cause import errors or incorrect oversell behavior.",
    howToFix: 'Use "deny" (stop selling) or "continue" (allow selling when out of stock).',
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_numeric_price": {
    code: "shopify/invalid_numeric_price",
    title: "Invalid Price",
    explanation: "Price is not a valid number.",
    whyPlatformCares:
      "Shopify requires numeric pricing. Non-numeric values commonly cause import failures.",
    howToFix: 'Use a number like "19.99" (no currency symbols).',
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_numeric_compare_at": {
    code: "shopify/invalid_numeric_compare_at",
    title: "Invalid Compare-at price",
    explanation: "Compare-at price is not a valid number.",
    whyPlatformCares:
      "Shopify requires numeric pricing. Non-numeric values in compare-at fields can cause import failures.",
    howToFix: 'Use a number like "29.99" (no currency symbols).',
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/compare_at_lt_price": {
    code: "shopify/compare_at_lt_price",
    title: "Compare-at price lower than price",
    explanation: "Compare-at price is less than price.",
    whyPlatformCares:
      "This usually indicates incorrect sale pricing. Shopify may still import it, but it’s often unintended.",
    howToFix: "Set Compare-at price higher than Price when showing a discount.",
    category: "pricing",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_integer_inventory_qty": {
    code: "shopify/invalid_integer_inventory_qty",
    title: "Invalid inventory quantity",
    explanation: "Inventory quantity is not a whole number.",
    whyPlatformCares:
      "Shopify inventory quantities should be integers. Non-integers can cause import errors.",
    howToFix: "Use whole numbers like 0, 10, 50.",
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/negative_inventory": {
    code: "shopify/negative_inventory",
    title: "Negative inventory quantity",
    explanation: "Inventory quantity is negative.",
    whyPlatformCares:
      "Negative inventory can be valid in some workflows but often indicates a mistake.",
    howToFix: "Double-check the quantity. Set to 0+ if appropriate.",
    category: "inventory",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_image_url": {
    code: "shopify/invalid_image_url",
    title: "Invalid image URL",
    explanation: "Product image URL is not a valid http(s) URL.",
    whyPlatformCares:
      "Shopify requires publicly accessible image URLs. Invalid URLs cause images to fail import.",
    howToFix: "Use a publicly accessible https:// image URL.",
    category: "images",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_image_position": {
    code: "shopify/invalid_image_position",
    title: "Invalid image position",
    explanation: "Image position is not a positive integer.",
    whyPlatformCares:
      "Shopify uses Image position to order product images. Invalid values may be ignored.",
    howToFix: "Use 1, 2, 3…",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/option_order_invalid": {
    code: "shopify/option_order_invalid",
    title: "Invalid option order",
    explanation: "Option2 requires Option1; Option3 requires Option2.",
    whyPlatformCares:
      "Shopify expects options to be defined in order. Out-of-order options can break variants.",
    howToFix: "Fill Option1 before Option2, and Option2 before Option3.",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/variant_option_missing_value": {
    code: "shopify/variant_option_missing_value",
    title: "Option name missing value",
    explanation: "An option name exists but its corresponding value is blank.",
    whyPlatformCares:
      "Variant differentiation depends on option values. Missing values can cause duplicates or invalid variants.",
    howToFix: "Fill the option value (e.g., Size = Small).",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/duplicate_handle_not_variants": {
    code: "shopify/duplicate_handle_not_variants",
    title: "Duplicate handle row",
    explanation: "Multiple rows share a handle with identical variant details.",
    whyPlatformCares:
      "Duplicate variant rows can cause duplicate variants or unexpected overwrites.",
    howToFix:
      "If these are variants, ensure option values/SKU differ. If these are extra images, keep only handle + image fields on additional rows.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_title_too_long": {
    code: "shopify/seo_title_too_long",
    title: "SEO title too long",
    explanation: "SEO title exceeds recommended length.",
    whyPlatformCares:
      "Search engines may truncate long titles in results.",
    howToFix: "Shorten SEO title (recommended ≤ 70 chars).",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_description_too_long": {
    code: "shopify/seo_description_too_long",
    title: "SEO description too long",
    explanation: "SEO description exceeds recommended length.",
    whyPlatformCares:
      "Search engines may truncate long descriptions in results.",
    howToFix: "Shorten SEO description (recommended ≤ 320 chars).",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_title_missing": {
    code: "shopify/seo_title_missing",
    title: "SEO title missing",
    explanation: "SEO title is blank; Shopify will fall back to Title.",
    whyPlatformCares:
      "You may miss the chance to optimize search snippet wording.",
    howToFix: "Optional: provide a custom SEO title.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_description_missing": {
    code: "shopify/seo_description_missing",
    title: "SEO description missing",
    explanation: "SEO description is blank; Shopify will fall back to Description.",
    whyPlatformCares:
      "You may miss the chance to optimize search snippet wording.",
    howToFix: "Optional: add an SEO description.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/missing_status_value": {
    code: "shopify/missing_status_value",
    title: "Missing Status value",
    explanation: "Status column exists but Status is blank on one or more rows.",
    whyPlatformCares:
      "When the Status column is included, Shopify expects a valid status value.",
    howToFix: 'Set Status to "active", "draft", or "archived" on each product row.',
    category: "structure",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_status": {
    code: "shopify/invalid_status",
    title: "Invalid Status",
    explanation: "Status must be active, draft, or archived.",
    whyPlatformCares:
      "Shopify only recognizes these values for Status in the product CSV.",
    howToFix: 'Use "active", "draft", or "archived".',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_inventory_tracker": {
    code: "shopify/invalid_inventory_tracker",
    title: "Invalid Inventory tracker",
    explanation: "Inventory tracker is not a supported value.",
    whyPlatformCares:
      "Shopify supports a limited set of inventory trackers in CSV import.",
    howToFix: 'Use "shopify", "shipwire", "amazon_marketplace_web", or leave blank.',
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_weight_unit": {
    code: "shopify/invalid_weight_unit",
    title: "Invalid Weight unit",
    explanation: "Weight unit must be g, kg, lb, or oz.",
    whyPlatformCares:
      "Shopify uses standardized units for shipping and fulfillment calculations.",
    howToFix: "Use one of: g, kg, lb, oz.",
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_requires_shipping": {
    code: "shopify/invalid_requires_shipping",
    title: "Invalid Requires shipping",
    explanation: "Requires shipping must be TRUE or FALSE.",
    whyPlatformCares:
      "Shopify uses this to determine whether a variant requires shipping.",
    howToFix: 'Use "true" or "false".',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_charge_tax": {
    code: "shopify/invalid_charge_tax",
    title: "Invalid Charge tax",
    explanation: "Charge tax must be TRUE or FALSE.",
    whyPlatformCares:
      "Shopify uses this to determine whether tax is charged for the product/variant.",
    howToFix: 'Use "true" or "false".',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_gift_card": {
    code: "shopify/invalid_gift_card",
    title: "Invalid Gift card",
    explanation: "Gift card must be TRUE or FALSE.",
    whyPlatformCares:
      "Shopify uses this flag to treat items as gift cards.",
    howToFix: 'Use "true" or "false".',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/missing_option1_for_variant_data": {
    code: "shopify/missing_option1_for_variant_data",
    title: "Missing Option1 for variant data",
    explanation: "Variant data exists on a row but Option1 name/value are missing.",
    whyPlatformCares:
      "Shopify can mis-handle variants if option columns are missing when variant fields are present.",
    howToFix: "Include Option1 name and Option1 value on variant rows.",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/options_not_unique": {
    code: "shopify/options_not_unique",
    title: "Variant options not unique",
    explanation: "Two or more variants for the same product have identical option values.",
    whyPlatformCares:
      "Shopify requires each variant option combination to be unique.",
    howToFix: "Make each variant option combination unique (Option1/2/3 values).",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/blank_price": {
    code: "shopify/blank_price",
    title: "Missing Price",
    explanation: "A variant row is missing a Price.",
    whyPlatformCares:
      "Shopify requires a price for variants when creating products.",
    howToFix: "Fill Price with a number like 19.99.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/duplicate_sku": {
    code: "shopify/duplicate_sku",
    title: "Duplicate SKU",
    explanation: "The same SKU appears on multiple rows.",
    whyPlatformCares:
      "Many inventory/fulfillment workflows expect unique SKUs per variant.",
    howToFix: "Make SKUs unique per variant (or leave blank if you don’t use SKUs).",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/image_alt_text_too_long": {
    code: "shopify/image_alt_text_too_long",
    title: "Image alt text too long",
    explanation: "Image alt text exceeds Shopify's recommended limit.",
    whyPlatformCares:
      "Overly long alt text may be truncated or cause formatting issues.",
    howToFix: "Shorten alt text to 512 characters or fewer.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  // NEW: Shopify group sanity checks
  "shopify/option_name_inconsistent": {
    code: "shopify/option_name_inconsistent",
    title: "Option names differ across variants",
    explanation: "Option1/Option2/Option3 names should be consistent across all rows that share a handle.",
    whyPlatformCares:
      "Inconsistent option names can cause variants to import incorrectly or appear mis-grouped.",
    howToFix: "Use the same Option1/Option2/Option3 names for every variant row under the same handle.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/mixed_default_title_with_options": {
    code: "shopify/mixed_default_title_with_options",
    title: 'Mixed "Default Title" with real options',
    explanation: 'A handle includes both "Default Title" rows and option-based variant rows.',
    whyPlatformCares:
      "This usually indicates accidental mixing of single-variant and multi-variant product structures.",
    howToFix:
      'Use "Default Title" only when the product has a single variant. For multi-variant products, use real option values (Size/Color/etc) on every variant row.',
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  "shopify/image_row_has_variant_fields": {
    code: "shopify/image_row_has_variant_fields",
    title: "Image-only row contains variant fields",
    explanation: "An image-only row should not include SKU/Price/Options/Inventory fields.",
    whyPlatformCares:
      "Extra image rows are intended to attach additional images to an existing product/variant grouping.",
    howToFix:
      "Move variant fields to the main product/variant rows. Keep only handle + image fields on extra image rows.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/duplicate_image_position": {
    code: "shopify/duplicate_image_position",
    title: "Duplicate image position",
    explanation: "Multiple image rows under the same handle share the same Image position value.",
    whyPlatformCares:
      "Image position controls ordering; duplicates can lead to unpredictable ordering.",
    howToFix: "Use unique Image position values per handle (1, 2, 3, ...).",
    category: "images",
    blocking: false,
    autoFixable: false,
  },
};
