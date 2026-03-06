// src/app/[locale]/guides/page.tsx
// Localized guides hub page (e.g. /es/guides, /de/guides).
// Renders translated UI around the same guide registry data.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAllGuides, GUIDE_PLATFORMS, PLATFORM_LABEL, PLATFORM_FIXER_HREF } from "@/lib/guidesRegistry";
import type { GuidePlatform } from "@/lib/guidesRegistry";
import { isValidLocale, LOCALES, DEFAULT_LOCALE, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";
import JsonLd from "@/components/JsonLd";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const t = await getTranslations(locale as Locale);

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = l === DEFAULT_LOCALE
      ? "https://striveformats.com/guides"
      : `https://striveformats.com/${l}/guides`;
  }
  languages["x-default"] = "https://striveformats.com/guides";

  return {
    title: t.guides.title,
    description: t.guides.description,
    alternates: {
      canonical: localeHref(locale as Locale, "/guides"),
      languages,
    },
  };
}

export default async function LocaleGuidesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const t = await getTranslations(locale as Locale);
  const loc = locale as Locale;

  const { q = "" } = await searchParams;
  const allGuides = getAllGuides();

  const filtered = q
    ? allGuides.filter(
        (g) =>
          g.title.toLowerCase().includes(q.toLowerCase()) ||
          g.description.toLowerCase().includes(q.toLowerCase()) ||
          g.keywords.some((k) => k.toLowerCase().includes(q.toLowerCase())),
      )
    : allGuides;

  const platformCounts: Partial<Record<GuidePlatform, number>> = {};
  for (const g of allGuides) {
    platformCounts[g.platform] = (platformCounts[g.platform] ?? 0) + 1;
  }

  const featuredGuides = allGuides.filter((g) => g.kind === "curated").slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.guides.title,
    description: t.guides.description,
    url: `https://striveformats.com/${locale}/guides`,
    inLanguage: locale,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--text)]">{t.guides.title}</h1>
        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          {t.guides.description}
        </p>
      </header>

      {q ? (
        <section>
          <div className="mb-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            {filtered.length} {filtered.length !== 1 ? t.guides.results : t.guides.result}{" "}
            &ldquo;{q}&rdquo;
          </div>
          {filtered.length === 0 ? (
            <p className="text-base text-[color:rgba(var(--muted-rgb),1)]">{t.guides.noResults}</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((g) => (
                <li key={`${g.platform}/${g.slug}`}>
                  <Link
                    href={localeHref(loc, `/guides/${g.platform}/${g.slug}`)}
                    className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-[color:rgba(var(--muted-rgb),1)]">
                        {PLATFORM_LABEL[g.platform]}
                      </span>
                      {g.kind === "curated" && (
                        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                          {t.guides.guideLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-semibold text-[var(--text)]">{g.title}</div>
                    <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)] line-clamp-2">{g.description}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">{t.guides.browseByPlatform}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GUIDE_PLATFORMS.map((p) => {
                const count = platformCounts[p] ?? 0;
                return (
                  <Link
                    key={p}
                    href={localeHref(loc, `/guides/${p}`)}
                    className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
                  >
                    <div className="font-semibold text-[var(--text)]">{PLATFORM_LABEL[p]}</div>
                    <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                      {count} {count !== 1 ? t.guides.guidesCount : t.guides.guideCount}
                    </div>
                    {PLATFORM_FIXER_HREF[p] && (
                      <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">
                        {t.guides.includesFixer}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {featuredGuides.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">{t.guides.featuredGuides}</h2>
              <ul className="space-y-3">
                {featuredGuides.map((g) => (
                  <li key={`${g.platform}/${g.slug}`}>
                    <Link
                      href={localeHref(loc, `/guides/${g.platform}/${g.slug}`)}
                      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
                    >
                      <div className="text-xs font-semibold uppercase text-[color:rgba(var(--muted-rgb),1)]">
                        {PLATFORM_LABEL[g.platform]}
                      </div>
                      <div className="mt-1 font-semibold text-[var(--text)]">{g.title}</div>
                      <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)] line-clamp-2">{g.description}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">{t.guides.needHelp}</h2>
            <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {t.guides.needHelpDesc}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="rg-btn" href="/app">
                {t.guide.openCsvFixer}
              </Link>
              <Link className="pill-btn" href="/presets">
                {t.guides.browseTemplates}
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
