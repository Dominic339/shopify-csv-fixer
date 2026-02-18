// src/lib/publicEcommerce.ts

import type { PresetFormat } from "@/lib/presets";
import { getPresetFormats } from "@/lib/presets";

// Public UI refocus: only show the 5 ecommerce presets in navigation + landing pages.
// (Other presets can remain in the codebase for later expansion, but they are not linked publicly.)
export const PUBLIC_ECOMMERCE_PRESET_IDS = [
  "shopify_products",
  "woocommerce_products",
  "etsy_listings",
  "ebay_listings",
  "amazon_inventory_loader",
] as const;

export function getPublicEcommercePresetFormats(): PresetFormat[] {
  const allow = new Set<string>(PUBLIC_ECOMMERCE_PRESET_IDS);
  return getPresetFormats().filter((p) => p.category === "Ecommerce" && allow.has(p.id));
}
