// src/app/[locale]/page.tsx
// Localized home page for non-English locales (e.g. /es/, /de/).
// Renders a translated landing section with links to the English tool.

import Link from "next/link";
import type { Metadata } from "next";

import { isValidLocale, LOCALES, DEFAULT_LOCALE, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const t = await getTranslations(locale as Locale);

  // Build hreflang languages map
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = l === DEFAULT_LOCALE
      ? "https://striveformats.com"
      : `https://striveformats.com/${l}`;
  }
  languages["x-default"] = "https://striveformats.com";

  return {
    title: t.home.title,
    description: t.home.description,
    alternates: {
      canonical: localeHref(locale as Locale),
      languages,
    },
  };
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const t = await getTranslations(locale as Locale);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
          StriveFormats
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[color:rgba(var(--muted-rgb),1)]">
          {t.home.description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link className="rg-btn px-8 py-3" href="/app">
            {t.nav.csvFixer}
          </Link>
          <Link className="pill-btn px-8 py-3" href={localeHref(locale as Locale, "/guides")}>
            {t.nav.guides}
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/app"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--ring)]"
        >
          <div className="text-lg font-semibold text-[var(--text)]">{t.nav.csvFixer}</div>
          <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            {t.home.description}
          </p>
        </Link>

        <Link
          href="/presets"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--ring)]"
        >
          <div className="text-lg font-semibold text-[var(--text)]">{t.nav.templates}</div>
          <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            {t.common.platformFixersDesc}
          </p>
        </Link>

        <Link
          href={localeHref(locale as Locale, "/guides")}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--ring)]"
        >
          <div className="text-lg font-semibold text-[var(--text)]">{t.nav.guides}</div>
          <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            {t.common.popularGuidesDesc}
          </p>
        </Link>
      </div>
    </main>
  );
}
