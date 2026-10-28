// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getPresetFormats } from "../lib/presets";
import { getAllGuides, GUIDE_PLATFORMS } from "../lib/guidesRegistry";
import { LOCALES, localeHref, type Locale } from "../lib/i18n/locales";
import { readCuratedGuide } from "../lib/guides/mdxLoader";
import { SITE_URL } from "../lib/i18n/seo";

type Freq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/** A page with a translated copy under /<locale>/: one entry per language, each listing the others. */
function translated(path: string, changeFrequency: Freq, priority: number, locales: readonly Locale[] = LOCALES): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}${localeHref(l, path)}`]));
  return locales.map((l) => ({
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

    // Platform landing pages (translated)
    ...translated("/shopify-csv-fixer", "monthly", 0.85),
    ...translated("/woocommerce-csv-fixer", "monthly", 0.85),
    ...translated("/woocommerce-variable-csv-fixer", "monthly", 0.8),
    ...translated("/etsy-csv-fixer", "monthly", 0.8),
    ...translated("/ebay-csv-fixer", "monthly", 0.8),
    ...translated("/ebay-variations-csv-fixer", "monthly", 0.75),
    ...translated("/amazon-csv-fixer", "monthly", 0.8),
    english("/formats", "monthly", 0.7),
    ...translated("/about", "monthly", 0.4),
    ...translated("/privacy", "yearly", 0.2),
    ...translated("/terms", "yearly", 0.2),

    // Guide pages: issue guides are generated in every language; a curated article is
    // listed in the languages it has been translated into.
    ...GUIDE_PLATFORMS.flatMap((p) => translated(`/guides/${p}`, "monthly", 0.75)),
    ...getAllGuides().flatMap((g) => {
      const path = `/guides/${g.platform}/${g.slug}`;
      if (g.kind !== "curated") return translated(path, "monthly", 0.7);
      return translated(path, "monthly", 0.7, LOCALES.filter((l) => readCuratedGuide(g.platform, g.slug, l)?.translated));
    }),
  ];
}
