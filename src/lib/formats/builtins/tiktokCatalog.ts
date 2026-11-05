// src/lib/formats/builtins/tiktokCatalog.ts

import type { CsvFormat } from "../types";
import { validateAndFixTikTokCatalog, TIKTOK_CATALOG_EXPECTED_HEADERS, TIKTOK_CATALOG_EXAMPLE_ROW } from "@/lib/tiktokCatalogOptimizer";

export const tiktokCatalogFormat: CsvFormat = {
  id: "tiktok_catalog",
  name: "TikTok Catalog",
  description: "Check a TikTok catalog feed before you upload it in TikTok Ads Manager: the nine required fields, sku_id, availability, prices, brand and image links.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: TIKTOK_CATALOG_EXPECTED_HEADERS,
  exampleRow: TIKTOK_CATALOG_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "TikTok catalogs power Video Shopping Ads and catalog ads. You fill one from a product file in TikTok Ads Manager: one product per row, with TikTok's field names in the header row. This preset checks each product against TikTok's catalog product parameters and keeps your column names as they are.",
      "It catches what stops products from uploading: missing required fields, a feed that names its identifier id instead of sku_id, availability values TikTok doesn't take, products with no brand, duplicate sku_ids, and images on hosts TikTok can't read.",
    ],
    howItWorks: [
      "Upload your catalog file (CSV, or a tab-delimited .txt or .tsv).",
      "Each product is checked for sku_id, title, description, availability, condition, price, link, image_link and brand.",
      "A Google- or Meta-style id column is renamed to sku_id, and values like in_stock, pre_order, \"19,99 EUR\" and \"New\" are converted to TikTok's format.",
      "Images on Google Drive, Dropbox and other hosts TikTok can't read are flagged, as are emoji and offers in titles.",
      "Download a CSV with your original columns, ready to upload in TikTok Ads Manager.",
    ],
    commonFixes: [
      "Rename an id column to sku_id",
      "Convert availability to in stock, available for order, preorder, out of stock or discontinued",
      "Write prices as 9.99 USD, with a period and a currency code",
      "Convert condition to new, refurbished or used",
      "Flag products with no brand",
      "Flag images TikTok can't load",
    ],
    faq: [
      {
        q: "Can I upload my Google or Meta feed to TikTok?",
        a: "Mostly, because most field names are the same. The differences: TikTok names the identifier sku_id instead of id, and brand is required for every product. This preset renames the id column and flags products without a brand.",
      },
      {
        q: "Which fields are required?",
        a: "sku_id, title, description, availability, condition, price, link, image_link and brand, for every product.",
      },
      {
        q: "Do prices need a currency code?",
        a: "TikTok uses the currency of the catalog's country when the code is left out, but adding it, like 9.99 USD, avoids prices being read in the wrong currency.",
      },
      {
        q: "Why are my images rejected?",
        a: "TikTok needs a public link to a JPG or PNG file. Share links from Google Drive, Dropbox, Flickr or Pinterest don't work. Square images should be at least 500 × 500 pixels.",
      },
    ],
  },
  apply: validateAndFixTikTokCatalog,
};
