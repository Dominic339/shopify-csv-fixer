// src/lib/presetRegistry.ts
// Central registry for built-in preset format landing pages.
// Ecommerce-first scope (initial release): Shopify, WooCommerce, Amazon, eBay, Etsy.

export type PresetCategory = "Ecommerce";

export type PresetFormat = {
  id: string; // matches CsvFormat.id
  slug: string; // used in /formats/presets/[slug] (legacy) and for internal linking
  name: string; // display name
  category: PresetCategory;
  shortDescription: string;
  searchKeywords: string[];
};

// IMPORTANT: keep slugs stable once published.
export const PRESET_FORMATS: PresetFormat[] = [
  {
    id: "shopify_products",
    slug: "shopify-products",
    name: "Shopify Products CSV",
    category: "Ecommerce",
    shortDescription:
      "Official template-aligned Shopify Products CSV validation with safe auto-fixes for handles, variants, images, pricing, inventory, and SEO.",
    searchKeywords: ["shopify csv", "shopify product csv", "shopify import csv", "fix shopify csv"],
  },
  {
    id: "woocommerce_products",
    slug: "woocommerce-products",
    name: "WooCommerce Products CSV",
    category: "Ecommerce",
    shortDescription:
      "Clean WooCommerce product CSV exports and prep them for import with safer header + numeric normalization.",
    searchKeywords: ["woocommerce csv", "woocommerce product csv", "fix woocommerce import"],
  },
  {
    id: "amazon_inventory_loader",
    slug: "amazon-inventory-loader",
    name: "Amazon Inventory Loader (Simplified)",
    category: "Ecommerce",
    shortDescription:
      "Simplified Amazon inventory loader-style template with required identifier + numeric checks.",
    searchKeywords: ["amazon seller central csv", "amazon inventory loader", "amazon feed template"],
  },
  {
    id: "amazon_product_template",
    slug: "amazon-product-template",
    name: "Amazon Product Template (Minimal)",
    category: "Ecommerce",
    shortDescription:
      "Minimal Amazon product template starter with core attributes and identifiers to avoid overpromising.",
    searchKeywords: ["amazon product template", "amazon csv template", "amazon listing csv"],
  },
  {
    id: "ebay_listings",
    slug: "ebay-listings",
    name: "eBay Listings (Basic)",
    category: "Ecommerce",
    shortDescription:
      "Simplified eBay listings template validation with safe formatting checks and required fields.",
    searchKeywords: ["ebay csv", "ebay listing template", "fix ebay import csv"],
  },
  {
    id: "ebay_variations",
    slug: "ebay-variations",
    name: "eBay Variations Template",
    category: "Ecommerce",
    shortDescription:
      "Variation-friendly template that helps keep parent and child rows consistent (safe checks only).",
    searchKeywords: ["ebay variations csv", "ebay variation template", "ebay parent child csv"],
  },
  {
    id: "etsy_listings",
    slug: "etsy-listings",
    name: "Etsy Listings CSV",
    category: "Ecommerce",
    shortDescription: "Prepare Etsy listing CSVs with consistent columns and safer numeric formatting.",
    searchKeywords: ["etsy csv", "etsy listings template", "fix etsy import csv"],
  },
];

export function getPresetBySlug(slug: string): PresetFormat | undefined {
  const needle = (slug ?? "").trim().toLowerCase();
  return PRESET_FORMATS.find((p) => p.slug.toLowerCase() === needle);
}

export function getPresetsByCategory(category: PresetCategory): PresetFormat[] {
  return PRESET_FORMATS.filter((p) => p.category === category);
}
