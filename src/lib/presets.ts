export type PresetCategory = "Ecommerce";

export type PresetFormat = {
  id: string;
  formatId: string;
  name: string;
  category: PresetCategory;
  description: string;
};

// Keep ids aligned with src/lib/formats/* builtins.
export const PRESET_FORMATS: PresetFormat[] = [
  {
    id: "shopify_products",
    formatId: "shopify_products",
    name: "Shopify Import Optimizer",
    category: "Ecommerce",
    description:
      "Validate and auto-fix Shopify product CSVs. Focused on import blockers, variant structure, pricing, inventory, and consistent formatting.",
  },
  {
    id: "woocommerce_products",
    formatId: "woocommerce_products",
    name: "WooCommerce Products",
    category: "Ecommerce",
    description:
      "Clean WooCommerce product templates: required fields, pricing formats, SKUs, categories, and common import mistakes.",
  },
  {
    id: "woocommerce_variable_products",
    formatId: "woocommerce_variable_products",
    name: "WooCommerce Variable Products",
    category: "Ecommerce",
    description: "WooCommerce variable products + variations (auto-creates missing parent rows and validates variation structure).",
  },
  {
    id: "etsy_listings",
    formatId: "etsy_listings",
    name: "Etsy Listings",
    category: "Ecommerce",
    description:
      "Prepare Etsy listing CSVs with cleaner structure, required fields, and safer formatting for uploads.",
  },
  {
    id: "amazon_inventory_loader",
    formatId: "amazon_inventory_loader",
    name: "Amazon Inventory Loader",
    category: "Ecommerce",
    description:
      "Normalize Amazon inventory loader style templates by validating essentials like SKU, item name, quantity, and price.",
  },
  {
    id: "ebay_listings",
    formatId: "ebay_listings",
    name: "eBay Listings",
    category: "Ecommerce",
    description:
      "Fix common eBay listing CSV issues: missing IDs, invalid values, broken URLs, and inconsistent pricing or quantity fields.",
  },
];

export function getPresetFormats() {
  return PRESET_FORMATS;
}

export function getPresetsByCategory() {
  return { Ecommerce: PRESET_FORMATS } as Record<PresetCategory, PresetFormat[]>;
}

export function getPresetById(id: string) {
  return PRESET_FORMATS.find((p) => p.id === id) ?? null;
}
