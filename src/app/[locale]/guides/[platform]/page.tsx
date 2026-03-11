// src/app/[locale]/guides/[platform]/page.tsx
// Localized platform guide listing page (e.g. /de/guides/shopify).
// Mirrors /guides/[platform]/page.tsx with locale-aware links and translated UI.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import {
  getGuidesByPlatform,
  GUIDE_PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_PRESET_ID,
  PLATFORM_FIXER_HREF,
} from "@/lib/guidesRegistry";
import type { GuidePlatform } from "@/lib/guidesRegistry";
import { isValidLocale, LOCALES, DEFAULT_LOCALE, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";

type Props = {
  params: Promise<{ locale: string; platform: string }>;
};

export async function generateStaticParams() {
  const params: { locale: string; platform: string }[] = [];
  for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
    for (const platform of GUIDE_PLATFORMS) {
      params.push({ locale, platform });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, platform } = await params;
  if (!isValidLocale(locale) || !(GUIDE_PLATFORMS as string[]).includes(platform)) return {};
  const p = platform as GuidePlatform;
  const label = PLATFORM_LABEL[p];
  const title = `${label} CSV Import Guides | StriveFormats`;
  return {
    title,
    alternates: {
      canonical: `/${locale}/guides/${platform}`,
    },
  };
}

export default async function LocalePlatformGuidesPage({ params }: Props) {
  const { locale, platform } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) notFound();

  const loc = locale as Locale;
  const p = platform as GuidePlatform;
  const t = await getTranslations(loc);

  const guides = getGuidesByPlatform(p);
  const label = PLATFORM_LABEL[p];
  const presetId = PLATFORM_PRESET_ID[p];
  const fixerHref = PLATFORM_FIXER_HREF[p];

  // Group by category
  const byCategory: Record<string, typeof guides> = {};
  for (const g of guides) {
    if (!byCategory[g.category]) byCategory[g.category] = [];
    byCategory[g.category].push(g);
  }
  const categories = Object.keys(byCategory).sort();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${label} CSV Import Guides`,
    url: `https://striveformats.com/${locale}/guides/${platform}`,
    inLanguage: locale,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="mb-8">
        <div className="text-sm font-semibold uppercase text-[color:rgba(var(--muted-rgb),1)]">
          <Link href={localeHref(loc, "/guides")} className="hover:underline">
            {t.guides.title}
          </Link>{" "}
          / {label}
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{label} CSV Import Guides</h1>
        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          {p === "general"
            ? "General CSV guides for encoding, headers, quoting, line endings, and common import mistakes."
            : `${guides.length} guides covering every validation issue for ${label} CSV imports.`}
        </p>
        {(fixerHref || presetId) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {fixerHref && (
              <Link className="rg-btn" href={fixerHref}>
                {label} CSV Fixer
              </Link>
            )}
            {presetId && (
              <Link className="pill-btn" href={`/app?preset=${presetId}`}>
                {t.common.openWithPreset}
              </Link>
            )}
          </div>
        )}
      </header>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold capitalize text-[var(--text)]">{cat}</h2>
          <ul className="space-y-2">
            {byCategory[cat].map((g) => (
              <li key={g.slug}>
                <Link
                  href={localeHref(loc, `/guides/${platform}/${g.slug}`)}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:border-[var(--ring)]"
                >
                  <div>
                    <div className="font-semibold text-[var(--text)]">{g.title}</div>
                    <div className="mt-0.5 text-sm text-[color:rgba(var(--muted-rgb),1)] line-clamp-1">
                      {g.description}
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 gap-2">
                    {g.blocking && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {t.guide.importBlocker}
                      </span>
                    )}
                    {g.autoFixable && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {t.guide.autoFix}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.guides.needHelp}</h2>
        <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
          {t.guides.needHelpDesc}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="rg-btn" href={presetId ? `/app?preset=${presetId}` : "/app"}>
            {t.guide.openCsvFixer}
          </Link>
          {presetId && (
            <Link className="pill-btn" href={localeHref(loc, `/presets/${presetId}`)}>
              {t.common.viewInformation}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
