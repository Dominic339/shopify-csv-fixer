// src/lib/formats/builtins/metaCatalog.ts

import type { CsvFormat } from "../types";
import { validateAndFixMetaCatalog, META_CATALOG_EXPECTED_HEADERS, META_CATALOG_EXAMPLE_ROW } from "@/lib/metaCatalogOptimizer";

export const metaCatalogFormat: CsvFormat = {
  id: "meta_catalog",
  name: "Meta Catalog (Facebook & Instagram)",
  description: "Check a Facebook and Instagram catalog feed before you upload it to Commerce Manager: required fields, availability, prices with currency, brand or GTIN, and images.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: META_CATALOG_EXPECTED_HEADERS,
  exampleRow: META_CATALOG_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "Meta's catalogs power product ads, Facebook Shops and Instagram Shopping. You fill one from a product file in Commerce Manager: one product per row, with Meta's field names in the header row. This preset checks each product against Meta's catalog field reference and keeps your column names as they are.",
      "It catches what stops products from uploading: missing required fields, availability values Meta doesn't take, prices without a currency code, products with no brand, GTIN or MPN, duplicate ids and broken image links.",
    ],
    howItWorks: [
      "Upload your catalog file (CSV, or a tab-delimited .txt or .tsv).",
      "Each product is checked for id, title, description, availability, condition, price, link and image_link.",
      "Values like in_stock, \"Sold out\", \"19,99 EUR\" and \"New\" are converted to Meta's format.",
      "Products with no brand, GTIN or MPN are flagged, and GTINs are checked against their check digit.",
      "Download a CSV with your original columns, ready to upload in Commerce Manager.",
    ],
    commonFixes: [
      "Convert availability to in stock or out of stock",
      "Write prices as 9.99 USD, with a period and a currency code",
      "Convert condition to new, refurbished or used",
      "Clean GTINs and restore a leading zero the check digit proves",
      "Convert gender and age_group to Meta's values",
      "Flag products with no brand, GTIN or MPN",
    ],
    faq: [
      {
        q: "Can I upload a Google Merchant Center feed to Meta?",
        a: "Mostly, because the field names are the same. The main difference is availability: Meta takes in stock and out of stock, with a space, where Google uses in_stock. This preset converts it for you.",
      },
      {
        q: "Which fields are required?",
        a: "id, title, description, availability, condition, price, link and image_link for every product, plus at least one of brand, gtin or mpn.",
      },
      {
        q: "How should prices be written?",
        a: "As a number with a period for decimals, followed by the ISO 4217 currency code, like 9.99 USD. A $ sign alone isn't enough, because several currencies use it.",
      },
      {
        q: "What about preorder products?",
        a: "Meta's catalog now takes only in stock and out of stock. Use in stock if customers can order the product now.",
      },
    ],
  },
  apply: validateAndFixMetaCatalog,
};
