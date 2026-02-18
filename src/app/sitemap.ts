// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getEcommercePlatforms } from "@/lib/ecommercePlatforms";
import { getPublicEcommercePresetFormats } from "@/lib/publicEcommerce";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://striveformats.com";

  const core: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/ecommerce-csv-fixer`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/presets`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/shopify-csv-fixer`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Only include legacy SEO pages that actually exist.
  const platformSeoPages: MetadataRoute.Sitemap = getEcommercePlatforms()
    .filter((p) => !!p.legacySeoPath)
    .map((p) => ({
      url: `${baseUrl}${p.legacySeoPath}`,
      changeFrequency: "monthly",
      priority: 0.75,
    }));

  // Refocus: only include the 5 ecommerce preset pages in the public sitemap.
  const presetPages: MetadataRoute.Sitemap = getPublicEcommercePresetFormats().map((preset) => ({
    url: `${baseUrl}/presets/${encodeURIComponent(preset.id)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...core, ...platformSeoPages, ...presetPages];
}
