// src/views/guidePages.tsx
// Guide hub, platform list and guide article pages, shared by the English and /[locale]
// routes. Guide content is English; localized copies translate the page chrome and point
// their canonical at the English guide.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { SheetFix } from "@/components/guides/SheetFix";
import { Screenshot } from "@/components/ui/Screenshot";
import { sheetExampleFor } from "@/lib/guides/sheetExamples";

import JsonLd from "@/components/JsonLd";
import { CtaPanel, Orbs, PageHero } from "@/components/ui/Decor";
import MdxGuideToc from "@/components/MdxGuideToc";
import Breadcrumbs from "@/components/Breadcrumbs";
import GuideSidebar from "@/components/GuideSidebar";
import {
  getAllGuides,
  getGuide,
  getGuidesByPlatform,
  GUIDE_PLATFORMS,
  PLATFORM_PRESET_ID,
  PLATFORM_FIXER_HREF,
  type Guide,
  type GuidePlatform,
} from "@/lib/guidesRegistry";
import { guideLocalizer, guideTextTranslator } from "@/lib/guides/localizeGuide";
import { readCuratedGuide } from "@/lib/guides/mdxLoader";
import { expandIssueContent, classifyIssue } from "@/lib/guides/issueGuideExpander";
import { extractTocFromMdx } from "@/lib/guides/mdxHeadings";
import { rehypeWrapSections } from "@/lib/guides/rehypeWrapSections";
import { fmt, getTranslations, platformLabel, type Translations } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/locales";
import { fitDescription, fitTitle, pageAlternates, seoTitle, SHARE_IMAGES, SITE_URL } from "@/lib/i18n/seo";
import { mdxGuideComponentsFor } from "@/views/mdxGuideComponents";

const muted = "text-[color:rgba(var(--muted-rgb),1)]";
const card = "rounded-2xl border border-[var(--border)] bg-[var(--surface)]";

/** A colour per platform for the guides hub tiles (matches the landing pages). */
const PLATFORM_TONE: Record<string, { text: string; glow: string }> = {
  shopify: { text: "text-emerald-700 dark:text-green-400", glow: "rgba(16,185,129,0.22)" },
  woocommerce: { text: "text-purple-700 dark:text-purple-400", glow: "rgba(147,51,234,0.2)" },
  etsy: { text: "text-orange-700 dark:text-orange-400", glow: "rgba(234,88,12,0.2)" },
  ebay: { text: "text-sky-700 dark:text-sky-400", glow: "rgba(14,165,233,0.22)" },
  amazon: { text: "text-amber-700 dark:text-amber-400", glow: "rgba(245,158,11,0.22)" },
  google: { text: "text-blue-700 dark:text-blue-400", glow: "rgba(59,130,246,0.22)" },
  general: { text: "text-[var(--secondary-text)]", glow: "rgba(var(--secondary-rgb),0.2)" },
};
const badgeRed = "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400";
const badgeGreen = "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400";

function isPlatform(p: string): p is GuidePlatform {
  return (GUIDE_PLATFORMS as string[]).includes(p);
}

function categoryLabel(t: Translations, category: string) {
  return (t.guides.categories as Record<string, string>)[category] ?? category;
}

// ---------------------------------------------------------------------------
// Layout shell: sidebar on desktop, search + platform chips on mobile
// ---------------------------------------------------------------------------

export async function GuidesShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = await getTranslations(locale);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:gap-10 md:py-14">
      <GuideSidebar searchPlaceholder={t.guides.searchPlaceholder} allGuides={t.guides.allGuides} platformsLabel={t.guides.platformsLabel} generalLabel={t.guides.categories.general} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// /guides
// ---------------------------------------------------------------------------

export async function guidesHubMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations(locale);
  return {
    title: seoTitle(t.guides.title),
    description: fitDescription(t.guides.description),
    alternates: pageAlternates(locale, "/guides"),
    openGraph: { images: SHARE_IMAGES, title: t.guides.title, description: t.guides.description, url: `${SITE_URL}${localeHref(locale, "/guides")}` },
  };
}

function GuideLink({ g, locale, t }: { g: Guide; locale: Locale; t: Translations }) {
  return (
    <Link href={localeHref(locale, `/guides/${g.platform}/${g.slug}`)} className={`${card} lift group block h-full rounded-3xl p-5`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold uppercase ${muted}`}>{platformLabel(t, g.platform)}</span>
        {g.kind === "curated" && <span className={`rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs ${muted}`}>{t.guides.guideLabel}</span>}
      </div>
      <div className="mt-1 flex items-start justify-between gap-3 font-semibold text-[var(--text)]">
        {g.title}
        <span aria-hidden="true" className="mt-0.5 text-[var(--accent-text)] transition-transform group-hover:translate-x-1">→</span>
      </div>
      <div className={`mt-1 line-clamp-2 text-sm ${muted}`}>{g.description}</div>
    </Link>
  );
}

export async function GuidesHubView({ locale, q = "" }: { locale: Locale; q?: string }) {
  const t = await getTranslations(locale);
  const L = await guideLocalizer(locale);
  const all = getAllGuides().map(L);
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? all.filter(
        (g) =>
          g.title.toLowerCase().includes(needle) ||
          g.description.toLowerCase().includes(needle) ||
          g.keywords.some((k) => k.toLowerCase().includes(needle))
      )
    : all;

  const counts: Partial<Record<GuidePlatform, number>> = {};
  for (const g of all) counts[g.platform] = (counts[g.platform] ?? 0) + 1;
  const featured = all.filter((g) => g.kind === "curated").slice(0, 6);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: t.guides.title, description: t.guides.description, url: `${SITE_URL}${localeHref(locale, "/guides")}` }} />

      <PageHero title={t.guides.title} intro={t.guides.hubIntro} stat={{ value: all.length, label: t.guides.guidesCount }} />

      {needle ? (
        <section>
          <div className={`mb-4 text-sm ${muted}`}>
            {fmt(filtered.length === 1 ? t.guides.resultFor : t.guides.resultsFor, { count: filtered.length, q })}
          </div>
          {filtered.length === 0 ? (
            <p className={`text-base ${muted}`}>{t.guides.noResults}</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((g) => (
                <li key={`${g.platform}/${g.slug}`}>
                  <GuideLink g={g} locale={locale} t={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.guides.browseByPlatform}</h2>
            {/* Platform tiles: a coloured glow each, the first one wide */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GUIDE_PLATFORMS.map((p, i) => {
                const count = counts[p] ?? 0;
                const tone = PLATFORM_TONE[p] ?? PLATFORM_TONE.general;
                return (
                  <Link
                    key={p}
                    href={localeHref(locale, `/guides/${p}`)}
                    className={`lift group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 ${i === 0 ? "sm:col-span-2" : ""} ${i === GUIDE_PLATFORMS.length - 1 ? "lg:col-span-2" : ""}`}
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${tone.glow}, transparent 70%)` }} />
                    <div className={`relative text-xs font-bold uppercase tracking-[0.14em] ${tone.text}`}>{platformLabel(t, p)}</div>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                      <span>
                        <span className="text-4xl font-extrabold leading-none text-[var(--text)]">{count}</span>{" "}
                        <span className={`text-sm ${muted}`}>{count === 1 ? t.guides.guideCount : t.guides.guidesCount}</span>
                      </span>
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform group-hover:translate-x-0.5">→</span>
                    </div>
                    {PLATFORM_FIXER_HREF[p] && <div className="relative mt-3 inline-flex w-fit rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--muted)]">{t.guides.includesFixer}</div>}
                  </Link>
                );
              })}
            </div>
          </section>

          {featured.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-[var(--text)]">{t.guides.featuredGuides}</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {featured.map((g) => (
                  <li key={`${g.platform}/${g.slug}`}>
                    <GuideLink g={g} locale={locale} t={t} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CtaPanel
            title={t.guides.needHelp}
            desc={t.guides.needHelpDesc}
            primary={{ href: localeHref(locale, "/app"), label: t.guide.openCsvFixer }}
            secondary={{ href: localeHref(locale, "/presets"), label: t.guides.browseTemplates }}
          />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// /guides/<platform>
// ---------------------------------------------------------------------------

export async function guidesPlatformMetadata(locale: Locale, platform: string): Promise<Metadata> {
  if (!isPlatform(platform)) return {};
  const t = await getTranslations(locale);
  const label = platformLabel(t, platform);
  // "General" doesn't fit the "{platform} CSV Import Guides" pattern in every language.
  const title = fitTitle(platform === "general" ? t.guides.generalGuidesTitle : fmt(t.guides.platformTitle, { platform: label }));
  const description = fitDescription(platform === "general" ? t.guides.generalGuidesDesc : fmt(t.guides.platformMetaDesc, { platform: label }));
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, `/guides/${platform}`),
    openGraph: { images: SHARE_IMAGES, title, description },
  };
}

export async function GuidesPlatformView({ locale, platform }: { locale: Locale; platform: string }) {
  if (!isPlatform(platform)) notFound();
  const t = await getTranslations(locale);
  const href = (path: string) => localeHref(locale, path);
  const L = await guideLocalizer(locale);
  const guides = getGuidesByPlatform(platform).map(L);
  const label = platformLabel(t, platform);
  const presetId = PLATFORM_PRESET_ID[platform];
  const fixerHref = PLATFORM_FIXER_HREF[platform];
  const fixerAppHref = presetId ? `${href("/app")}?preset=${presetId}` : href("/app");

  const byCategory: Record<string, Guide[]> = {};
  for (const g of guides) (byCategory[g.category] ??= []).push(g);
  const categories = Object.keys(byCategory).sort();

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: fmt(t.guides.platformTitle, { platform: label }), url: `${SITE_URL}/guides/${platform}` }} />

      <PageHero
        eyebrow={
          <>
            <Link href={href("/guides")} className="hover:underline">
              {t.nav.guides}
            </Link>{" "}
            / {label}
          </>
        }
        title={platform === "general" ? t.guides.generalGuidesTitle : fmt(t.guides.platformTitle, { platform: label })}
        intro={platform === "general" ? t.guides.generalGuidesDesc : fmt(t.guides.platformDesc, { count: guides.length, platform: label })}
        stat={{ value: guides.length, label: guides.length === 1 ? t.guides.guideCount : t.guides.guidesCount }}
      >
        {fixerHref && (
          <Link className="btn-primary rounded-full px-6 py-3" href={href(fixerHref)}>
            {fmt(t.guides.fixerButton, { platform: label })} →
          </Link>
        )}
        {presetId && (
          <Link className="rgb-btn rounded-full px-6 py-3" href={fixerAppHref}>
            {t.common.openWithPreset}
          </Link>
        )}
      </PageHero>

      {categories.map((cat) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold tracking-tight text-[var(--text)]">
            {categoryLabel(t, cat)}
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent-text)]">{byCategory[cat].length}</span>
          </h2>
          <ul className="space-y-2">
            {byCategory[cat].map((g) => (
              <li key={g.slug}>
                <Link href={href(`/guides/${platform}/${g.slug}`)} className={`${card} lift group flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text)]">{g.title}</div>
                    <div className={`mt-0.5 line-clamp-2 text-sm sm:line-clamp-1 ${muted}`}>{g.description}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {g.blocking && <span className={badgeRed}>{t.guides.blocking}</span>}
                    {g.autoFixable && <span className={badgeGreen}>{t.guide.autoFix}</span>}
                    <span aria-hidden="true" className="hidden text-[var(--accent-text)] transition-transform group-hover:translate-x-1 sm:inline">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <CtaPanel
        title={t.guides.needHelp}
        desc={fmt(t.guides.needHelpPlatform, { platform: label })}
        primary={{ href: fixerAppHref, label: t.guide.openCsvFixer }}
        secondary={presetId ? { href: href(`/presets/${presetId}`), label: t.guide.viewTemplate } : undefined}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// /guides/<platform>/<slug>
// ---------------------------------------------------------------------------

/** The languages other than English that have this guide's body (others show English). */
async function guideBodyLocales(g: Guide): Promise<Locale[]> {
  const others = LOCALES.filter((l) => l !== DEFAULT_LOCALE);
  if (g.kind === "curated") return others.filter((l) => readCuratedGuide(g.platform, g.slug, l)?.translated);
  const has = await Promise.all(others.map(async (l) => (await guideTextTranslator(l)).translated));
  return others.filter((_, i) => has[i]);
}

export async function guideMetadata(locale: Locale, platform: string, slug: string): Promise<Metadata> {
  if (!isPlatform(platform)) return {};
  const english = getGuide(platform, slug);
  const guide = (await guideLocalizer(locale))(english);
  if (!english || !guide) return {};
  const t = await getTranslations(locale);
  const label = platformLabel(t, guide.platform);
  // "{title} | Shopify CSV Guide": the platform part is dropped first when the title is long,
  // and left out for general guides ("CSV guide for General" reads badly in most languages).
  const guidePart = fmt(t.guide.metaTitle, { title: "\u0000", platform: label }).split("\u0000").join("").replace(/^\s*\|\s*/, "");
  let title = fitTitle(guide.title, guide.platform === "general" ? null : guidePart);
  // Issue guides share titles across platforms ("Invalid image URL"); keep the platform name at least.
  if (guide.platform !== "general" && !title.includes(label)) {
    const short = fitTitle(guide.title, label);
    title = short.includes(label) ? short : `${title} | ${label}`;
  }
  const description = fitDescription(
    guide.kind === "issue" ? fmt(t.guide.metaIssueDescription, { description: guide.description, platform: label }) : guide.description,
  );
  const bodyLocales = await guideBodyLocales(english);
  const translated = locale === DEFAULT_LOCALE || bodyLocales.includes(locale);
  const path = `/guides/${platform}/${slug}`;
  const url = `${SITE_URL}${localeHref(translated ? locale : DEFAULT_LOCALE, path)}`;
  return {
    title: { absolute: title },
    description,
    keywords: [guide.title, `${label} CSV`, `${label} import error`, `fix ${guide.title.toLowerCase()}`, guide.category, "csv import", ...guide.keywords],
    // Until a language has the article body, its copy points its canonical at the English page.
    alternates: pageAlternates(locale, path, bodyLocales),
    openGraph: { images: SHARE_IMAGES, title, description, url },
    twitter: { card: "summary_large_image", title, description, images: SHARE_IMAGES },
  };
}

function issueInput(g: Guide, platform: GuidePlatform) {
  return {
    issueCode: g.issueCode ?? "",
    title: g.title,
    explanation: g.explanation ?? "",
    whyPlatformCares: g.whyPlatformCares ?? "",
    howToFix: g.howToFix ?? "",
    category: g.category,
    autoFixable: g.autoFixable ?? false,
    blocking: g.blocking ?? false,
    platform,
  };
}

function relatedGuides(guide: Guide, platform: GuidePlatform, slug: string): Guide[] {
  const currentType = guide.kind === "issue" && guide.issueCode ? classifyIssue(issueInput(guide, platform)) : null;
  const keywords = new Set(guide.keywords.map((k) => k.toLowerCase()));
  const score = (g: Guide) => {
    let s = 0;
    if (currentType && g.kind === "issue" && g.issueCode && classifyIssue(issueInput(g, platform)) === currentType) s += 30;
    if (g.category === guide.category) s += 20;
    s += g.keywords.filter((k) => keywords.has(k.toLowerCase())).length * 5;
    return s;
  };
  return getGuidesByPlatform(platform)
    .filter((g) => g.slug !== slug)
    .map((g) => ({ g, s: score(g) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.g);
}

function Steps({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) {
  if (!items.length) return null;
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
      <ol className="mt-3 space-y-2">
        {items.map((step, i) => (
          <li key={i} className={`flex gap-3 text-base ${muted}`}>
            {numbered ? (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--text)]">{i + 1}</span>
            ) : (
              <span className="mt-1 shrink-0 text-green-600 dark:text-green-400">&#10003;</span>
            )}
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function GuideView({ locale, platform, slug }: { locale: Locale; platform: string; slug: string }) {
  if (!isPlatform(platform)) notFound();
  const L = await guideLocalizer(locale);
  // Related guides and the generated body are worked out from the English rule text,
  // then rendered in the page's language.
  const english = getGuide(platform, slug);
  const guide = L(english);
  if (!english || !guide) notFound();

  const t = await getTranslations(locale);
  const guideText = await guideTextTranslator(locale);
  const href = (path: string) => localeHref(locale, path);
  const label = platformLabel(t, platform);
  const presetId = PLATFORM_PRESET_ID[platform];
  const fixerHref = PLATFORM_FIXER_HREF[platform];
  const fixerAppHref = presetId ? `${href("/app")}?preset=${presetId}` : href("/app");
  const checked = guide.checkedByFixer !== false;

  const related = relatedGuides(english, platform, slug).map(L);
  const expanded =
    english.kind === "issue" && english.issueCode
      ? expandIssueContent({ ...issueInput(english, platform), localTitle: guide.title }, guideText.tr)
      : null;
  const sheet = english.kind === "issue" ? sheetExampleFor(english.issueCode) : null;
  const showWooVariableLink = platform === "woocommerce" && expanded?.issueType === "variant_structure";
  const curated = guide.kind === "curated" ? readCuratedGuide(platform, slug, locale) : null;
  const toc = curated ? extractTocFromMdx(curated.rawMdx) : [];
  const bodyTranslated = curated ? curated.translated : guideText.translated;

  const guideUrl = `${SITE_URL}${href(`/guides/${platform}/${slug}`)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.lastUpdated ?? undefined,
    url: guideUrl,
    inLanguage: bodyTranslated ? locale : DEFAULT_LOCALE,
    publisher: { "@type": "Organization", name: "StriveFormats" },
  };
  const faqLd =
    guide.kind === "issue" && guide.explanation && guide.howToFix
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: fmt(t.guide.faqWhatIs, { title: guide.title }), acceptedAnswer: { "@type": "Answer", text: guide.explanation } },
            { "@type": "Question", name: fmt(t.guide.faqHowFix, { title: guide.title }), acceptedAnswer: { "@type": "Answer", text: guide.howToFix } },
          ],
        }
      : null;

  const fixerCta = (
    <div className={`${card} flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
      <p className={`text-sm ${muted}`}>
        {guide.kind === "curated" ? t.guide.readyToFix : guide.autoFixable ? t.guide.autoFixableCta : t.guide.checkCta}
      </p>
      <Link className="rg-btn shrink-0 text-sm" href={fixerAppHref}>
        {guide.kind === "curated" ? t.guide.openCsvFixer : t.guide.fixNow}
      </Link>
    </div>
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      {faqLd && <JsonLd data={faqLd} />}

      <Breadcrumbs
        items={[
          { label: t.nav.home, href: href("/") },
          { label: t.nav.guides, href: href("/guides") },
          { label, href: href(`/guides/${platform}`) },
          { label: guide.title },
        ]}
      />

      <article>
        <header className="hero-glow relative mb-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
          <Orbs size="sm" />
          <span aria-hidden="true" className="absolute left-4 top-4 h-7 w-7 border-l-[3px] border-t-[3px] border-[var(--accent)] opacity-60" />
          <div className="relative flex flex-wrap items-center gap-2">
            <span className={`rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold ${(PLATFORM_TONE[platform] ?? PLATFORM_TONE.general).text}`}>{label}</span>
            {/* General guides have the category "general" too; don't show the same word twice. */}
            {categoryLabel(t, guide.category) !== label && (
              <span className={`rounded-full border border-[var(--border)] px-3 py-1 text-xs ${muted}`}>{categoryLabel(t, guide.category)}</span>
            )}
            {guide.blocking && <span className={badgeRed}>{t.guide.importBlocker}</span>}
            {guide.autoFixable && <span className={badgeGreen}>{t.guide.autoFixableBadge}</span>}
          </div>
          <h1 className="relative mt-4 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">{guide.title}</h1>
          <p className={`relative mt-3 text-base leading-7 sm:text-lg ${muted}`}>{guide.description}</p>
          {guide.lastUpdated && (
            <div className="relative mt-3 text-xs text-[var(--muted)]">
              {t.guide.updated} {guide.lastUpdated}
            </div>
          )}
          {!bodyTranslated && <p className={`relative mt-3 text-sm ${muted}`}>{t.guide.englishOnly}</p>}
        </header>

        {curated ? (
          <>
            {(curated.frontmatter.whatYouLearn || curated.frontmatter.bestFor || curated.frontmatter.timeToComplete) && (
              <div className={`${card} mb-6 rounded-3xl p-5`}>
                <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap">
                  {curated.frontmatter.whatYouLearn && (
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t.guide.whatYouLearn}</div>
                      <ul className="space-y-1">
                        {curated.frontmatter.whatYouLearn.map((item, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm ${muted}`}>
                            <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400">&#10003;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 text-sm">
                    {curated.frontmatter.bestFor && (
                      <div>
                        <span className="font-semibold text-[var(--text)]">{t.guide.bestFor}: </span>
                        <span className={muted}>{curated.frontmatter.bestFor}</span>
                      </div>
                    )}
                    {curated.frontmatter.timeToComplete && (
                      <div>
                        <span className="font-semibold text-[var(--text)]">{t.guide.timeToComplete}: </span>
                        <span className={muted}>{curated.frontmatter.timeToComplete}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">{fixerCta}</div>

            <div className="flex items-start gap-8">
              <div className="min-w-0 flex-1 space-y-4">
                <MDXRemote
                  source={curated.rawMdx}
                  // rehype plugin typing differs between unified versions
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeWrapSections as any] } }}
                  components={mdxGuideComponentsFor(locale, { csvSheets: platform !== "general" })}
                />
              </div>
              {toc.length > 0 && (
                <div className="sticky top-24 hidden w-56 shrink-0 lg:block">
                  <MdxGuideToc items={toc} onThisPage={t.toc.onThisPage} />
                </div>
              )}
            </div>

            <div className={`${card} mt-6 rounded-3xl p-6`}>
              <div className="text-base font-semibold text-[var(--text)]">{t.guide.needHelp}</div>
              <p className={`mt-1 text-sm ${muted}`}>{t.guide.uploadDescription}</p>
              <Screenshot name="hero" alt={t.home.heroShotAlt} className="mt-5" sizes="(min-width: 1024px) 720px, 100vw" />
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rg-btn" href={href("/app")}>
                  {t.guide.openCsvFixer}
                </Link>
                <Link className="pill-btn" href={href("/presets")}>
                  {t.guide.viewTemplates}
                </Link>
                {platform !== "general" && (
                  <Link className="pill-btn" href={href(`/guides/${platform}`)}>
                    {fmt(t.guide.platformGuide, { platform: label })}
                  </Link>
                )}
              </div>
            </div>
          </>
        ) : expanded ? (
          <div className="space-y-6">
            <section className={`${card} p-5 sm:p-6`}>
              <h2 className="text-lg font-semibold text-[var(--text)]">{t.guide.whatIsThisIssue}</h2>
              <p className={`mt-3 text-base ${muted}`}>{guide.explanation}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-[var(--text)]">{t.guide.affectedField}:</span>
                <code className="break-all rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs">{expanded.whereItAppears}</code>
              </div>
              {guide.blocking && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                  <strong>{t.guide.importBlocker}:</strong> {t.guide.importBlockerNote}
                </div>
              )}
            </section>

            {sheet && (
              <section className={`${card} p-5 sm:p-6`}>
                <SheetFix
                  example={sheet}
                  labels={{ title: t.guide.sheetTitle, before: t.guide.sheetBefore, after: t.guide.sheetAfter, empty: t.guide.sheetEmpty }}
                />
              </section>
            )}

            {checked ? fixerCta : null}

            <section className={`${card} p-5 sm:p-6`}>
              <h2 className="text-lg font-semibold text-[var(--text)]">{fmt(t.guide.whyRejects, { platform: label })}</h2>
              <p className={`mt-3 text-base ${muted}`}>{guide.whyPlatformCares}</p>
              {expanded.platformNote && (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text)]">{fmt(t.guide.platformSpecificNote, { platform: label })}</p>
                  <p className={`mt-1 text-sm ${muted}`}>{expanded.platformNote}</p>
                </div>
              )}
            </section>

            {expanded.validValues?.length ? <Steps title={t.guide.validValues} items={expanded.validValues} /> : null}

            {!sheet && expanded.examples.length > 0 && (
              <section className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-semibold text-[var(--text)]">{t.guide.examples}</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-2 pr-4 text-left font-semibold text-red-700 dark:text-red-400">{t.guide.badValue}</th>
                        <th className="pb-2 pr-4 text-left font-semibold text-green-700 dark:text-green-400">{t.guide.goodValue}</th>
                        <th className={`pb-2 text-left font-medium ${muted}`}>{t.guide.noteCol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expanded.examples.map((ex, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2 pr-4">
                            <code className="rounded bg-red-50 px-1.5 py-0.5 text-red-800 dark:bg-red-900/20 dark:text-red-300">{ex.bad}</code>
                          </td>
                          <td className="py-2 pr-4">
                            <code className="rounded bg-green-50 px-1.5 py-0.5 text-green-800 dark:bg-green-900/20 dark:text-green-300">{ex.good}</code>
                          </td>
                          <td className={`py-2 ${muted}`}>{ex.note ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {checked ? (
              <section className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-semibold text-[var(--text)]">{t.guide.fixInStrive}</h2>
                <p className={`mt-3 text-base ${muted}`}>{expanded.striveNote}</p>
                {guide.autoFixable && (
                  <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">{t.guide.autoFixable}</div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link className="rg-btn" href={fixerAppHref}>
                    {t.guide.openCsvFixer}
                  </Link>
                  {presetId && (
                    <Link className="pill-btn" href={href(`/presets/${presetId}`)}>
                      {t.guide.viewTemplate}
                    </Link>
                  )}
                  {showWooVariableLink && (
                    <Link className="pill-btn" href={`${href("/app")}?preset=woocommerce_variable_products`}>
                      {t.guide.wooVariablePreset}
                    </Link>
                  )}
                  {fixerHref && (
                    <Link className="pill-btn" href={href(fixerHref)}>
                      {fmt(t.guide.fixerGuide, { platform: label })}
                    </Link>
                  )}
                </div>
              </section>
            ) : (
              <div className={`${card} px-5 py-4 text-sm ${muted}`}>{t.guide.notChecked}</div>
            )}

            <Steps title={t.guide.fixInExcel} items={expanded.excelSteps} numbered />
            <Steps title={t.guide.fixInSheets} items={expanded.sheetsSteps} numbered />
            {expanded.preventTips.length > 0 && <Steps title={t.guide.preventNextTime} items={expanded.preventTips} />}

            {checked && (
              <section className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-semibold text-[var(--text)]">{t.guide.howDetects}</h2>
                <p className={`mt-3 text-base ${muted}`}>{expanded.detectionNote}</p>
                <details className="group mt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--text)] hover:opacity-80">
                    <span className="transition-transform group-open:rotate-90">&#9658;</span>
                    {t.guide.technicalDetail}
                  </summary>
                  <div className={`mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm ${muted}`}>{expanded.technicalDetail}</div>
                </details>
              </section>
            )}
          </div>
        ) : null}
      </article>

      {related.length > 0 && (
        <aside aria-labelledby="related-guides" className="mt-12">
          <h2 id="related-guides" className="mb-4 text-lg font-semibold text-[var(--text)]">{t.guide.relatedGuides}</h2>
          <ul className="space-y-2">
            {related.map((g) => (
              <li key={g.slug}>
                <Link href={href(`/guides/${platform}/${g.slug}`)} className={`${card} flex items-center justify-between gap-3 px-5 py-3 hover:border-[var(--ring)]`}>
                  <div className="min-w-0 font-semibold text-[var(--text)]">{g.title}</div>
                  {g.autoFixable && <span className={`shrink-0 ${badgeGreen}`}>{t.guide.autoFix}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
}

export function allGuideParams() {
  return getAllGuides().map((g) => ({ platform: g.platform, slug: g.slug }));
}
