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
      "eBay's bulk upload (Seller Hub › Reports › Uploads, formerly File Exchange) lets sellers add and update thousands of listings from one CSV. This preset checks each row against what eBay needs for its Action: new listings need a title, numeric category, price, quantity, and condition; Revise, Relist, and End rows need the listing's ItemID.",
      "Your file keeps its own columns and header text, including the site and currency in the first column (for example *Action(SiteID=UK|Country=GB|Currency=GBP|...)), so it uploads to the right eBay marketplace.",
    ],
    howItWorks: [
      "Upload the CSV you plan to send to eBay (any eBay site).",
      "We recognise eBay's column names, with or without the * required-field marker.",
      "Each row is checked for its Action: titles, category IDs, prices, quantities, condition IDs, durations, and picture URLs.",
      "Duplicate CustomLabels (SKUs) are flagged before they overwrite each other.",
      "Download the fixed file with your original columns intact.",
    ],
    commonFixes: [
      "Normalize Action casing (Add, Revise, Relist, End)",
      "Convert prices like 12,50 or $12.50 to plain decimals",
      "Convert condition names like \"New\" or \"Used\" to ConditionIDs",
      "Clean |-separated picture URL lists (up to 24 pictures)",
      "Flag titles over eBay's 80-character limit",
      "Flag fixed-price listings that are not GTC",
    ],
    faq: [
      {
        q: "Which eBay sites does this work with?",
        a: "All of them. The site and currency come from the first column's header (SiteID, Country, Currency), which is kept exactly as uploaded.",
      },
      {
        q: "What is ConditionID?",
        a: "ConditionID is eBay's numeric item condition, e.g. 1000 = New, 1500 = New other, 2750 = Like new, 3000 = Used, 7000 = For parts or not working. Allowed IDs vary by category. Condition names in your file are converted to IDs where they are unambiguous.",
      },
      {
        q: "What duration values are supported?",
        a: "Fixed-price listings run GTC (Good 'Til Cancelled). Auctions run Days_1, Days_3, Days_5, Days_7, or Days_10.",
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
      "An eBay variation listing groups related items, such as a shirt in several sizes and colors, under one listing. In eBay's upload file that is a parent row (title, category, and RelationshipDetails listing every value, e.g. Color=Blue;Red|Size=M;L) followed by one Relationship=Variation row per variant with its own SKU, price, and quantity.",
      "This preset checks that structure: every variation follows its parent, uses only values the parent declares, and has a unique combination, price, and quantity.",
    ],
    howItWorks: [
      "Upload your eBay variation CSV.",
      "We find each parent row and the variation rows beneath it.",
      "Each variation's RelationshipDetails is checked against its parent, and duplicate combinations are flagged.",
      "Prices, quantities, and picture URLs are cleaned on every row.",
      "Download the fixed file with your original columns intact.",
    ],
    commonFixes: [
      "Flag variations whose values are missing from the parent's RelationshipDetails",
      "Flag duplicate size/color combinations within a listing",
      "Flag variation rows that are missing a price or quantity",
      "Convert prices like 12,50 to plain decimals",
      "Validate VariationSpecificsName / VariationSpecificsValue pairs in older spreadsheets",
    ],
    faq: [
      {
        q: "How does RelationshipDetails work?",
        a: "On the parent row, list each variation name with all its values: Color=Blue;Red|Size=M;L. On each variation row, give that variant's values: Color=Blue|Size=M. Variation rows leave Action and Title blank.",
      },
      {
        q: "My spreadsheet uses VariationSpecificsName columns. Is that supported?",
        a: "Yes. Names and values separated by | (Color|Size and Blue|M) are checked for matching counts and duplicate combinations.",
      },
    ],
  },
  apply: validateAndFixEbayVariations,
};
