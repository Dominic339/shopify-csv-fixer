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

  "shopify/invalid_numeric_price": {
    code: "shopify/invalid_numeric_price",
    title: "Invalid Price",
    explanation: "Price must be a valid number (no currency symbols).",
    whyPlatformCares:
      "Shopify parses prices as numbers. Currency symbols, commas, or text can prevent import and break pricing.",
    howToFix: "Use a plain number like 19.99 (no $ sign, commas, or text).",
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_numeric_compare_at": {
    code: "shopify/invalid_numeric_compare_at",
    title: "Invalid Compare-at price",
    explanation: "Compare-at price must be a valid number (no currency symbols).",
    whyPlatformCares:
      "Shopify parses compare-at price as a number. Non-numeric values break import and pricing rules.",
    howToFix:
      "Use a plain number like 29.99 (no $ sign, commas, or text). Leave blank if you don’t use compare-at pricing.",
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },

  "shopify/compare_at_lt_price": {
    code: "shopify/compare_at_lt_price",
    title: "Compare-at lower than Price",
    explanation: "Compare-at price is lower than Price.",
    whyPlatformCares:
      "Compare-at is typically higher than the actual price when showing a sale. Lower compare-at can confuse customers.",
    howToFix: "Set Compare-at higher than Price when running a sale, or leave it blank.",
    category: "pricing",
    blocking: false,
  },

  "shopify/invalid_integer_inventory_qty": {
    code: "shopify/invalid_integer_inventory_qty",
    title: "Invalid Inventory quantity",
    explanation: "Inventory quantity must be a whole number (integer).",
    whyPlatformCares:
      "Shopify inventory counts are integers. Non-integer values can cause rejection or incorrect stock levels.",
    howToFix: "Use whole numbers like 0, 5, 12. Leave blank if you manage inventory elsewhere.",
    category: "inventory",
    blocking: true,
    autoFixable: false,
  },

  "shopify/negative_inventory": {
    code: "shopify/negative_inventory",
    title: "Negative Inventory",
    explanation: "Inventory quantity is negative.",
    whyPlatformCares:
      "Negative inventory can be valid in some workflows, but it’s often unintentional and may cause fulfillment confusion.",
    howToFix: "Double-check whether negative inventory is intended before importing.",
    category: "inventory",
    blocking: false,
  },

  "shopify/invalid_inventory_policy": {
    code: "shopify/invalid_inventory_policy",
    title: "Invalid Inventory policy",
    explanation: 'Inventory policy should be "deny" or "continue".',
    whyPlatformCares:
      "Shopify expects inventory policy to be one of its allowed values. Invalid values may fail import or default incorrectly.",
    howToFix: 'Use "deny" (stop selling) or "continue" (allow oversell).',
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_status": {
    code: "shopify/invalid_status",
    title: "Invalid Status",
    explanation: 'Status must be "active", "draft", or "archived".',
    whyPlatformCares:
      "Shopify uses Status to decide whether the product is available. Invalid values can fail import or cause unexpected state.",
    howToFix: 'Use "active", "draft", or "archived".',
    category: "structure",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_boolean_continue_selling": {
    code: "shopify/invalid_boolean_continue_selling",
    title: "Invalid Continue selling value",
    explanation: "Continue selling when out of stock must be TRUE or FALSE.",
    whyPlatformCares:
      "Shopify uses this boolean to decide whether overselling is allowed. Invalid values are rejected.",
    howToFix:
      "Set Continue selling when out of stock to TRUE (allow oversell) or FALSE (stop selling when out of stock).",
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },

  "shopify/invalid_image_url": {
    code: "shopify/invalid_image_url",
    title: "Invalid Image URL",
    explanation: "Product image URL is not a valid http(s) URL.",
    whyPlatformCares:
      "Shopify needs a publicly accessible URL to fetch images. Invalid URLs prevent image import.",
    howToFix: "Use a publicly accessible image URL starting with https://",
    category: "images",
    blocking: true,
    autoFixable: false,
  },

  "shopify/duplicate_image_url": {
    code: "shopify/duplicate_image_url",
    title: "Duplicate Image URL",
    explanation: "The same image URL appears multiple times for the same product.",
    whyPlatformCares:
      "Duplicate images clutter product galleries and can confuse ordering/positioning.",
    howToFix: "Remove duplicate image rows or adjust Image position/URLs.",
    category: "images",
    blocking: false,
  },

  "shopify/invalid_image_position": {
    code: "shopify/invalid_image_position",
    title: "Invalid Image position",
    explanation: "Image position should be a positive integer (1, 2, 3…).",
    whyPlatformCares:
      "Shopify uses Image position to order product images. Invalid values can lead to confusing ordering.",
    howToFix: "Use 1, 2, 3… to control image ordering, or leave it blank.",
    category: "images",
    blocking: false,
  },

  "shopify/option_order_invalid": {
    code: "shopify/option_order_invalid",
    title: "Option order invalid",
    explanation: "Option2/Option3 are set without the required preceding option.",
    whyPlatformCares:
      "Shopify expects options to be defined in order. Missing Option1/Option2 breaks variant structure.",
    howToFix: "Fill Option1 first, then Option2, then Option3 (name + value).",
    category: "variant",
    blocking: true,
    autoFixable: false,
  },

  "shopify/duplicate_handle_not_variants": {
    code: "shopify/duplicate_handle_not_variants",
    title: "Duplicate handle not variants",
    explanation: "Handle repeats with identical variant details (likely duplicates).",
    whyPlatformCares:
      "Shopify interprets repeated handles as variants/images. Exact duplicates can create redundant variants or overwrite data.",
    howToFix:
      "If variants, ensure option values or SKUs differ. If extra images, keep only handle + image fields on image rows.",
    category: "variant",
    blocking: false,
  },

  "shopify/seo_title_too_long": {
    code: "shopify/seo_title_too_long",
    title: "SEO title too long",
    explanation: "SEO title is longer than Shopify’s recommended limit.",
    whyPlatformCares:
      "Long titles may be truncated in search results and reduce click-through.",
    howToFix: "Shorten SEO title to ≤ 70 characters.",
    category: "seo",
    blocking: false,
  },

  "shopify/seo_description_too_long": {
    code: "shopify/seo_description_too_long",
    title: "SEO description too long",
    explanation: "SEO description is longer than Shopify’s recommended limit.",
    whyPlatformCares:
      "Long descriptions may be truncated in search results and reduce clarity.",
    howToFix: "Shorten SEO description to ≤ 320 characters.",
    category: "seo",
    blocking: false,
  },

  "shopify/seo_title_missing": {
    code: "shopify/seo_title_missing",
    title: "SEO title missing",
    explanation: "SEO title is blank (Shopify will fall back to Title).",
    whyPlatformCares:
      "Optional field. Setting it lets you optimize how the product appears in search results.",
    howToFix: "Optional: Set a custom SEO title if desired.",
    category: "seo",
    blocking: false,
  },

  "shopify/seo_description_missing": {
    code: "shopify/seo_description_missing",
    title: "SEO description missing",
    explanation: "SEO description is blank (Shopify will fall back to Description).",
    whyPlatformCares:
      "Optional field. Adding it can improve search snippet quality and click-through.",
    howToFix: "Optional: Add an SEO description if desired.",
    category: "seo",
    blocking: false,
  },
};
