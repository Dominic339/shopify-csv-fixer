import { MetadataRoute } from "next";
import { getPresetFormats } from "@/lib/presets";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://striveformats.com";
  const now = new Date();

  const presets = getPresetFormats();

  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/app`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/formats`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/presets`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const presetPages: MetadataRoute.Sitemap = presets.map((p) => ({
    url: `${base}/presets/${p.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...core, ...presetPages];
}
