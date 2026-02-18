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
  slug?: string; // legacy/SEO-friendly slug (defaults to id)
  name: string;
  category: PresetCategory;

  // SEO + UI helpers
  shortDescription?: string;
  longDescription?: string;
  searchKeywords?: string[];
};

export const PRESET_FORMATS: PresetFormat[] = [
  {
    id: "shopify_products",
    slug: "shopify_products",
    name: "Shopify Products CSV",
    category: "Ecommerce",
    shortDescription: "Validate and auto-fix Shopify product imports (variants, prices, booleans, images).",
    searchKeywords: ["shopify", "products", "variants", "import", "csv"],
  },
  {
    id: "woocommerce_products",
    slug: "woocommerce_products",
    name: "WooCommerce Products CSV",
    category: "Ecommerce",
    shortDescription: "Clean WooCommerce product exports and standardize fields before import.",
    searchKeywords: ["woocommerce", "products", "import", "csv"],
  },
  {
    id: "etsy_listings",
    slug: "etsy_listings",
    name: "Etsy Listings CSV",
    category: "Ecommerce",
    shortDescription: "Validate Etsy listing templates and flag missing or invalid listing values.",
    searchKeywords: ["etsy", "listings", "csv"],
  },
  {
    id: "ebay_listings",
    slug: "ebay_listings",
    name: "eBay Listings CSV",
    category: "Ecommerce",
    shortDescription: "Normalize eBay listing fields and catch common import blockers.",
    searchKeywords: ["ebay", "listings", "csv"],
  },
  {
    id: "amazon_inventory_loader",
    slug: "amazon_inventory_loader",
    name: "Amazon Inventory Loader",
    category: "Ecommerce",
    shortDescription: "Validate Amazon inventory loader templates and standardize numbers and required fields.",
    searchKeywords: ["amazon", "inventory", "loader", "csv"],
  },
];

function normKey(v: string) {
  return (v ?? "").trim().toLowerCase();
}

export function getPresetById(id: string): PresetFormat | null {
  const key = normKey(id);
  if (!key) return null;
  return PRESET_FORMATS.find((p) => normKey(p.id) === key) ?? null;
}

export function getPresetBySlug(slug: string): PresetFormat | null {
  const key = normKey(slug);
  if (!key) return null;

  // slug first (if present), then fall back to id
  return (
    PRESET_FORMATS.find((p) => normKey(p.slug ?? "") === key) ??
    PRESET_FORMATS.find((p) => normKey(p.id) === key) ??
    null
  );
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
