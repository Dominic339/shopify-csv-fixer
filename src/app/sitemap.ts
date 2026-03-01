// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getPresetFormats } from "../lib/presets";
import { getEcommercePlatforms } from "../lib/ecommercePlatforms";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://striveformats.com";

  const core: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/presets`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/formats`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/ecommerce`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const ecommercePages: MetadataRoute.Sitemap = getEcommercePlatforms().map((platform) => ({
    url: `${baseUrl}/ecommerce/${encodeURIComponent(platform.id)}`,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  const presetPages: MetadataRoute.Sitemap = getPresetFormats().map((preset) => ({
    url: `${baseUrl}/presets/${encodeURIComponent(preset.id)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const fixerPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/shopify-csv-fixer`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/woocommerce-csv-fixer`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/woocommerce-variable-csv-fixer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/etsy-csv-fixer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/ebay-csv-fixer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/amazon-csv-fixer`, changeFrequency: "monthly", priority: 0.8 },
  ];

  return [...core, ...fixerPages, ...ecommercePages, ...presetPages];
}
