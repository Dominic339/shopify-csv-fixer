// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getEcommercePlatforms } from "@/lib/ecommercePlatforms";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://striveformats.com").replace(/\/+$/, "");

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/app`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/presets`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/formats`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/ecommerce-csv-fixer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // New ecommerce platform pages: /ecommerce/[platform]
  const ecommercePages: MetadataRoute.Sitemap = getEcommercePlatforms().map((platform) => ({
    url: `${baseUrl}/ecommerce/${encodeURIComponent(platform.id)}`,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  // Optional legacy SEO pages (ex: /shopify-csv-fixer)
  const legacySeoPages: MetadataRoute.Sitemap = getEcommercePlatforms()
    .filter((p) => typeof p.legacySeoPath === "string" && p.legacySeoPath.trim().length > 0)
    .map((p) => ({
      url: `${baseUrl}${p.legacySeoPath!.startsWith("/") ? "" : "/"}${p.legacySeoPath}`,
      changeFrequency: "monthly",
      priority: 0.65,
    }));

  // Deduplicate URLs (in case a legacy path overlaps)
  const all = [...staticPages, ...ecommercePages, ...legacySeoPages];
  const seen = new Set<string>();
  const deduped: MetadataRoute.Sitemap = [];

  for (const entry of all) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    deduped.push(entry);
  }

  return deduped;
}
