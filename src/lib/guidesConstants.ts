// src/lib/guidesConstants.ts
// Shared platform constants for the guides system.
// This file has no server-only imports — safe to use in Client Components.

export type GuidePlatform = "shopify" | "woocommerce" | "etsy" | "ebay" | "amazon" | "general";

export const GUIDE_PLATFORMS: GuidePlatform[] = [
  "shopify",
  "woocommerce",
  "etsy",
  "ebay",
  "amazon",
  "general",
];

export const PLATFORM_LABEL: Record<GuidePlatform, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  etsy: "Etsy",
  ebay: "eBay",
  amazon: "Amazon",
  general: "General",
};

export const PLATFORM_PRESET_ID: Record<GuidePlatform, string | null> = {
  shopify: "shopify_products",
  woocommerce: "woocommerce_products",
  etsy: "etsy_listings",
  ebay: "ebay_listings",
  amazon: "amazon_inventory_loader",
  general: null,
};

export const PLATFORM_FIXER_HREF: Record<GuidePlatform, string | null> = {
  shopify: "/shopify-csv-fixer",
  woocommerce: "/woocommerce-csv-fixer",
  etsy: "/etsy-csv-fixer",
  ebay: "/ebay-csv-fixer",
  amazon: "/amazon-csv-fixer",
  general: null,
};
