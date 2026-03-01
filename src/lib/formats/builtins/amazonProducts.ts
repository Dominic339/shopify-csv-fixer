// src/lib/formats/builtins/amazonProducts.ts

import type { CsvFormat } from "../types";
import {
  validateAndFixAmazonInventory,
  AMAZON_INVENTORY_EXPECTED_HEADERS,
  AMAZON_INVENTORY_EXAMPLE_ROW,
} from "@/lib/amazonOptimizer";

export const amazonInventoryFormat: CsvFormat = {
  id: "amazon_inventory_loader",
  name: "Amazon Inventory Loader",
  description:
    "Validate and auto-fix Amazon flat-file inventory loader CSVs for existing ASIN listings.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: AMAZON_INVENTORY_EXPECTED_HEADERS,
  exampleRow: AMAZON_INVENTORY_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "Amazon's flat-file inventory loader is the standard way to bulk-manage listings on Seller Central. This preset validates your inventory file against Amazon's field rules, enforcing SKU length limits, valid product-id-type codes, condition codes, price formatting, and fulfillment channel values.",
      "Common errors like missing SKUs, overlong item names, invalid condition codes, and malformed image URLs are detected automatically. Safe numeric formatting fixes are applied so your file is ready for upload.",
    ],
    howItWorks: [
      "Upload your Amazon inventory loader CSV.",
      "We canonicalize column headers, handling common aliases and synonyms.",
      "Per-row validation checks SKU length, item-name length, prices, quantities, condition codes, and fulfillment channel values.",
      "Cross-row duplicate SKU detection flags accidental overwrites.",
      "Export a validated flat-file ready for Amazon Seller Central.",
    ],
    commonFixes: [
      "Normalize price and min/max price fields to clean decimals",
      "Normalize quantity to a whole number",
      "Flag SKUs exceeding Amazon's 40-character limit",
      "Flag item-names exceeding Amazon's 500-character limit",
      "Normalize product-id-type to uppercase (ASIN, UPC, EAN, etc.)",
      "Validate add-delete field values (a or d)",
      "Detect duplicate SKUs that could overwrite existing listings",
    ],
    faq: [
      {
        q: "What format does this target?",
        a: "This preset targets Amazon's standard flat-file inventory loader, used in Seller Central for listing management. Column names are lowercase with hyphens (e.g., sku, item-name, product-id-type).",
      },
      {
        q: "What are valid item-condition codes?",
        a: "Amazon uses numeric condition codes: 11=New, 10=Refurbished, 1=Used Like New, 2=Used Very Good, 3=Used Good, 4=Used Acceptable, 5-8=Collectible grades.",
      },
      {
        q: "What does add-delete do?",
        a: "Use 'a' to add or update a listing and 'd' to delete it. An invalid value will cause the row to be rejected by Amazon.",
      },
      {
        q: "What is fulfillment-channel?",
        a: "Use DEFAULT for Merchant Fulfilled Network (you ship orders) or AMAZON_NA for Fulfillment by Amazon (FBA).",
      },
    ],
  },
  apply: validateAndFixAmazonInventory,
};
