// src/lib/formats/builtins/etsyListings.ts

import type { CsvFormat } from "../types";
import { validateAndFixEtsyListings, ETSY_EXPECTED_HEADERS, ETSY_EXAMPLE_ROW } from "@/lib/etsyOptimizer";

export const etsyListings: CsvFormat = {
  id: "etsy_listings",
  name: "Etsy Listings",
  description: "Validate and auto-fix Etsy listing CSVs for bulk editing and catalog review.",
  category: "Ecommerce",
  source: "builtin",
  expectedHeaders: ETSY_EXPECTED_HEADERS,
  exampleRow: ETSY_EXAMPLE_ROW,
  seo: {
    longDescription: [
      "Etsy sellers often export listing data to spreadsheets for bulk edits, audits, and migration prep. This preset validates common Etsy listing CSV fields and applies safe cleanup so your data stays consistent.",
      "It focuses on titles, prices, quantity, tags, and image URLs. Anything that could change listing meaning stays as a visible issue.",
    ],
    howItWorks: [
      "Upload your Etsy listing CSV.",
      "We validate required fields and common Etsy field limits.",
      "Safe fixes are applied automatically (trim/normalize, URL cleanup, numeric formatting).",
      "Review remaining issues, then export a clean file.",
    ],
    commonFixes: [
      "Trim whitespace and normalize tag separators",
      "Ensure Price is a valid decimal and Quantity is a whole number",
      "Validate and clean Image URL lists",
      "Warn when titles or tags exceed Etsy limits",
    ],
    faq: [
      {
        q: "Is this an official Etsy listing importer?",
        a: "This preset targets common Etsy CSV listing workflows (exports and bulk edit spreadsheets) and keeps fields within Etsy's documented limits.",
      },
      {
        q: "What does it validate?",
        a: "Titles, prices, quantities, tags (count/length), and image URLs. It flags invalid or empty values that frequently break bulk-edit workflows.",
      },
    ],
  },
  apply: validateAndFixEtsyListings,
};
