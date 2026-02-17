// src/lib/ecommercePlatforms.ts

export type EcommercePlatformId =
  | "shopify"
  | "woocommerce"
  | "bigcommerce"
  | "etsy"
  | "ebay"
  | "amazon";

export type EcommercePlatform = {
  id: EcommercePlatformId;
  name: string;
  href: string; // page route for platform overview
  presetIds: string[]; // preset ids from presets.ts that belong to this platform
};

export const ECOMMERCE_PLATFORMS: EcommercePlatform[] = [
  {
    id: "shopify",
    name: "Shopify",
    href: "/ecommerce/shopify",
    presetIds: ["shopify_products"],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    href: "/ecommerce/woocommerce",
    presetIds: ["woocommerce_products"],
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    href: "/ecommerce/bigcommerce",
    presetIds: ["bigcommerce_products"],
  },
  {
    id: "etsy",
    name: "Etsy",
    href: "/ecommerce/etsy",
    presetIds: ["etsy_listings"],
  },
  {
    id: "ebay",
    name: "eBay",
    href: "/ecommerce/ebay",
    presetIds: ["ebay_listings"],
  },
  {
    id: "amazon",
    name: "Amazon",
    href: "/ecommerce/amazon",
    presetIds: ["amazon_inventory_loader"],
  },
];

export function getEcommercePlatforms() {
  return ECOMMERCE_PLATFORMS.slice();
}

export function getEcommercePlatformById(id: string) {
  const needle = (id ?? "").trim().toLowerCase();
  return ECOMMERCE_PLATFORMS.find((p) => p.id.toLowerCase() === needle);
}
