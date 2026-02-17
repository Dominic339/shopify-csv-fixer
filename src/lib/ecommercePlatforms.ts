// src/lib/ecommercePlatforms.ts
// Ecommerce-first platform registry used by /ecommerce-csv-fixer and /ecommerce/[platform] pages.

export type EcommerceSupportedFormat = {
  /** Preset id used by /presets/[id] */
  presetId: string;

  /** CsvFormat id used by /app?preset=... */
  formatId: string;

  /** Display name for the format */
  name: string;

  /** Short description shown on platform pages */
  blurb: string;
};

export type EcommercePlatform = {
  /** Used in routes like /ecommerce/[platform] */
  id: string;

  /** Display name */
  name: string;

  /** Short copy used on the platform selector */
  blurb: string;

  /** Optional longer copy for SEO blocks */
  description?: string;

  /** Supported formats for this platform (initial release scope) */
  formats: EcommerceSupportedFormat[];
};

// Initial release scope (Ecommerce only): Shopify, WooCommerce, Amazon, eBay, Etsy
export const ECOMMERCE_PLATFORMS: EcommercePlatform[] = [
  {
    id: "shopify",
    name: "Shopify",
    blurb: "Validate Shopify product imports and export a template-shaped CSV that imports cleanly.",
    description:
      "Shopify imports can fail silently when variants, handles, pricing, inventory, images, or SEO fields are inconsistent. StriveFormats checks the rules Shopify enforces and applies only safe fixes.",
    formats: [
      {
        presetId: "shopify_products",
        formatId: "shopify_products",
        name: "Shopify Products CSV",
        blurb: "Official template-aligned products import with strict, safe fixes.",
      },
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    blurb: "Clean WooCommerce product CSVs and flag missing essentials before you import.",
    description:
      "WooCommerce product imports are sensitive to required columns, price formats, SKUs, and category formatting. StriveFormats helps normalize common issues before the import step.",
    formats: [
      {
        presetId: "woocommerce_products",
        formatId: "woocommerce_products",
        name: "WooCommerce Products CSV",
        blurb: "Normalize common issues and keep columns consistent for import.",
      },
    ],
  },
  {
    id: "amazon",
    name: "Amazon Seller Central",
    blurb: "Start with inventory and product templates and validate required identifiers and numeric fields.",
    description:
      "Amazon templates vary by category and feed type. StriveFormats starts with simplified, safer templates and flags missing essentials like SKUs, pricing, quantities, and required identifiers.",
    formats: [
      {
        presetId: "amazon_inventory_loader",
        formatId: "amazon_inventory_loader",
        name: "Amazon Inventory Loader (Simplified)",
        blurb: "Inventory-style template: sku, title, price, quantity, identifiers.",
      },
      {
        presetId: "amazon_product_template",
        formatId: "amazon_product_template",
        name: "Amazon Product Template (Minimal)",
        blurb: "Minimal product template: core attributes + identifiers for a safer starting point.",
      },
    ],
  },
  {
    id: "ebay",
    name: "eBay",
    blurb: "Clean listing templates and reduce import errors caused by formatting, blanks, and invalid values.",
    description:
      "Marketplace listing templates commonly break on bad prices, invalid conditions, missing quantities, and broken image URLs. StriveFormats highlights issues and keeps output consistent.",
    formats: [
      {
        presetId: "ebay_listings",
        formatId: "ebay_listings",
        name: "eBay Listings (Basic)",
        blurb: "Simplified listings template with safe numeric and required-field checks.",
      },
      {
        presetId: "ebay_variations",
        formatId: "ebay_variations",
        name: "eBay Variations Template",
        blurb: "Variation-friendly template that helps keep parent/child rows consistent.",
      },
    ],
  },
  {
    id: "etsy",
    name: "Etsy",
    blurb: "Prepare Etsy listings CSVs with consistent columns and safer numeric formatting.",
    description:
      "Etsy listings often fail on missing required fields, inconsistent pricing, and broken URLs. StriveFormats flags issues early and standardizes common formatting problems.",
    formats: [
      {
        presetId: "etsy_listings",
        formatId: "etsy_listings",
        name: "Etsy Listings CSV",
        blurb: "Simplified Etsy listing template with safe numeric validation.",
      },
    ],
  },
];

export function getEcommercePlatforms(): EcommercePlatform[] {
  return ECOMMERCE_PLATFORMS.slice();
}

export function getEcommercePlatformById(id: string): EcommercePlatform | undefined {
  const needle = (id ?? "").trim().toLowerCase();
  return ECOMMERCE_PLATFORMS.find((p) => p.id.toLowerCase() === needle);
}
