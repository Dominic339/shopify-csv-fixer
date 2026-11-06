// src/lib/guides/platformErrors.ts
// The error messages the platforms themselves show for a problem, word for word, so a guide can
// be found by someone who pastes the message into a search engine. English only: the platforms
// show these in English to English-language stores, and only the English guides list them.
//
// Only messages confirmed in the platform's own documentation or issue tracker are listed:
// - Shopify: help.shopify.com/en/manual/products/import-export/common-import-issues, plus the
//   "Default Title" and "add option values" messages reported in the Shopify Community.
// - Google Merchant Center: the issue names in Merchant Center's help center ("Missing product
//   price", "Invalid product availability") and the older "Missing value [attribute]" form.
// - WooCommerce: the importer's messages as quoted in woocommerce/woocommerce issues.
// "…" stands for the line numbers, handle or option name the platform fills in.

export const PLATFORM_ERRORS: Record<string, string[]> = {
  // Shopify
  "shopify/missing_required_header": ["Invalid CSV header: missing headers"],
  "shopify/blank_title": ["Ignored line … because it did not contain product data"],
  "shopify/duplicate_handle_not_variants": ["Ignored line … because handle … already exists", "Validation failed: The variant 'Default Title' already exists"],
  "shopify/options_not_unique": ["Validation failed: options are not unique"],
  "shopify/variant_option_missing_value": ["Validation failed: You need to add option values for …"],
  "shopify/image_row_has_variant_fields": ["Validation failed: The variant 'Default Title' already exists"],
  "shopify/blank_price": ["Validation failed: price can't be blank"],
  "shopify/invalid_integer_inventory_qty": ["Inventory quantity is not a number"],
  "shopify/invalid_inventory_policy": ["Inventory policy is not included in the list"],
  "shopify/invalid_image_url": [
    "Validation failed: An error occurred while trying to download the image",
    "Validation failed: getaddrinfo: nodename nor servname provided, or not known",
    "Validation failed: Invalid URL provided",
  ],
  "shopify/invalid_fulfillment_service": ["Fulfillment service can't be blank"],
  "shopify/product_category_looks_like_google": ["Not a valid product category"],
  // Google Merchant Center
  "google/missing_value": ["Missing product price", "Missing value [price]"],
  "google/invalid_availability": ["Invalid product availability", "Invalid value [availability]"],
  "google/invalid_price": ["Invalid value [price]"],
  "google/invalid_gtin": ["Invalid value [gtin]"],
  "google/missing_identifiers": ["Limited performance due to missing value [gtin]", "Missing value [gtin]"],
  // WooCommerce
  "woocommerce/duplicate_sku": ["Invalid or duplicated SKU."],
};

/** The platform's own error messages for an issue code (empty when none are known). */
export function platformErrorsFor(code: string | undefined): string[] {
  return (code && PLATFORM_ERRORS[code]) || [];
}
