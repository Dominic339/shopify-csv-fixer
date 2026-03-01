// src/lib/formats/builtins/ebayListings.ts

import type { CsvFormat } from "../types";
import {
  validateAndFixEbayListings,
  validateAndFixEbayVariations,
  EBAY_LISTING_EXPECTED_HEADERS,
  EBAY_LISTING_EXAMPLE_ROW,
  EBAY_VARIATION_EXPECTED_HEADERS,
  EBAY_VARIATION_EXAMPLE_ROW,
} from "@/lib/ebayOptimizer";

export const ebayListingsFormat: CsvFormat = {
  id: "ebay_listings",
  name: "eBay Listings",
  description: "Validate and auto-fix eBay File Exchange listing CSVs for fixed-price and auction listings.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: EBAY_LISTING_EXPECTED_HEADERS,
  exampleRow: EBAY_LISTING_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "eBay File Exchange lets sellers upload and update thousands of listings via CSV. This preset validates your listing file against eBay's field requirements, enforcing title length limits, price formatting, condition codes, and image URL rules.",
      "Common issues like overlong titles, invalid ConditionIDs, malformed picture URLs, and duplicate SKUs are flagged automatically. Safe formatting fixes are applied so your file arrives as clean as possible.",
    ],
    howItWorks: [
      "Upload your eBay File Exchange CSV.",
      "We canonicalize column headers (handling asterisk-prefixed required fields and common aliases).",
      "Per-row validation checks titles, prices, quantities, condition codes, durations, and image URLs.",
      "Cross-row duplicate CustomLabel (SKU) detection flags accidental overwrites.",
      "Export a validated file ready for eBay File Exchange.",
    ],
    commonFixes: [
      "Normalize Action casing (Add, Revise, Delete)",
      "Format StartPrice as a clean decimal (no currency symbols)",
      "Clean pipe-separated PictureURL lists",
      "Flag titles exceeding eBay's 80-character limit",
      "Warn on unrecognized ConditionIDs and Duration formats",
      "Detect duplicate CustomLabel (SKU) values",
    ],
    faq: [
      {
        q: "What eBay format does this target?",
        a: "This preset targets eBay File Exchange flat-file format, used for bulk listing uploads and revisions via the eBay Seller Hub.",
      },
      {
        q: "What is ConditionID?",
        a: "ConditionID is a numeric code eBay uses to describe item condition (e.g., 1000=New, 3000=Good, 5000=For parts or not working). The preset warns when an unrecognized ID is used.",
      },
      {
        q: "What duration values are supported?",
        a: "Use GTC (Good Till Cancelled) for fixed-price listings, or Days_N (e.g., Days_7, Days_30) for time-limited auctions.",
      },
    ],
  },
  apply: validateAndFixEbayListings,
};

export const ebayVariationsFormat: CsvFormat = {
  id: "ebay_variations",
  name: "eBay Variations",
  description: "Validate and auto-fix eBay File Exchange variation CSVs for multi-variant listings (size, color, etc.).",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: EBAY_VARIATION_EXPECTED_HEADERS,
  exampleRow: EBAY_VARIATION_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "eBay variation listings let you group related items (e.g., a shirt in multiple sizes and colors) under a single listing. This preset validates the eBay variation file format, checking that each row has valid titles, prices, quantities, and consistent VariationSpecifics pairing.",
      "Duplicate variation combinations under the same CustomLabel are flagged to prevent data conflicts during upload.",
    ],
    howItWorks: [
      "Upload your eBay Variations CSV.",
      "We check required columns and canonicalize headers.",
      "Each variation row is validated for title length, price, quantity, and VariationSpecifics consistency.",
      "Duplicate variation combos are detected across rows.",
      "Export a clean file ready for eBay File Exchange variation upload.",
    ],
    commonFixes: [
      "Flag titles exceeding eBay's 80-character limit",
      "Normalize StartPrice to a clean decimal",
      "Detect mismatched VariationSpecificsName / VariationSpecificsValue pairs",
      "Validate VariationPictureURL format",
      "Flag duplicate variation combinations",
    ],
    faq: [
      {
        q: "How do VariationSpecifics work?",
        a: "VariationSpecificsName lists the attribute names (e.g., 'Color|Size') and VariationSpecificsValue lists the corresponding values (e.g., 'Blue|Medium'). Both must be pipe-separated and match in count.",
      },
    ],
  },
  apply: validateAndFixEbayVariations,
};
