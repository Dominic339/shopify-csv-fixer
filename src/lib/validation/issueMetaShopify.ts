import type { IssueMetaMap } from "./issueMeta";

/**
 * Shopify issue metadata.
 *
 * IMPORTANT:
 * - Keys must match issue.code produced by Shopify validators.
 * - Keep these stable once published; they become part of UX + scoring.
 */
export const SHOPIFY_ISSUE_META: IssueMetaMap = {
  "shopify/missing_required_header": {
    code: "shopify/missing_required_header",
    title: "Missing required column",
    explanation: "Your CSV is missing a column Shopify expects for the Products import template.",
    whyPlatformCares:
      "Shopify maps columns by header name. Missing required headers causes Shopify to reject the file or skip critical fields.",
    howToFix:
      "Add the missing column header exactly as Shopify expects (spelling + casing). If you don’t have values yet, leave the cells blank.",
    category: "structure",
    blocking: true,
    autoFixable: true, // we can add the header column safely
  },

  "shopify/blank_handle": {
    code: "shopify/blank_handle",
    title: "Blank Handle",
    explanation:
      "At least one row has an empty Handle. Handles identify products and group variants in Shopify imports.",
    whyPlatformCares:
      "Shopify uses Handle as the product identifier in the import. A blank Handle means Shopify cannot attach the row to a product.",
    howToFix:
      "Fill in a unique handle for that product. For variants, every row for the same product must share the same Handle.",
    category: "variant",
    blocking: true,
  },

  "shopify/duplicate_handle": {
    code: "shopify/duplicate_handle",
    title: "Duplicate Handle",
    explanation:
      "The same Handle appears multiple times, but the rows do not look like valid variants of the same product.",
    whyPlatformCares:
      "Shopify expects duplicate handles to represent variants. If variant fields don’t align, Shopify may import incorrectly or overwrite data.",
    howToFix:
      "If these rows are variants, ensure Option and Variant fields are consistent (Option names/values, SKU, etc.). If they are different products, change the Handle.",
    category: "variant",
    blocking: true,
  },

  "shopify/duplicate_sku": {
    code: "shopify/duplicate_sku",
    title: "Duplicate SKU",
    explanation: "Two or more variants share the same SKU.",
    whyPlatformCares:
      "SKUs should uniquely identify variants. Duplicate SKUs can break inventory updates and confuse fulfillment workflows.",
    howToFix:
      "Make each SKU unique per variant. If you don’t use SKUs, consider leaving SKU blank consistently.",
    category: "variant",
    blocking: false,
  },

  "shopify/invalid_inventory_policy": {
    code: "shopify/invalid_inventory_policy",
    title: "Invalid Inventory Policy",
    explanation:
      "Variant Inventory Policy must be either 'deny' or 'continue' for Shopify product imports.",
    whyPlatformCares:
      "Shopify validates this field strictly. Any other value will fail validation or be ignored.",
    howToFix:
      "Use 'deny' to prevent overselling, or 'continue' to allow selling when inventory reaches 0.",
    category: "inventory",
    blocking: true,
    autoFixable: true, // safe normalization
  },

  "shopify/negative_inventory": {
    code: "shopify/negative_inventory",
    title: "Negative inventory",
    explanation: "Inventory quantity is below zero for at least one variant row.",
    whyPlatformCares:
      "Negative inventory is usually a data error and can cause unexpected out-of-stock behavior depending on Shopify inventory settings.",
    howToFix:
      "Set inventory to 0 or a positive number. If backorders are intended, use Inventory Policy = 'continue' and keep quantity at 0.",
    category: "inventory",
    blocking: false,
  },

  "shopify/invalid_boolean_published": {
    code: "shopify/invalid_boolean_published",
    title: "Invalid Published value",
    explanation: "Published must be TRUE or FALSE (Shopify accepts these boolean literals).",
    whyPlatformCares:
      "Shopify rejects unrecognized boolean values (like 'Yes', 'No', '1', '0') in the Published column.",
    howToFix:
      "Change Published to TRUE or FALSE for each row.",
    category: "structure",
    blocking: true,
    autoFixable: true, // safe normalization
  },

  "shopify/invalid_status": {
    code: "shopify/invalid_status",
    title: "Invalid Status",
    explanation: "Status must be one of: active, draft, archived.",
    whyPlatformCares:
      "Shopify validates Status against a strict allowed set. Invalid values can prevent import.",
    howToFix:
      "Set Status to active, draft, or archived (lowercase recommended).",
    category: "structure",
    blocking: true,
    autoFixable: true, // safe normalization to lowercase if it matches allowed set
  },

  "shopify/option_order_invalid": {
    code: "shopify/option_order_invalid",
    title: "Option hierarchy invalid",
    explanation:
      "Option2 cannot be used unless Option1 exists, and Option3 cannot be used unless Option2 exists.",
    whyPlatformCares:
      "Shopify expects variant option columns to be defined in order. Skipping an option breaks variant mapping.",
    howToFix:
      "Move option names/values up (fill Option1 before Option2, Option2 before Option3), or clear later options if unused.",
    category: "variant",
    blocking: true,
  },

  "shopify/compare_at_lt_price": {
    code: "shopify/compare_at_lt_price",
    title: "Compare-at price lower than price",
    explanation:
      "Compare-at price is meant to represent the original price. If it’s below the actual price, it may be a data mistake.",
    whyPlatformCares:
      "Shopify doesn’t always hard-reject this, but it can produce confusing sale displays or unexpected merchandising behavior.",
    howToFix:
      "Set Compare at Price to a value >= Price, or leave it blank if not used.",
    category: "pricing",
    blocking: false,
  },

  "shopify/invalid_numeric_price": {
    code: "shopify/invalid_numeric_price",
    title: "Invalid price number",
    explanation:
      "Price (or Compare at Price) is not parseable as a number after cleanup (currency symbols, commas, etc.).",
    whyPlatformCares:
      "Shopify validates pricing as numeric values. Non-numeric values are rejected or imported incorrectly.",
    howToFix:
      "Use plain numbers like 19.99. Remove currency symbols and commas.",
    category: "pricing",
    blocking: true,
    autoFixable: true, // safe numeric cleanup for common cases
  },

  "shopify/invalid_image_url": {
    code: "shopify/invalid_image_url",
    title: "Invalid Image URL",
    explanation: "Image Src must be a valid http(s) URL.",
    whyPlatformCares:
      "Shopify downloads images from the URL during import. Invalid URLs cause missing images or import warnings/errors.",
    howToFix:
      "Use a publicly accessible URL starting with http:// or https://. Ensure it points directly to an image file.",
    category: "structure",
    blocking: false,
  },

  "shopify/duplicate_image_url": {
    code: "shopify/duplicate_image_url",
    title: "Duplicate Image URL",
    explanation: "The same image URL appears multiple times (often accidental duplication).",
    whyPlatformCares:
      "Duplicate images can clutter product media and cause confusing image ordering after import.",
    howToFix:
      "Remove duplicate Image Src rows or adjust Image Position if they represent distinct images.",
    category: "structure",
    blocking: false,
  },
};
