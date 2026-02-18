// src/lib/presetRegistry.ts

export type PresetCategory =
  | "Ecommerce"
  | "Accounting"
  | "CRM"
  | "Marketing"
  | "Analytics"
  | "Shipping"
  | "Other";

export type PresetFormat = {
  id: string; // must match a CsvFormat id (ex: "shopify_products")
  name: string;
  category: PresetCategory;

  // SEO + UI helpers (optional but recommended)
  shortDescription?: string;
  longDescription?: string;
  searchKeywords?: string[];
};

export const PRESET_FORMATS: PresetFormat[] = [
  // Ecommerce (keep to your ecommerce-only set)
  {
    id: "shopify_products",
    name: "Shopify Products CSV",
    category: "Ecommerce",
    shortDescription: "Validate and auto-fix Shopify product imports (variants, prices, booleans, images).",
    searchKeywords: ["shopify", "products", "variants", "import", "csv"],
  },
  {
    id: "woocommerce_products",
    name: "WooCommerce Products CSV",
    category: "Ecommerce",
    shortDescription: "Clean WooCommerce product exports and standardize fields before import.",
    searchKeywords: ["woocommerce", "products", "import", "csv"],
  },
  {
    id: "etsy_listings",
    name: "Etsy Listings CSV",
    category: "Ecommerce",
    shortDescription: "Validate Etsy listing templates and flag missing or invalid listing values.",
    searchKeywords: ["etsy", "listings", "csv"],
  },
  {
    id: "ebay_listings",
    name: "eBay Listings CSV",
    category: "Ecommerce",
    shortDescription: "Normalize eBay listing fields and catch common import blockers.",
    searchKeywords: ["ebay", "listings", "csv"],
  },
  {
    id: "amazon_inventory_loader",
    name: "Amazon Inventory Loader",
    category: "Ecommerce",
    shortDescription: "Validate Amazon inventory loader templates and standardize numbers and required fields.",
    searchKeywords: ["amazon", "inventory", "loader", "csv"],
  },
];

export function getPresetById(id: string): PresetFormat | null {
  const key = (id ?? "").trim();
  if (!key) return null;
  return PRESET_FORMATS.find((p) => p.id === key) ?? null;
}

export function getPresetsByCategory(): Record<string, PresetFormat[]> {
  const groups: Record<string, PresetFormat[]> = {};
  for (const p of PRESET_FORMATS) {
    const cat = p.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
}
