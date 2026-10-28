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
    "Validate and auto-fix Amazon Inventory Loader files for offers on existing ASINs.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: AMAZON_INVENTORY_EXPECTED_HEADERS,
  exampleRow: AMAZON_INVENTORY_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "Amazon's Inventory Loader is the Seller Central upload for adding or updating offers on products that already have an ASIN: price, quantity, condition, and fulfillment. This preset checks each row against Amazon's rules and keeps your column names exactly as they are, because Amazon matches columns by exact name.",
      "It catches the problems that make Amazon reject rows or attach offers to the wrong product: barcodes a spreadsheet turned into 1.23457E+11, UPCs that lost a leading zero, wrong product-id-type codes, SKUs over 40 characters, and duplicate SKUs.",
    ],
    howItWorks: [
      "Upload your Inventory Loader file (category template columns like item_sku and external_product_id are recognised too).",
      "Each row is checked: SKU, product ID and its type, price, quantity, condition, add-delete, and fulfillment center.",
      "Prices written as 12,50 or $12.50 are converted to plain decimals.",
      "Duplicate SKUs are flagged before they overwrite each other.",
      "Download the file with your original columns intact.",
    ],
    commonFixes: [
      "Convert prices and min/max prices to plain decimals",
      "Flag barcodes in scientific notation (1.23457E+11) and missing leading zeros",
      "Check UPC/EAN/ISBN/ASIN length for the product-id-type",
      "Flag SKUs over Amazon's 40-character limit",
      "Validate add-delete (a, d, or x)",
      "Detect duplicate SKUs",
    ],
    faq: [
      {
        q: "What format does this target?",
        a: "Amazon's Inventory Loader (offer file), with lowercase hyphenated columns such as sku, product-id, product-id-type, price, quantity, and add-delete.",
      },
      {
        q: "What are the product-id-type codes?",
        a: "In the Inventory Loader, product-id-type is a number: 1 = ASIN, 2 = ISBN, 3 = UPC, 4 = EAN. Category templates use the names instead.",
      },
      {
        q: "What are valid item-condition codes?",
        a: "11 = New, 10 = Refurbished, 1–4 = Used (Like New, Very Good, Good, Acceptable), 5–8 = Collectible grades.",
      },
      {
        q: "What does add-delete do?",
        a: "a adds or updates the offer, d deletes the offer, and x deletes the offer and the product data you contributed.",
      },
      {
        q: "What is fulfillment-center-id?",
        a: "DEFAULT means you ship the order yourself. AMAZON_NA, AMAZON_EU, AMAZON_FE, or AMAZON_IN means Fulfillment by Amazon in that region.",
      },
    ],
  },
  apply: validateAndFixAmazonInventory,
};
