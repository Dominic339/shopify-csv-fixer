// src/app/[locale]/presets/[id]/page.tsx
// Locale-prefixed preset detail page (e.g. /es/presets/shopify_products).
// Translates UI chrome; preset name/description/SEO content stays in English
// (these come from the format registry and are proper-noun/SEO-sensitive).

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { getPresetById } from "@/lib/presets";
import { getFormatById } from "@/lib/formats";
import { getPopularGuides } from "@/lib/guides/getPopularGuides";
import type { GuidePlatform } from "@/lib/guidesRegistry";
import { isValidLocale, DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { mergeExampleRow } from "@/app/presets/[id]/presetDetailHelpers";

const SITE_URL = "https://striveformats.com";

const PRESET_TO_PLATFORM: Record<string, GuidePlatform> = {
  shopify_products: "shopify",
  woocommerce_products: "woocommerce",
  woocommerce_variable_products: "woocommerce",
  etsy_listings: "etsy",
  ebay_listings: "ebay",
  ebay_variations: "ebay",
  amazon_inventory_loader: "amazon",
};

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateStaticParams() {
  const presetIds = [
    "shopify_products",
    "woocommerce_products",
    "woocommerce_variable_products",
    "etsy_listings",
    "amazon_inventory_loader",
    "ebay_listings",
    "ebay_variations",
  ];
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((locale) =>
    presetIds.map((id) => ({ locale, id })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id: rawId } = await params;
  if (!isValidLocale(locale)) return {};
  const id = decodeURIComponent(rawId);
  const preset = getPresetById(id);
  if (!preset) return {};
  return {
    title: `${preset.name} | StriveFormats`,
    description: preset.description,
    alternates: { canonical: localeHref(locale as Locale, `/presets/${encodeURIComponent(preset.id)}`) },
  };
}

export default async function LocalePresetDetailPage({ params }: Props) {
  const { locale, id: rawId } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const id = decodeURIComponent(rawId);
  const preset = getPresetById(id) ?? getPresetById(id.replace(/\s+/g, ""));
  if (!preset) notFound();

  const loc = locale as Locale;
  const t = await getTranslations(loc);

  const format = getFormatById(preset.formatId);
  const expectedHeaders = (format as any)?.expectedHeaders as string[] | undefined;
  const headers = Array.isArray(expectedHeaders) && expectedHeaders.length ? expectedHeaders : [];
  const exampleRow = headers.length ? mergeExampleRow(headers, (format as any)?.exampleRow) : null;
  const seo = (format as any)?.seo as
    | { longDescription?: string[]; howItWorks?: string[]; commonFixes?: string[]; faq?: Array<{ q: string; a: string }> }
    | undefined;

  const openFixerHref = localeHref(loc, `/app?preset=${encodeURIComponent(preset.formatId)}`);
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const guidePlatform = PRESET_TO_PLATFORM[preset.id] ?? null;
  const popularGuides = getPopularGuides(guidePlatform, 6);
  const pageUrl = `${SITE_URL}/${locale}/presets/${encodeURIComponent(preset.id)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${preset.name} CSV Template`,
        description: preset.description,
        url: pageUrl,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">{preset.category}</div>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">
              {(t.presets as any)[`name_${preset.id}`] ?? preset.name}
            </h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {(t.presets as any)[`desc_${preset.id}`] ?? preset.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href={openFixerHref}>
              {t.common.openWithPreset}
            </Link>
            <Link className="pill-btn" href={sampleCsvHref}>
              {t.common.downloadSample}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">{t.presets.expectedColumns}</h2>
          {headers.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                  {h}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {t.presets.noColumns}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">{t.presets.exampleRow}</h2>
          {headers.length && exampleRow ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    {headers.slice(0, 12).map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-[var(--text)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {headers.slice(0, 12).map((h) => (
                      <td key={h} className="whitespace-nowrap px-3 py-2 text-[color:rgba(var(--muted-rgb),1)]">
                        {exampleRow[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <div className="border-t border-[var(--border)] px-4 py-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                {t.presets.showingColumns}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 grid gap-7">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">{t.presets.aboutFormat}</h2>
          <div className="mt-3 space-y-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
            {(seo?.longDescription?.length
              ? seo.longDescription
              : ["Use this preset to validate your CSV against the expected template and export a clean, import-ready file."]
            ).map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>

        <div className="grid gap-7 md:grid-cols-2">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">{t.presets.howItWorks}</h2>
            <ol className="mt-4 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {(seo?.howItWorks?.length
                ? seo.howItWorks
                : ["Upload your CSV.", "We validate required fields and normalize common formatting.", "Auto-fix safe issues, then export a clean file."]
              ).map((s, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[var(--surface-2)] text-center text-sm leading-6 text-[var(--text)]">
                    {i + 1}
                  </div>
                  <div>{s}</div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">{t.presets.examplesOfFixes}</h2>
            <ul className="mt-4 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {(seo?.commonFixes?.length
                ? seo.commonFixes
                : ["Trim whitespace and normalize basic fields.", "Flag missing required values.", "Standardize common boolean fields."]
              ).map((s, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                  <div>{s}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {seo?.faq?.length ? (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">{t.presets.faq}</h2>
            <div className="mt-5 space-y-5">
              {seo.faq.map((f, i) => (
                <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                  <div className="text-base font-semibold text-[var(--text)]">{f.q}</div>
                  <div className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">{f.a}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {popularGuides.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-[var(--text)]">{t.common.popularGuides}</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
            {t.common.popularGuidesDesc}
          </p>
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
        <Link href={localeHref(loc, "/presets")} className="hover:underline">
          {t.presets.presetFormats}
        </Link>
        <Link href={`${localeHref(loc, "/")}#pricing`} className="hover:underline">
          {t.nav.pricing}
        </Link>
      </div>
    </main>
  );
}
