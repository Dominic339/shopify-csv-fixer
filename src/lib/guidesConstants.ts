// src/lib/guidesConstants.ts
// Shared platform constants for the guides system.
// This file has no server-only imports — safe to use in Client Components.

export type GuidePlatform = "shopify" | "woocommerce" | "etsy" | "ebay" | "amazon" | "google" | "meta" | "tiktok" | "general";

export const GUIDE_PLATFORMS: GuidePlatform[] = [
  "shopify",
  "woocommerce",
  "etsy",
  "ebay",
  "amazon",
  "google",
  "meta",
  "tiktok",
  "general",
];

/** Guide platforms whose guides are English-only for now (see ENGLISH_ONLY_PATHS). */
export const ENGLISH_ONLY_GUIDE_PLATFORMS: GuidePlatform[] = ["tiktok"];

export const PLATFORM_LABEL: Record<GuidePlatform, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  etsy: "Etsy",
  ebay: "eBay",
  amazon: "Amazon",
  google: "Google Merchant Center",
  meta: "Meta",
  tiktok: "TikTok",
  general: "General",
};

export const PLATFORM_PRESET_ID: Record<GuidePlatform, string | null> = {
  shopify: "shopify_products",
  woocommerce: "woocommerce_products",
  etsy: "etsy_listings",
  ebay: "ebay_listings",
  amazon: "amazon_inventory_loader",
  google: "google_merchant_center",
  meta: "meta_catalog",
  tiktok: "tiktok_catalog",
  general: null,
};

export const PLATFORM_FIXER_HREF: Record<GuidePlatform, string | null> = {
  shopify: "/shopify-csv-fixer",
  woocommerce: "/woocommerce-csv-fixer",
  etsy: "/etsy-csv-fixer",
  ebay: "/ebay-csv-fixer",
  amazon: "/amazon-csv-fixer",
  google: "/google-merchant-center-feed-checker",
  meta: "/meta-catalog-feed-checker",
  tiktok: "/tiktok-catalog-feed-checker",
  general: null,
};
