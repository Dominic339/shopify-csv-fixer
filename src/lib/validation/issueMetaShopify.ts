// src/lib/validation/issueMetaShopify.ts

export type ShopifyIssueCategory =
  | "required"
  | "handle"
  | "variant"
  | "pricing"
  | "inventory"
  | "images"
  | "seo"
  | "publishing"
  | "status"
  | "other";

export type IssueMeta = {
  code: string;
  title: string;
  explanation: string;
  whyPlatformCares: string;
  howToFix: string;
  category: ShopifyIssueCategory;
  blocking: boolean;
  autoFixable: boolean;
};

export const ISSUE_META_SHOPIFY: Record<string, IssueMeta> = {
  "shopify/missing_required_header": {
    code: "shopify/missing_required_header",
    title: "Missing required column",
    explanation: "A required Shopify column is missing from the CSV.",
    whyPlatformCares:
      "Shopify requires certain columns to correctly create or update products and variants.",
    howToFix:
      "Add the missing column(s). Download the Shopify sample CSV for the correct header list.",
    category: "required",
    blocking: true,
    autoFixable: false,
  },

  "shopify/blank_title": {
    code: "shopify/blank_title",
    title: "Missing Title",
    explanation: "A product row is missing a Title.",
    whyPlatformCares:
      "Shopify needs a product title to create a product (Title can be blank only for image-only rows).",
    howToFix: "Fill Title with the product name.",
    category: "required",
    blocking: true,
    autoFixable: false,
  },

  "shopify/blank_handle": {
    code: "shopify/blank_handle",
    title: "Missing URL handle",
    explanation: "A row is missing a URL handle.",
    whyPlatformCares:
      "Shopify groups variant rows by URL handle. Missing handles can break grouping and updates.",
    howToFix:
      "Fill URL handle using lowercase letters, numbers, and hyphens (no spaces).",
    category: "handle",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_handle": {
    code: "shopify/invalid_handle",
    title: "Invalid URL handle",
    explanation: "The URL handle contains invalid characters.",
    whyPlatformCares:
      "Invalid handles can cause Shopify import errors and broken product URLs.",
    howToFix:
      "Use lowercase letters, numbers, and hyphens only (no spaces or special characters).",
    category: "handle",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_boolean_published": {
    code: "shopify/invalid_boolean_published",
    title: "Invalid Published value",
    explanation: "Published on online store has a non-boolean value.",
    whyPlatformCares:
      "Shopify expects TRUE or FALSE (or blank). Invalid values can block import.",
    howToFix: "Use TRUE, FALSE, or leave blank.",
    category: "publishing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_boolean_continue_selling": {
    code: "shopify/invalid_boolean_continue_selling",
    title: "Invalid Continue selling value",
    explanation: "Continue selling when out of stock has a non-boolean value.",
    whyPlatformCares:
      "Shopify expects DENY or CONTINUE (or boolean in some contexts). Invalid values can block import.",
    howToFix: 'Use "DENY" or "CONTINUE" (recommended), or TRUE/FALSE if your export uses that style.',
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_numeric_price": {
    code: "shopify/invalid_numeric_price",
    title: "Invalid Price",
    explanation: "Price is not a valid number.",
    whyPlatformCares:
      "Shopify requires numeric values for pricing fields.",
    howToFix: "Use a number like 19.99.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/invalid_numeric_compare_at": {
    code: "shopify/invalid_numeric_compare_at",
    title: "Invalid Compare-at price",
    explanation: "Compare-at price is not a valid number.",
    whyPlatformCares:
      "Shopify requires numeric values for pricing fields.",
    howToFix: "Use a number like 24.99 or leave blank.",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },

  "shopify/compare_at_lt_price": {
    code: "shopify/compare_at_lt_price",
    title: "Compare-at price lower than Price",
    explanation: "Compare-at price is lower than Price.",
    whyPlatformCares:
      "Compare-at price is meant to represent an original higher price (for sales).",
    howToFix:
      "Ensure Compare-at price is greater than or equal to Price, or leave it blank.",
    category: "pricing",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_integer_inventory_qty": {
    code: "shopify/invalid_integer_inventory_qty",
    title: "Invalid Inventory quantity",
    explanation: "Inventory quantity is not a valid integer.",
    whyPlatformCares:
      "Inventory quantities must be whole numbers.",
    howToFix: "Use an integer like 0, 5, 100.",
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/negative_inventory": {
    code: "shopify/negative_inventory",
    title: "Negative inventory",
    explanation: "Inventory quantity is negative.",
    whyPlatformCares:
      "Negative inventory is usually a data error and can create fulfillment issues.",
    howToFix:
      "Use 0 or a positive quantity, or configure backorders using Continue selling settings.",
    category: "inventory",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_image_url": {
    code: "shopify/invalid_image_url",
    title: "Invalid image URL",
    explanation: "Product image URL is not a valid http(s) URL.",
    whyPlatformCares:
      "Shopify must be able to fetch images via a valid URL.",
    howToFix: "Use a full http(s) URL to a publicly accessible image.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/invalid_image_position": {
    code: "shopify/invalid_image_position",
    title: "Invalid image position",
    explanation: "Image position is not a valid integer.",
    whyPlatformCares:
      "Image position controls ordering; invalid values can cause unpredictable ordering.",
    howToFix: "Use 1, 2, 3... or leave blank.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/option_order_invalid": {
    code: "shopify/option_order_invalid",
    title: "Option columns out of order",
    explanation: "Option2/Option3 has values while Option1 is blank.",
    whyPlatformCares:
      "Shopify expects options to be filled sequentially (Option1, then Option2, then Option3).",
    howToFix:
      "Fill Option1 before using Option2, and fill Option2 before Option3.",
    category: "variant",
    blocking: true,
    autoFixable: false,
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
      "Many inventory and fulfillment workflows expect unique SKUs per variant.",
    howToFix: "Make SKUs unique per variant (or leave blank if you don’t use SKUs).",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  // ✅ NEW: Step 1 (stronger): duplicate SKU across different products (different URL handles)
  "shopify/duplicate_sku_across_products": {
    code: "shopify/duplicate_sku_across_products",
    title: "Duplicate SKU across products",
    explanation: "The same SKU appears under different URL handles (different products).",
    whyPlatformCares:
      "Reusing SKUs across products can cause confusion in inventory systems, shipping tools, and analytics.",
    howToFix:
      "Make SKUs unique across your catalog, or confirm you truly intend to share SKUs across multiple products.",
    category: "variant",
    blocking: false,
    autoFixable: false,
  },

  // ✅ NEW: Step 2: handle grouping conflict
  "shopify/handle_title_mismatch": {
    code: "shopify/handle_title_mismatch",
    title: "Same URL handle with different Titles",
    explanation: "Multiple different Titles are used for rows sharing the same URL handle.",
    whyPlatformCares:
      "Shopify groups rows by URL handle. Conflicting titles can cause unexpected overwrites or confusing imports.",
    howToFix:
      "Use a single consistent Title for all rows under the same URL handle (variants and image rows).",
    category: "handle",
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
    title: "Image row contains variant fields",
    explanation: "A row looks like an image-only row, but it contains variant fields like SKU/Price/Options/Inventory.",
    whyPlatformCares:
      "This can break variant grouping and cause confusing imports.",
    howToFix:
      "For extra image rows, keep only URL handle + image fields. Move variant fields to the main product/variant rows.",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/duplicate_image_position": {
    code: "shopify/duplicate_image_position",
    title: "Duplicate image position",
    explanation: "Two or more rows share the same Image position for the same handle.",
    whyPlatformCares:
      "Image position controls ordering; duplicates can lead to unpredictable ordering.",
    howToFix: "Use unique Image position values per handle (1, 2, 3...).",
    category: "images",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_title_too_long": {
    code: "shopify/seo_title_too_long",
    title: "SEO title too long",
    explanation: "SEO title exceeds recommended length.",
    whyPlatformCares:
      "Long titles may be truncated in search results.",
    howToFix: "Shorten SEO title to 70 characters or fewer.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_description_too_long": {
    code: "shopify/seo_description_too_long",
    title: "SEO description too long",
    explanation: "SEO description exceeds recommended length.",
    whyPlatformCares:
      "Long descriptions may be truncated in search snippets.",
    howToFix: "Shorten SEO description to 320 characters or fewer.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_title_missing": {
    code: "shopify/seo_title_missing",
    title: "SEO title missing",
    explanation: "SEO title is blank (Shopify will fall back to Title).",
    whyPlatformCares:
      "Custom SEO titles can improve click-through rate.",
    howToFix: "Optional: provide a custom SEO title.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },

  "shopify/seo_description_missing": {
    code: "shopify/seo_description_missing",
    title: "SEO description missing",
    explanation: "SEO description is blank (Shopify may auto-generate one).",
    whyPlatformCares:
      "Custom descriptions can improve click-through rate and clarity in search results.",
    howToFix: "Optional: provide a custom SEO description.",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },
};
