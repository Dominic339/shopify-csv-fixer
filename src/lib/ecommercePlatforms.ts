export type EcommercePlatform = {
  /** Used in routes like /ecommerce/[platform] */
  id: string;

  /** Display name */
  name: string;

  /** Short copy used on category pages */
  blurb: string;

  /** Optional longer copy for SEO blocks */
  description?: string;

  /** The default preset slug to link to for this platform */
  defaultPresetSlug: string;
};

// Keep these aligned with your preset slugs from presetRegistry.ts
export const ECOMMERCE_PLATFORMS: EcommercePlatform[] = [
  {
    id: "shopify",
    name: "Shopify",
    blurb: "Validate Shopify product imports and export a template shaped CSV that imports cleanly.",
    description:
      "Shopify imports can fail silently when variants, handles, pricing, inventory, images, or SEO fields are inconsistent. StriveFormats checks the rules Shopify enforces and applies only safe fixes.",
    defaultPresetSlug: "shopify_products",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    blurb: "Clean WooCommerce product CSVs and flag missing essentials before you import.",
    description:
      "WooCommerce product imports are sensitive to required columns, price formats, SKUs, and category formatting. StriveFormats helps normalize common issues before the import step.",
    defaultPresetSlug: "woocommerce_products",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    blurb: "Prepare BigCommerce product imports with consistent columns and safer formatting.",
    description:
      "BigCommerce imports are impacted by missing required fields, inconsistent pricing formats, and mismatched product identifiers. StriveFormats flags issues early and helps standardize the file.",
    defaultPresetSlug: "bigcommerce_products",
  },
  {
    id: "ebay",
    name: "eBay",
    blurb: "Clean listing files and reduce import errors caused by formatting, blanks, and invalid values.",
    description:
      "Marketplace listing templates commonly break on bad prices, invalid conditions, missing quantities, and broken image URLs. StriveFormats highlights issues and keeps the output consistent.",
    defaultPresetSlug: "ebay_listings",
  },
  {
    id: "amazon",
    name: "Amazon",
    blurb: "Start with an inventory style template and validate required identifiers and numeric fields.",
    description:
      "Amazon templates vary by category and feed type. StriveFormats starts with an inventory loader style format and flags missing essentials like SKUs, pricing, quantities, and URLs.",
    defaultPresetSlug: "amazon_inventory_loader",
  },
];

export function getEcommercePlatforms(): EcommercePlatform[] {
  return ECOMMERCE_PLATFORMS.slice();
}

export function getEcommercePlatformById(id: string): EcommercePlatform | undefined {
  const needle = (id ?? "").trim().toLowerCase();
  return ECOMMERCE_PLATFORMS.find((p) => p.id.toLowerCase() === needle);
}
