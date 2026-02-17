import type { MetadataRoute } from "next";
import { getPresetFormats } from "@/lib/presets";
import { ECOMMERCE_PLATFORMS } from "@/lib/ecommercePlatforms";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://striveformats.com").replace(/\/+$/, "");
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ecommerce-csv-fixer`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/app`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/formats`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/formats/presets`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/presets`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/shopify-csv-fixer`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const presets = getPresetFormats();
  const presetPages: MetadataRoute.Sitemap = presets.map((p) => ({
    url: `${base}/presets/${encodeURIComponent(p.id)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p.id === "shopify_products" ? 0.7 : 0.6,
  }));

  const ecommercePages: MetadataRoute.Sitemap = ECOMMERCE_PLATFORMS.map((p) => ({
    url: `${base}/ecommerce/${encodeURIComponent(p.id)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p.id === "shopify" ? 0.85 : 0.75,
  }));

  return [...core, ...ecommercePages, ...presetPages];
}
