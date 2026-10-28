// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getPresetFormats } from "../lib/presets";
import { getAllGuides, GUIDE_PLATFORMS } from "../lib/guidesRegistry";
import { LOCALES, localeHref } from "../lib/i18n/locales";
import { SITE_URL } from "../lib/i18n/seo";

type Freq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/** A page with a translated copy under /<locale>/: one entry per language, each listing the others. */
function translated(path: string, changeFrequency: Freq, priority: number): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}${localeHref(l, path)}`]));
  return LOCALES.map((l) => ({
    url: `${SITE_URL}${localeHref(l, path)}`,
    changeFrequency,
    priority: l === "en" ? priority : Math.round(priority * 0.8 * 100) / 100,
    alternates: { languages },
  }));
}

/** An English-only page. */
function english(path: string, changeFrequency: Freq, priority: number): MetadataRoute.Sitemap[number] {
  return { url: `${SITE_URL}${path}`, changeFrequency, priority };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Tools and hubs (translated)
    ...translated("/", "weekly", 1),
    ...translated("/app", "monthly", 0.9),
    ...translated("/csv-inspector", "monthly", 0.85),
    ...translated("/convert", "monthly", 0.8),
    ...translated("/merge", "monthly", 0.8),
    ...translated("/presets", "weekly", 0.9),
    ...translated("/guides", "monthly", 0.8),
    ...getPresetFormats().flatMap((preset) => translated(`/presets/${encodeURIComponent(preset.id)}`, "monthly", 0.7)),

    // Platform landing pages (English)
    english("/shopify-csv-fixer", "monthly", 0.85),
    english("/woocommerce-csv-fixer", "monthly", 0.85),
    english("/woocommerce-variable-csv-fixer", "monthly", 0.8),
    english("/etsy-csv-fixer", "monthly", 0.8),
    english("/ebay-csv-fixer", "monthly", 0.8),
    english("/ebay-variations-csv-fixer", "monthly", 0.75),
    english("/amazon-csv-fixer", "monthly", 0.8),
    english("/formats", "monthly", 0.7),
    english("/about", "monthly", 0.4),
    english("/privacy", "yearly", 0.2),
    english("/terms", "yearly", 0.2),

    // Guide pages: article bodies are English in every language, so only the English URL
    // is listed (localized copies point their canonical at it).
    ...GUIDE_PLATFORMS.map((p) => english(`/guides/${p}`, "monthly", 0.75)),
    ...getAllGuides().map((g) => english(`/guides/${g.platform}/${g.slug}`, "monthly", 0.7)),
  ];
}
