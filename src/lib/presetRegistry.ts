// src/lib/presetRegistry.ts
// Central registry for built-in preset format landing pages.
// Keep this small, human-readable, and stable so URLs do not change.

export type PresetCategory = "Ecommerce";

export type PresetFormat = {
  id: string; // matches CsvFormat.id
  slug: string; // stable slug (legacy) used in a few places
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
    name: "Shopify Import Optimizer",
    category: "Ecommerce",
    shortDescription:
      "Strict Shopify schema validation + safe auto-fixes for products, variants, images, pricing, inventory, and SEO.",
    searchKeywords: ["shopify csv", "shopify product csv", "shopify import csv", "fix shopify csv"],
  },
  {
    id: "woocommerce_products",
    slug: "woocommerce-products",
    name: "WooCommerce Products",
    category: "Ecommerce",
    shortDescription: "Clean WooCommerce product CSV exports and prep them for reliable import.",
    searchKeywords: ["woocommerce csv", "woocommerce product csv", "fix woocommerce csv"],
  },
  {
    id: "etsy_listings",
    slug: "etsy-listings",
    name: "Etsy Listings",
    category: "Ecommerce",
    shortDescription: "Fix Etsy listing CSV files and make them consistent before upload or analysis.",
    searchKeywords: ["etsy csv", "etsy listing csv", "fix etsy csv"],
  },
  {
    id: "ebay_listings",
    slug: "ebay-listings",
    name: "eBay Listings",
    category: "Ecommerce",
    shortDescription: "Clean up eBay listing CSV data for faster bulk edits and listing management.",
    searchKeywords: ["ebay csv", "ebay listing csv", "fix ebay csv"],
  },
  {
    id: "amazon_inventory_loader",
    slug: "amazon-inventory-loader",
    name: "Amazon Inventory Loader",
    category: "Ecommerce",
    shortDescription: "Normalize Amazon inventory CSV templates so uploads are less error prone.",
    searchKeywords: ["amazon inventory csv", "amazon csv", "fix amazon csv"],
  },
];

export function getPresetById(id: string) {
  return PRESET_FORMATS.find((p) => p.id === id) ?? null;
}

export function getPresetBySlug(slug: string) {
  return PRESET_FORMATS.find((p) => p.slug === slug) ?? null;
}

// Some pages call this with no args, others used to pass a param.
// Keep the param optional for backwards compatibility.
export function getPresetsByCategory(_opts?: unknown) {
  const out: Record<PresetCategory, PresetFormat[]> = { Ecommerce: [] };

  for (const p of PRESET_FORMATS) out[p.category].push(p);
  return out;
}
