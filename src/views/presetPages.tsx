// src/views/presetPages.tsx
// Preset list (/presets) and preset detail (/presets/<id>) pages, shared by the English
// and /[locale] routes. Preset write-ups come from the format registry and are English;
// localized copies translate the page chrome and point their canonical at English.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { Orbs, PageHero } from "@/components/ui/Decor";
import { getPresetById, getPresetFormats } from "@/lib/presets";
import { getFormatById } from "@/lib/formats";
import { getPopularGuides } from "@/lib/guides/getPopularGuides";
import { guideLocalizer, loadContent } from "@/lib/guides/localizeGuide";
import { loadValidationDicts, validationText } from "@/lib/i18n/validationText";
import { issueCodeToSlug, type GuidePlatform } from "@/lib/guidesRegistry";
import { ISSUE_META_REGISTRY } from "@/lib/validation/issueMetaRegistry";
import type { IssueMeta } from "@/lib/validation/issueMeta";
import { fmt, getTranslations, platformLabel, presetText, type Translations } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import { fitDescription, pageAlternates, seoTitle, SHARE_IMAGES, SITE_URL } from "@/lib/i18n/seo";
import { mergeExampleRow } from "@/app/(en)/presets/[id]/presetDetailHelpers";

export const PRESET_TO_PLATFORM: Record<string, GuidePlatform> = {
  shopify_products: "shopify",
  woocommerce_products: "woocommerce",
  woocommerce_variable_products: "woocommerce",
  etsy_listings: "etsy",
  ebay_listings: "ebay",
  ebay_variations: "ebay",
  amazon_inventory_loader: "amazon",
  google_merchant_center: "google",
  meta_catalog: "meta",
};

const KEYWORDS: Record<string, string[]> = {
  shopify_products: ["shopify csv template", "shopify product csv", "shopify import csv", "shopify csv fixer", "fix shopify csv", "shopify variants csv", "shopify product import errors"],
  woocommerce_products: ["woocommerce csv template", "woocommerce product csv", "woocommerce import csv", "fix woocommerce csv", "woocommerce product import"],
  woocommerce_variable_products: ["woocommerce variable products csv", "woocommerce variations csv", "fix woocommerce variations", "woocommerce product attributes csv"],
  etsy_listings: ["etsy listing csv", "etsy csv template", "fix etsy csv", "etsy listing export", "etsy bulk edit csv"],
  ebay_listings: ["ebay listing csv", "ebay file exchange csv", "ebay bulk upload csv", "fix ebay csv", "ebay csv template"],
  ebay_variations: ["ebay variations csv", "ebay relationshipdetails", "ebay variation listing csv", "fix ebay variations"],
  amazon_inventory_loader: ["amazon inventory loader", "amazon inventory file", "amazon flat file csv", "fix amazon csv", "amazon product-id-type"],
  google_merchant_center: ["google merchant center feed", "google shopping feed template", "merchant center product data", "fix google shopping feed", "google shopping feed errors"],
  meta_catalog: ["facebook catalog feed", "meta catalog csv template", "instagram shopping feed", "commerce manager data feed", "facebook product feed errors"],
  tiktok_catalog: ["tiktok catalog feed", "tiktok product feed template", "tiktok ads catalog csv", "tiktok catalog upload errors", "tiktok sku_id"],
};

const FIXER_PAGES: Array<{ href: string; platform: string; variations?: boolean }> = [
  { href: "/shopify-csv-fixer", platform: "Shopify" },
  { href: "/woocommerce-csv-fixer", platform: "WooCommerce" },
  { href: "/woocommerce-variable-csv-fixer", platform: "WooCommerce", variations: true },
  { href: "/etsy-csv-fixer", platform: "Etsy" },
  { href: "/ebay-csv-fixer", platform: "eBay" },
  { href: "/ebay-variations-csv-fixer", platform: "eBay", variations: true },
  { href: "/amazon-csv-fixer", platform: "Amazon" },
  { href: "/google-merchant-center-feed-checker", platform: "Google Merchant Center" },
  { href: "/meta-catalog-feed-checker", platform: "Meta" },
];

const muted = "text-[color:rgba(var(--muted-rgb),1)]";
const card = "rounded-3xl border border-[var(--border)] bg-[var(--surface)]";

async function PopularGuides({ t, locale, platform }: { t: Translations; locale: Locale; platform: GuidePlatform | null }) {
  const L = await guideLocalizer(locale);
  const guides = getPopularGuides(platform, 6).map(L);
  if (!guides.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.common.popularGuides}</h2>
      <p className={`mt-2 text-base ${muted}`}>{t.common.popularGuidesDesc}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <Link key={`${g.platform}/${g.slug}`} href={localeHref(locale, `/guides/${g.platform}/${g.slug}`)} className={`${card} lift p-5`}>
            <div className="text-xs text-[var(--muted)]">{platformLabel(t, g.platform)}</div>
            <div className="mt-1 font-semibold text-[var(--text)]">{g.title}</div>
            <p className={`mt-1 line-clamp-2 text-sm ${muted}`}>{g.description}</p>
          </Link>
        ))}
      </div>
      <div className="mt-5">
        <Link href={localeHref(locale, "/guides")} className="text-base text-[var(--accent)] hover:underline">
          {t.common.browseAllGuides} &rarr;
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// /presets
// ---------------------------------------------------------------------------

export async function presetsMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations(locale);
  return {
    title: seoTitle(t.presets.title),
    description: fitDescription(t.presets.description),
    alternates: pageAlternates(locale, "/presets"),
    openGraph: { images: SHARE_IMAGES, title: t.presets.title, description: t.presets.description, url: `${SITE_URL}${localeHref(locale, "/presets")}` },
  };
}

export async function PresetsView({ locale }: { locale: Locale }) {
  const t = await getTranslations(locale);
  const presets = getPresetFormats();
  const href = (p: string) => localeHref(locale, p);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: t.presets.title, description: t.presets.description, inLanguage: locale }} />

      <PageHero
        title={t.presets.title}
        intro={
          <>
            {t.presets.description}
            <span className="mt-2 block text-sm leading-6">{t.presets.checksShared}</span>
          </>
        }
        stat={{ value: presets.length, label: t.presets.title }}
      />

      {/* Template cards: a check-count bubble each, offset into two staggered columns */}
      <div className="grid gap-5 md:grid-cols-2">
        {presets.map((p, i) => {
          const checks = Object.values(ISSUE_META_REGISTRY[p.formatId] ?? {}).filter((m) => m.checked !== false).length;
          return (
            <div key={p.id} className={`${card} lift relative flex flex-col overflow-hidden p-6 sm:p-7 ${i % 2 === 1 ? "md:translate-y-8" : ""}`}>
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.16),transparent_70%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--secondary-text)]">{platformLabel(t, PRESET_TO_PLATFORM[p.id]) ?? p.category}</div>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[var(--text)]">{presetText(t, p.id, "name") ?? p.name}</h2>
                </div>
                {checks > 0 && (
                  <span title={fmt(t.presets.checksCount, { count: checks })} className="glass flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full text-center">
                    <svg aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                    </svg>
                    <span aria-hidden="true" className="mt-0.5 text-lg font-extrabold leading-none text-[var(--accent-text)]">{checks}</span>
                    <span className="sr-only">{fmt(t.presets.checksCount, { count: checks })}</span>
                  </span>
                )}
              </div>
              <p className={`relative mt-3 flex-1 text-base ${muted}`}>{presetText(t, p.id, "desc") ?? p.description}</p>
              <div className="relative mt-6 flex flex-wrap gap-3">
                <Link className="btn-primary rounded-full px-5 py-2.5" href={`${href("/app")}?preset=${encodeURIComponent(p.formatId)}`}>
                  {t.common.openWithPreset} →
                </Link>
                <Link className="rgb-btn rounded-full px-5 py-2.5" href={href(`/presets/${encodeURIComponent(p.id)}`)}>
                  {t.common.viewInformation}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.common.platformFixers}</h2>
        <p className={`mt-2 text-base ${muted}`}>{t.common.platformFixersDesc}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIXER_PAGES.map(({ href: h, platform, variations }) => (
            <Link key={h} href={href(h)} className="lift group flex items-center justify-between gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] py-3 pl-5 pr-3 text-sm font-semibold text-[var(--text)]">
              {fmt(variations ? t.presets.variationsFixer : t.guides.fixerButton, { platform })}
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
        </div>
      </section>

      <PopularGuides t={t} locale={locale} platform={null} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// /presets/<id>
// ---------------------------------------------------------------------------

function findPreset(rawId: string) {
  const id = decodeURIComponent(rawId);
  return getPresetById(id) ?? getPresetById(id.replace(/\s+/g, ""));
}

export async function presetDetailMetadata(locale: Locale, rawId: string): Promise<Metadata> {
  const preset = findPreset(rawId);
  if (!preset) return { title: "Template" };
  const t = await getTranslations(locale);
  const name = presetText(t, preset.id, "name") ?? preset.name;
  const description = fitDescription(presetText(t, preset.id, "desc") ?? preset.description);
  const path = `/presets/${encodeURIComponent(preset.id)}`;
  const title = fmt(t.presets.templateTitle, { name });
  return {
    title: seoTitle(title),
    description,
    keywords: KEYWORDS[preset.id],
    alternates: pageAlternates(locale, path),
    openGraph: { images: SHARE_IMAGES, title, description, url: `${SITE_URL}${localeHref(locale, path)}`, type: "website" },
  };
}

type FormatSeo = {
  longDescription?: string[];
  howItWorks?: string[];
  commonFixes?: string[];
  faq?: Array<{ q: string; a: string }>;
};

function CheckList({ title, items, platform, locale, autoFixLabel }: { title: string; items: IssueMeta[]; platform: GuidePlatform; locale: Locale; autoFixLabel?: string }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <div className="text-base font-semibold text-[var(--text)]">
        {title} <span className={`font-normal ${muted}`}>({items.length})</span>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map((m) => (
          <li key={m.code}>
            <Link href={localeHref(locale, `/guides/${platform}/${issueCodeToSlug(m.code)}`)} className="font-medium text-[var(--text)] hover:underline">
              {m.title}
            </Link>
            {autoFixLabel && m.autoFixable && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {autoFixLabel}
              </span>
            )}
            <p className={`mt-0.5 text-sm ${muted}`}>{m.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function PresetDetailView({ locale, rawId }: { locale: Locale; rawId: string }) {
  const preset = findPreset(rawId);
  if (!preset) notFound();

  const t = await getTranslations(locale);
  const href = (p: string) => localeHref(locale, p);
  const format = getFormatById(preset.formatId);
  const headers = format.expectedHeaders ?? [];
  const exampleRow = headers.length ? mergeExampleRow(headers, format.exampleRow) : null;
  // The write-up in this language where translated, field by field, else English.
  const english = (format.seo ?? {}) as FormatSeo;
  const local = (await loadContent(locale)).presets[preset.formatId] ?? {};
  const seo: FormatSeo = {
    longDescription: local.longDescription?.length ? local.longDescription : english.longDescription,
    howItWorks: local.howItWorks?.length ? local.howItWorks : english.howItWorks,
    commonFixes: local.commonFixes?.length ? local.commonFixes : english.commonFixes,
    faq: local.faq?.length ? local.faq : english.faq,
  };
  const platform = PRESET_TO_PLATFORM[preset.id] ?? null;

  const name = presetText(t, preset.id, "name") ?? preset.name;
  const description = presetText(t, preset.id, "desc") ?? preset.description;
  const openFixerHref = `${href("/app")}?preset=${encodeURIComponent(preset.formatId)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;
  const pageUrl = `${SITE_URL}/presets/${encodeURIComponent(preset.id)}`;

  // What this preset actually checks, straight from the validator's issue metadata.
  const vt = validationText(await loadValidationDicts(locale));
  const checks = Object.values(ISSUE_META_REGISTRY[preset.formatId] ?? {})
    .filter((m) => m.checked !== false)
    .map((m) => vt.meta(m));
  const blocking = checks.filter((m) => m.blocking);
  const autoFixed = checks.filter((m) => !m.blocking && m.autoFixable);
  const review = checks.filter((m) => !m.blocking && !m.autoFixable);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: `${preset.name} CSV Template`, description: preset.description, url: pageUrl },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "CSV Templates", item: `${SITE_URL}/presets` },
          { "@type": "ListItem", position: 3, name: preset.name, item: pageUrl },
        ],
      },
      ...(seo.faq?.length
        ? [{ "@type": "FAQPage", mainEntity: seo.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
        : []),
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={jsonLd} />

      <div className="hero-glow relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <Orbs size="sm" />
        <span aria-hidden="true" className="absolute left-4 top-4 h-7 w-7 border-l-[3px] border-t-[3px] border-[var(--accent)] opacity-60" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className={`text-sm ${muted}`}>
              <Link href={href("/presets")} className="hover:underline">
                {t.presets.presetFormats}
              </Link>
              {platform ? ` / ${platformLabel(t, platform)}` : null}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">{name}</h1>
            <p className={`mt-3 text-base leading-7 sm:text-lg ${muted}`}>{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="btn-primary rounded-full px-6 py-3" href={openFixerHref}>
              {t.common.openWithPreset} →
            </Link>
            <Link className="rgb-btn rounded-full px-6 py-3" href={sampleCsvHref}>
              {t.common.downloadSample}
            </Link>
          </div>
        </div>
      </div>

      {locale !== DEFAULT_LOCALE && <p className={`mt-4 text-sm ${muted}`}>{t.presets.englishContent}</p>}

      {checks.length > 0 && platform && (
        <section className="mt-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.checksTitle}</h2>
          <p className={`mt-2 text-base ${muted}`}>{fmt(t.presets.checksIntro, { count: checks.length })}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <CheckList title={t.presets.checksBlocking} items={blocking} platform={platform} locale={locale} autoFixLabel={t.guide.autoFix} />
            <CheckList title={t.presets.checksAutoFixed} items={autoFixed} platform={platform} locale={locale} />
            <CheckList title={t.presets.checksReview} items={review} platform={platform} locale={locale} />
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className={`${card} min-w-0 p-6 sm:p-7`}>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.expectedColumns}</h2>
          {headers.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="break-words rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                  {h}
                </div>
              ))}
            </div>
          ) : (
            <p className={`mt-3 text-base ${muted}`}>{t.presets.noColumns}</p>
          )}
        </section>

        <section className={`${card} min-w-0 p-6 sm:p-7`}>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.exampleRow}</h2>
          {exampleRow ? (
            <div tabIndex={0} role="region" aria-label={t.presets.exampleRow} className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="w-full min-w-[600px] text-sm">
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
                      <td key={h} className={`whitespace-nowrap px-3 py-2 ${muted}`}>
                        {exampleRow[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
          {headers.length > 12 && <p className={`mt-3 text-sm ${muted}`}>{t.presets.showingColumns}</p>}
        </section>
      </div>

      <div className="mt-8 grid gap-6">
        {seo.longDescription?.length ? (
          <section className={`${card} p-6 sm:p-7`}>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.aboutFormat}</h2>
            <div className={`mt-3 space-y-3 text-base ${muted}`}>
              {seo.longDescription.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {seo.howItWorks?.length ? (
            <section className={`${card} p-6 sm:p-7`}>
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.howItWorks}</h2>
              <ol className={`mt-4 space-y-2 text-base ${muted}`}>
                {seo.howItWorks.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[var(--surface-2)] text-center text-sm leading-6 text-[var(--text)]">{i + 1}</div>
                    <div>{s}</div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {seo.commonFixes?.length ? (
            <section className={`${card} p-6 sm:p-7`}>
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.examplesOfFixes}</h2>
              <ul className={`mt-4 space-y-2 text-base ${muted}`}>
                {seo.commonFixes.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                    <div>{s}</div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {seo.faq?.length ? (
          <section className={`${card} p-6 sm:p-7`}>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.presets.faq}</h2>
            <div className="mt-5 space-y-4">
              {seo.faq.map((f, i) => (
                <details key={i} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5" open={i === 0}>
                  <summary className="cursor-pointer list-none text-base font-semibold text-[var(--text)]">{f.q}</summary>
                  <div className={`mt-2 text-base ${muted}`}>{f.a}</div>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <PopularGuides t={t} locale={locale} platform={platform} />
    </main>
  );
}
