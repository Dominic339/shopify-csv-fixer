// src/lib/formats/builtins/googleMerchant.ts

import type { CsvFormat } from "../types";
import { validateAndFixGoogleMerchant, GOOGLE_MERCHANT_EXPECTED_HEADERS, GOOGLE_MERCHANT_EXAMPLE_ROW } from "@/lib/googleMerchantOptimizer";

export const googleMerchantFormat: CsvFormat = {
  id: "google_merchant_center",
  name: "Google Merchant Center Feed",
  description: "Check a Google Merchant Center product file before you upload it: required attributes, prices with currency, availability, GTINs and identifiers.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: GOOGLE_MERCHANT_EXPECTED_HEADERS,
  exampleRow: GOOGLE_MERCHANT_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "Google Merchant Center lists your products in Shopping ads and free listings from a product data file: one product per line, with Google's attribute names in the header row. This preset checks each product against Google's product data specification and keeps your column names as they are.",
      "It catches the problems that get products disapproved: missing required attributes, prices without a currency code, availability values Google doesn't accept, preorders without a date, duplicate ids and GTINs with a wrong check digit.",
    ],
    howItWorks: [
      "Upload your product file (tab-delimited .txt or .tsv, or a CSV export of your feed).",
      "Each product is checked for id, title, description, link, image_link, availability and price.",
      "Values like \"In Stock\", \"New\", \"19,99 EUR\" and TRUE are converted to Google's format.",
      "GTINs are checked against their check digit, and duplicate ids are flagged.",
      "Download a tab-delimited .txt file with your original columns, ready to upload.",
    ],
    commonFixes: [
      "Convert availability to in_stock, out_of_stock, preorder or backorder",
      "Write prices as 19.99 USD, with a period and a currency code",
      "Convert condition to new, used or refurbished",
      "Clean GTINs and restore a leading zero the check digit proves",
      "Convert identifier_exists, adult and is_bundle to yes or no",
      "Remove tabs and line breaks that break the file",
    ],
    faq: [
      {
        q: "What file format does Merchant Center accept?",
        a: "A tab-delimited text file (.txt), with Google's attribute names in the first row and one product on each line. The fixer downloads that format.",
      },
      {
        q: "How should prices be written?",
        a: "As a number with a period for decimals, followed by the ISO 4217 currency code, like 15.00 USD. A $ sign alone isn't enough, because several currencies use it.",
      },
      {
        q: "What if my product has no barcode?",
        a: "Give the manufacturer part number (mpn) instead. For handmade or custom products with neither, set identifier_exists to no.",
      },
      {
        q: "Which attributes are required?",
        a: "id, title, description, link, image_link, availability and price for every product, plus brand for new products and more for apparel, such as color, size, gender and age_group.",
      },
    ],
  },
  apply: validateAndFixGoogleMerchant,
};
