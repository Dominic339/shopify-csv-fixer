// src/lib/validation/issueMetaAmazon.ts
import type { IssueMetaMap } from "./issueMeta";

export const AMAZON_ISSUE_META: IssueMetaMap = {
  "amazon/missing_required_header": {
    code: "amazon/missing_required_header",
    title: "Missing required column",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "One or more required Amazon flat-file columns are missing from the header row.",
    whyPlatformCares: "Amazon's flat-file processor needs exact column names to map fields correctly. Missing columns cause the file to be rejected.",
    howToFix: "Use an Amazon inventory loader template and ensure required columns (sku, item-name, price, quantity) are present.",
  },

  "amazon/missing_sku": {
    code: "amazon/missing_sku",
    title: "Missing SKU",
    category: "sku",
    blocking: true,
    autoFixable: false,
    explanation: "The sku field is required for every Amazon inventory row.",
    whyPlatformCares: "Amazon uses the SKU to uniquely identify your listings. Rows without a SKU are rejected.",
    howToFix: "Provide a unique SKU (up to 40 characters) for each product row.",
  },

  "amazon/sku_too_long": {
    code: "amazon/sku_too_long",
    title: "SKU exceeds 40 characters",
    category: "sku",
    blocking: true,
    autoFixable: false,
    explanation: "Amazon limits SKUs to a maximum of 40 characters.",
    whyPlatformCares: "SKUs exceeding 40 characters are rejected by the flat-file processor.",
    howToFix: "Shorten the SKU to 40 characters or fewer while keeping it unique.",
  },

  "amazon/duplicate_sku": {
    code: "amazon/duplicate_sku",
    title: "Duplicate SKU",
    category: "sku",
    blocking: false,
    autoFixable: false,
    explanation: "Two or more rows share the same SKU in this file.",
    whyPlatformCares: "Duplicate SKUs cause one row to overwrite the other during processing, potentially deleting stock or price data.",
    howToFix: "Ensure each SKU appears only once per file. Use add-delete='d' to explicitly remove a listing.",
  },

  "amazon/missing_item_name": {
    code: "amazon/missing_item_name",
    title: "Missing item-name",
    category: "compliance",
    blocking: true,
    autoFixable: false,
    explanation: "The item-name field (product title) is required for Amazon listings.",
    whyPlatformCares: "Amazon requires a product title to display listings in search results and product pages.",
    howToFix: "Provide a descriptive product title in the item-name column (up to 500 characters).",
  },

  "amazon/item_name_too_long": {
    code: "amazon/item_name_too_long",
    title: "item-name too long",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "Amazon typically allows up to 500 characters for item-name.",
    whyPlatformCares: "Titles exceeding the limit may be truncated or rejected depending on the category template.",
    howToFix: "Shorten the item-name to 500 characters or fewer. Focus on brand, product type, key attributes.",
  },

  "amazon/missing_price": {
    code: "amazon/missing_price",
    title: "Missing price",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "The price field is required for all Amazon inventory rows.",
    whyPlatformCares: "Listings without a price cannot be activated on Amazon.",
    howToFix: "Provide a valid price in decimal format (e.g., 29.99).",
  },

  "amazon/invalid_price": {
    code: "amazon/invalid_price",
    title: "Invalid price",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "The price value is not a valid decimal number.",
    whyPlatformCares: "Invalid price values cause the row to be rejected by Amazon's flat-file processor.",
    howToFix: "Use a plain decimal like 29.99 (no dollar signs, commas, or text).",
  },

  "amazon/invalid_quantity": {
    code: "amazon/invalid_quantity",
    title: "Invalid quantity",
    category: "inventory",
    blocking: true,
    autoFixable: false,
    explanation: "The quantity value must be a non-negative integer.",
    whyPlatformCares: "Amazon rejects rows where quantity is not a valid number. Negative quantities are not accepted.",
    howToFix: "Use a whole number like 0, 5, or 100.",
  },

  "amazon/invalid_product_id_type": {
    code: "amazon/invalid_product_id_type",
    title: "Invalid product-id-type",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The product-id-type value is not a recognized Amazon identifier type.",
    whyPlatformCares: "Amazon uses product-id-type to interpret the product-id field (e.g., as an ASIN or UPC). An invalid type causes the product match to fail.",
    howToFix: "Use one of: ASIN, UPC, EAN, ISBN, or JAN.",
  },

  "amazon/invalid_item_condition": {
    code: "amazon/invalid_item_condition",
    title: "Invalid item-condition",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The item-condition code is not a recognized Amazon condition value.",
    whyPlatformCares: "Amazon displays the condition to buyers and uses it to categorize listings. An unrecognized code may be rejected.",
    howToFix: "Use a numeric Amazon condition code: 11=New, 10=Refurbished, 1=Used Like New, 2=Used Very Good, 3=Used Good, 4=Used Acceptable.",
  },

  "amazon/invalid_add_delete": {
    code: "amazon/invalid_add_delete",
    title: "Invalid add-delete value",
    category: "structure",
    blocking: false,
    autoFixable: false,
    explanation: "The add-delete field must be 'a' (add/update) or 'd' (delete).",
    whyPlatformCares: "An invalid add-delete value causes Amazon's processor to skip the row.",
    howToFix: "Use 'a' to add or update a listing, or 'd' to delete it.",
  },

  "amazon/invalid_fulfillment_channel": {
    code: "amazon/invalid_fulfillment_channel",
    title: "Invalid fulfillment-channel",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The fulfillment-channel value is not a recognized Amazon fulfillment type.",
    whyPlatformCares: "The fulfillment channel determines whether Amazon (FBA) or you (MFN) ship the order. An invalid value may default incorrectly.",
    howToFix: "Use DEFAULT for Merchant Fulfilled (you ship) or AMAZON_NA for Fulfillment by Amazon (FBA).",
  },

  "amazon/invalid_image_url": {
    code: "amazon/invalid_image_url",
    title: "Invalid image URL",
    category: "media",
    blocking: false,
    autoFixable: false,
    explanation: "The image-url is not a valid http(s) URL.",
    whyPlatformCares: "Amazon fetches product images from the provided URL. An invalid URL results in a listing without images, which reduces conversion.",
    howToFix: "Use a full https:// URL pointing to a publicly accessible product image (JPEG or PNG, minimum 500×500 px recommended).",
  },

  "amazon/description_too_long": {
    code: "amazon/description_too_long",
    title: "item-description too long",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The item-description exceeds Amazon's typical 2000-character limit.",
    whyPlatformCares: "Descriptions over the limit may be truncated or rejected depending on the category template.",
    howToFix: "Shorten the item-description to 2000 characters or fewer.",
  },

  "amazon/brand_name_too_long": {
    code: "amazon/brand_name_too_long",
    title: "brand-name too long",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The brand-name exceeds Amazon's 50-character limit.",
    whyPlatformCares: "Brand names exceeding the limit may be truncated or rejected.",
    howToFix: "Shorten the brand-name to 50 characters or fewer.",
  },
};
