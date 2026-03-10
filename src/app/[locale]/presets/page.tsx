// src/app/[locale]/presets/page.tsx
// Localized presets listing page (e.g. /es/presets, /de/presets).

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import { getPresetFormats } from "@/lib/presets";
import { getPopularGuides } from "@/lib/guides/getPopularGuides";
import { isValidLocale, LOCALES, DEFAULT_LOCALE, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";

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
  return {
    title: `${t.presets.title} | StriveFormats`,
    description: t.presets.description,
    alternates: { canonical: localeHref(locale as Locale, "/presets") },
  };
}

export default async function LocalePresetsPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const t = await getTranslations(locale as Locale);
  const loc = locale as Locale;

  const presets = getPresetFormats();
  const popularGuides = getPopularGuides(null, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.presets.title,
    description: t.presets.description,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-[var(--text)]">{t.presets.title}</h1>
        <p className="mt-3 max-w-3xl text-base text-[color:rgba(var(--muted-rgb),1)]">{t.presets.description}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {presets.map((p) => (
          <div key={p.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">{p.category}</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">{p.name}</h2>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{p.description}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rg-btn" href={`/app?preset=${encodeURIComponent(p.formatId)}`}>
                {t.common.openWithPreset}
              </Link>
              <Link className="rg-btn" href={`/presets/${encodeURIComponent(p.id)}`}>
                {t.common.viewInformation}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-[var(--text)]">{t.common.platformFixers}</h2>
        <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">{t.common.platformFixersDesc}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/shopify-csv-fixer", label: "Shopify CSV Fixer" },
            { href: "/woocommerce-csv-fixer", label: "WooCommerce CSV Fixer" },
            { href: "/woocommerce-variable-csv-fixer", label: "WooCommerce Variations Fixer" },
            { href: "/etsy-csv-fixer", label: "Etsy CSV Fixer" },
            { href: "/ebay-csv-fixer", label: "eBay CSV Fixer" },
            { href: "/ebay-variations-csv-fixer", label: "eBay Variations Fixer" },
            { href: "/amazon-csv-fixer", label: "Amazon CSV Fixer" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-base font-semibold text-[var(--text)] hover:border-[var(--ring)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {popularGuides.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">{t.common.popularGuides}</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">{t.common.popularGuidesDesc}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularGuides.map((g) => (
              <Link
                key={`${g.platform}/${g.slug}`}
                href={localeHref(loc, `/guides/${g.platform}/${g.slug}`)}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
              >
                <div className="text-xs text-[color:rgba(var(--muted-rgb),0.7)] capitalize">{g.platform}</div>
                <div className="mt-1 font-semibold text-[var(--text)]">{g.title}</div>
                <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)] line-clamp-2">{g.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5">
            <Link href={localeHref(loc, "/guides")} className="text-base text-[var(--accent)] hover:underline">
              {t.common.browseAllGuides} &rarr;
            </Link>
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/app" className="hover:underline">
          {t.nav.csvFixer}
        </Link>
        <Link href="/#pricing" className="hover:underline">
          {t.nav.pricing}
        </Link>
      </div>
    </main>
  );
}
