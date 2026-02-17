// src/lib/ecommercePlatforms.ts

export type EcommercePlatformFormat = {
  /** Preset details page id used at /presets/[id] */
  presetId: string;

  /** CsvFormat id used by the fixer at /app?preset= */
  formatId: string;

  /** Display label for the format on platform pages */
  label: string;
};

export type EcommercePlatform = {
  /** Used in routes like /ecommerce/[platform] */
  id: "shopify" | "woocommerce" | "amazon" | "ebay" | "etsy";

  /** Display name */
  name: string;

  /** Short copy used on cards */
  blurb: string;

  /** Optional longer copy for SEO blocks */
  description?: string;

  /** Supported formats for this platform (first is treated as primary) */
  formats: EcommercePlatformFormat[];

  /** Optional link to a legacy deep-dive SEO page */
  legacySeoPath?: string;
};

// Keep these aligned with ids in src/lib/presets.ts (presetId) and src/lib/formats (formatId)
export const ECOMMERCE_PLATFORMS: EcommercePlatform[] = [
  {
    id: "shopify",
    name: "Shopify",
    blurb: "Validate Shopify Products CSV files against the official template and export a clean import-ready file.",
    description:
      "Shopify imports can fail silently when variants, handles, pricing, inventory, images, or SEO fields are inconsistent. StriveFormats applies only safe fixes and flags risky issues for review.",
    formats: [
      { presetId: "shopify_products", formatId: "shopify_products", label: "Shopify Products CSV" },
      // Future expansion slots (kept out of v1):
      // { presetId: "shopify_customers", formatId: "shopify_customers", label: "Shopify Customers CSV" },
      // { presetId: "shopify_orders", formatId: "shopify_orders", label: "Shopify Orders CSV" },
    ],
    legacySeoPath: "/shopify-csv-fixer",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    blurb: "Clean WooCommerce product CSVs and flag missing essentials before import.",
    description:
      "WooCommerce product imports are sensitive to required columns, price formats, SKUs, and category formatting. StriveFormats helps normalize common issues before the import step.",
    formats: [{ presetId: "woocommerce_products", formatId: "woocommerce_products", label: "WooCommerce Products CSV" }],
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    blurb: "Validate Amazon templates (inventory and product style) and normalize common formatting problems.",
    description:
      "Amazon templates vary by feed type and category. StriveFormats starts with safe validation and consistent numeric formatting so uploads are less error prone.",
    formats: [
      { presetId: "amazon_inventory_loader", formatId: "amazon_inventory_loader", label: "Amazon Inventory Loader" },
      { presetId: "amazon_product_template", formatId: "amazon_product_template", label: "Amazon Product Template (Minimal)" },
    ],
  },
  {
    id: "ebay",
    name: "eBay",
    blurb: "Clean listing files and reduce import failures caused by formatting, blanks, and invalid values.",
    description:
      "Marketplace listing templates commonly break on bad prices, invalid conditions, missing quantities, and broken image URLs. StriveFormats highlights issues and keeps output consistent.",
    formats: [
      { presetId: "ebay_listings", formatId: "ebay_listings", label: "eBay Listings Basic Template" },
      { presetId: "ebay_variations", formatId: "ebay_variations", label: "eBay Variations Template" },
    ],
  },
  {
    id: "etsy",
    name: "Etsy",
    blurb: "Fix Etsy listings CSV issues like formatting, missing fields, and invalid values before upload.",
    description:
      "Etsy listing exports often drift in formatting and required values. StriveFormats helps normalize the file and flag missing essentials before upload or analysis.",
    formats: [{ presetId: "etsy_listings", formatId: "etsy_listings", label: "Etsy Listings CSV" }],
  },
];

export function getEcommercePlatforms(): EcommercePlatform[] {
  return ECOMMERCE_PLATFORMS.slice();
}

export function getEcommercePlatformById(id: string): EcommercePlatform | undefined {
  const needle = (id ?? "").trim().toLowerCase();
  return ECOMMERCE_PLATFORMS.find((p) => p.id.toLowerCase() === needle);
}
