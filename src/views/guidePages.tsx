// src/views/guidePages.tsx
// Guide hub, platform list and guide article pages, shared by the English and /[locale]
// routes. Guide content is English; localized copies translate the page chrome and point
// their canonical at the English guide.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";

import JsonLd from "@/components/JsonLd";
import MdxGuideToc from "@/components/MdxGuideToc";
import Breadcrumbs from "@/components/Breadcrumbs";
import GuideSidebar from "@/components/GuideSidebar";
import {
  getAllGuides,
  getGuide,
  getGuidesByPlatform,
  GUIDE_PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_PRESET_ID,
  PLATFORM_FIXER_HREF,
  type Guide,
  type GuidePlatform,
} from "@/lib/guidesRegistry";
import { guideLocalizer } from "@/lib/guides/localizeGuide";
import { readCuratedGuide } from "@/lib/guides/mdxLoader";
import { expandIssueContent, classifyIssue } from "@/lib/guides/issueGuideExpander";
import { extractTocFromMdx } from "@/lib/guides/mdxHeadings";
import { rehypeWrapSections } from "@/lib/guides/rehypeWrapSections";
import { fmt, getTranslations, platformLabel, type Translations } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import { pageAlternates, SITE_URL } from "@/lib/i18n/seo";
import { mdxGuideComponents } from "@/views/mdxGuideComponents";

const muted = "text-[color:rgba(var(--muted-rgb),1)]";
const card = "rounded-2xl border border-[var(--border)] bg-[var(--surface)]";
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
    title: t.guides.title,
    description: t.guides.description,
    alternates: pageAlternates(locale, "/guides"),
    openGraph: { title: t.guides.title, description: t.guides.description, url: `${SITE_URL}${localeHref(locale, "/guides")}` },
  };
}

function GuideLink({ g, locale, t }: { g: Guide; locale: Locale; t: Translations }) {
  return (
    <Link href={localeHref(locale, `/guides/${g.platform}/${g.slug}`)} className={`${card} block p-5 hover:border-[var(--ring)]`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold uppercase ${muted}`}>{platformLabel(t, g.platform)}</span>
        {g.kind === "curated" && <span className={`rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs ${muted}`}>{t.guides.guideLabel}</span>}
      </div>
      <div className="mt-1 font-semibold text-[var(--text)]">{g.title}</div>
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

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">{t.guides.title}</h1>
        <p className={`mt-3 text-base ${muted}`}>{t.guides.hubIntro}</p>
      </header>

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
            <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">{t.guides.browseByPlatform}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GUIDE_PLATFORMS.map((p) => {
                const count = counts[p] ?? 0;
                return (
                  <Link key={p} href={localeHref(locale, `/guides/${p}`)} className={`${card} flex flex-col p-5 hover:border-[var(--ring)]`}>
                    <div className="font-semibold text-[var(--text)]">{platformLabel(t, p)}</div>
                    <div className={`mt-1 text-sm ${muted}`}>
                      {count} {count === 1 ? t.guides.guideCount : t.guides.guidesCount}
                    </div>
                    {PLATFORM_FIXER_HREF[p] && <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">{t.guides.includesFixer}</div>}
                  </Link>
                );
              })}
            </div>
          </section>

          {featured.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">{t.guides.featuredGuides}</h2>
              <ul className="space-y-3">
                {featured.map((g) => (
                  <li key={`${g.platform}/${g.slug}`}>
                    <GuideLink g={g} locale={locale} t={t} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={`${card} p-6`}>
            <h2 className="text-lg font-semibold text-[var(--text)]">{t.guides.needHelp}</h2>
            <p className={`mt-2 text-base ${muted}`}>{t.guides.needHelpDesc}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="rg-btn" href={localeHref(locale, "/app")}>
                {t.guide.openCsvFixer}
              </Link>
              <Link className="pill-btn" href={localeHref(locale, "/presets")}>
                {t.guides.browseTemplates}
              </Link>
            </div>
          </section>
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
  const title = fmt(t.guides.platformTitle, { platform: label });
  const description = platform === "general" ? t.guides.generalGuidesDesc : fmt(t.guides.platformMetaDesc, { platform: label });
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/guides/${platform}`, false),
    openGraph: { title, description },
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

      <header className="mb-8">
        <div className={`text-sm font-semibold uppercase ${muted}`}>
          <Link href={href("/guides")} className="hover:underline">
            {t.nav.guides}
          </Link>{" "}
          / {label}
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)] sm:text-3xl">{fmt(t.guides.platformTitle, { platform: label })}</h1>
        <p className={`mt-3 text-base ${muted}`}>
          {platform === "general" ? t.guides.generalGuidesDesc : fmt(t.guides.platformDesc, { count: guides.length, platform: label })}
        </p>
        {(fixerHref || presetId) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {fixerHref && (
              <Link className="rg-btn" href={href(fixerHref)}>
                {fmt(t.guides.fixerButton, { platform: label })}
              </Link>
            )}
            {presetId && (
              <Link className="pill-btn" href={fixerAppHref}>
                {t.common.openWithPreset}
              </Link>
            )}
          </div>
        )}
      </header>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">{categoryLabel(t, cat)}</h2>
          <ul className="space-y-2">
            {byCategory[cat].map((g) => (
              <li key={g.slug}>
                <Link href={href(`/guides/${platform}/${g.slug}`)} className={`${card} flex flex-col gap-2 px-5 py-4 hover:border-[var(--ring)] sm:flex-row sm:items-center sm:justify-between`}>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text)]">{g.title}</div>
                    <div className={`mt-0.5 line-clamp-2 text-sm sm:line-clamp-1 ${muted}`}>{g.description}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {g.blocking && <span className={badgeRed}>{t.guides.blocking}</span>}
                    {g.autoFixable && <span className={badgeGreen}>{t.guide.autoFix}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className={`${card} mt-4 p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.guides.needHelp}</h2>
        <p className={`mt-2 text-base ${muted}`}>{fmt(t.guides.needHelpPlatform, { platform: label })}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="rg-btn" href={fixerAppHref}>
            {t.guide.openCsvFixer}
          </Link>
          {presetId && (
            <Link className="pill-btn" href={href(`/presets/${presetId}`)}>
              {t.guide.viewTemplate}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// /guides/<platform>/<slug>
// ---------------------------------------------------------------------------

export async function guideMetadata(locale: Locale, platform: string, slug: string): Promise<Metadata> {
  if (!isPlatform(platform)) return {};
  const guide = (await guideLocalizer(locale))(getGuide(platform, slug));
  if (!guide) return {};
  const label = PLATFORM_LABEL[guide.platform];
  const title = `${guide.title} | ${label} CSV Guide`;
  const description =
    guide.kind === "issue" ? `${guide.description} Learn how to fix this ${label} CSV import error step by step in StriveFormats, Excel, and Google Sheets.` : guide.description;
  const url = `${SITE_URL}/guides/${platform}/${slug}`;
  return {
    title,
    description,
    keywords: [guide.title, `${label} CSV`, `${label} import error`, `fix ${guide.title.toLowerCase()}`, guide.category, "csv import", ...guide.keywords],
    alternates: pageAlternates(locale, `/guides/${platform}/${slug}`, false),
    openGraph: { title, description, url },
    twitter: { card: "summary", title, description },
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
  const guide = L(getGuide(platform, slug));
  if (!guide) notFound();

  const t = await getTranslations(locale);
  const href = (path: string) => localeHref(locale, path);
  const label = platformLabel(t, platform);
  const presetId = PLATFORM_PRESET_ID[platform];
  const fixerHref = PLATFORM_FIXER_HREF[platform];
  const fixerAppHref = presetId ? `${href("/app")}?preset=${presetId}` : href("/app");
  const checked = guide.checkedByFixer !== false;

  const related = relatedGuides(guide, platform, slug).map(L);
  const expanded = guide.kind === "issue" && guide.issueCode ? expandIssueContent(issueInput(guide, platform)) : null;
  const showWooVariableLink = platform === "woocommerce" && expanded?.issueType === "variant_structure";
  const curated = guide.kind === "curated" ? readCuratedGuide(platform, slug) : null;
  const toc = curated ? extractTocFromMdx(curated.rawMdx) : [];

  const guideUrl = `${SITE_URL}/guides/${platform}/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.lastUpdated ?? undefined,
    url: guideUrl,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "StriveFormats" },
  };
  const faqLd =
    guide.kind === "issue" && guide.explanation && guide.howToFix
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: `What is the "${guide.title}" error?`, acceptedAnswer: { "@type": "Answer", text: guide.explanation } },
            { "@type": "Question", name: `How do I fix "${guide.title}"?`, acceptedAnswer: { "@type": "Answer", text: guide.howToFix } },
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
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold ${muted}`}>{label}</span>
            <span className={`rounded-full border border-[var(--border)] px-3 py-1 text-xs ${muted}`}>{categoryLabel(t, guide.category)}</span>
            {guide.blocking && <span className={badgeRed}>{t.guide.importBlocker}</span>}
            {guide.autoFixable && <span className={badgeGreen}>{t.guide.autoFixableBadge}</span>}
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-[var(--text)] sm:text-3xl">{guide.title}</h1>
          <p className={`mt-3 text-base ${muted}`}>{guide.description}</p>
          {guide.lastUpdated && (
            <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">
              {t.guide.updated} {guide.lastUpdated}
            </div>
          )}
          {locale !== DEFAULT_LOCALE && <p className={`mt-3 text-sm ${muted}`}>{t.guide.englishOnly}</p>}
        </header>

        {curated ? (
          <>
            {(curated.frontmatter.whatYouLearn || curated.frontmatter.bestFor || curated.frontmatter.timeToComplete) && (
              <div className={`${card} mb-6 rounded-3xl p-5`}>
                <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap">
                  {curated.frontmatter.whatYouLearn && (
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),0.7)]">{t.guide.whatYouLearn}</div>
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
                  options={{ mdxOptions: { rehypePlugins: [rehypeWrapSections as any] } }}
                  components={mdxGuideComponents}
                />
              </div>
              {toc.length > 0 && (
                <aside className="sticky top-24 hidden w-56 shrink-0 lg:block">
                  <MdxGuideToc items={toc} onThisPage={t.toc.onThisPage} />
                </aside>
              )}
            </div>

            <div className={`${card} mt-6 rounded-3xl p-6`}>
              <div className="text-base font-semibold text-[var(--text)]">{t.guide.needHelp}</div>
              <p className={`mt-1 text-sm ${muted}`}>{t.guide.uploadDescription}</p>
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

            {expanded.examples.length > 0 && (
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
        <aside className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">{t.guide.relatedGuides}</h2>
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
