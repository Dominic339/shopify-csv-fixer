// src/lib/ecommercePlatforms.ts

// Refocus: only the 5 ecommerce platforms are shown in the public UI.

export type EcommercePlatformId = "shopify" | "woocommerce" | "etsy" | "ebay" | "amazon";

export type EcommercePlatform = {
  /** Stable id used for filtering and internal mapping */
  id: EcommercePlatformId;

  /** Display name */
  name: string;

  /** Short copy used on category pages */
  blurb: string;

  /** Optional longer copy for SEO blocks */
  description?: string;

  /** The default preset id to link to for this platform (matches src/lib/presets.ts preset ids) */
  defaultPresetId: string;

  /** Optional legacy SEO page path (used by sitemap, etc.) */
  legacySeoPath?: string;
};

export const ECOMMERCE_PLATFORMS: EcommercePlatform[] = [
  {
    id: "shopify",
    name: "Shopify",
    blurb: "Validate Shopify Products CSV files and export a template shaped CSV that imports cleanly.",
    description:
      "Shopify imports can fail when variants, handles, SKUs, pricing, inventory, images, or SEO fields are inconsistent. StriveFormats checks the rules Shopify enforces and applies only safe fixes.",
    defaultPresetId: "shopify_products",
    legacySeoPath: "/shopify-csv-fixer",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    blurb: "Clean WooCommerce product CSVs and flag missing essentials before you import.",
    description:
      "WooCommerce imports are sensitive to required columns, price formats, SKUs, and category formatting. StriveFormats helps normalize common issues before the import step.",
    defaultPresetId: "woocommerce_products",
  },
  {
    id: "etsy",
    name: "Etsy",
    blurb: "Fix Etsy listings CSV issues like formatting, missing fields, and invalid values before upload.",
    description:
      "Etsy listing files can fail on missing required fields and invalid values. StriveFormats standardizes common issues and flags anything risky before you upload.",
    defaultPresetId: "etsy_listings",
  },
  {
    id: "ebay",
    name: "eBay",
    blurb: "Clean listing files and reduce errors caused by formatting, blanks, and invalid values.",
    description:
      "Marketplace templates commonly break on bad prices, invalid conditions, missing quantities, and broken image URLs. StriveFormats highlights issues and keeps the output consistent.",
    defaultPresetId: "ebay_listings",
  },
  {
    id: "amazon",
    name: "Amazon",
    blurb: "Validate an inventory style template and normalize required identifiers and numeric fields.",
    description:
      "Amazon templates vary by category and feed type. StriveFormats starts with an inventory loader style format and flags missing essentials like SKUs, pricing, quantities, and URLs.",
    defaultPresetId: "amazon_inventory_loader",
  },
];

export function getEcommercePlatforms(): EcommercePlatform[] {
  return ECOMMERCE_PLATFORMS.slice();
}

export function getEcommercePlatformById(id: string): EcommercePlatform | undefined {
  const needle = (id ?? "").trim().toLowerCase();
  return ECOMMERCE_PLATFORMS.find((p) => p.id.toLowerCase() === needle);
}
