// src/app/[locale]/guides/[platform]/[slug]/page.tsx
// Localized guide detail page (e.g. /es/guides/shopify/shopify-csv-import-errors).
// Renders the same guide content as the English version with translated UI chrome.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";

import JsonLd from "@/components/JsonLd";
import MdxGuideToc from "@/components/MdxGuideToc";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  getAllGuides,
  getGuide,
  getGuidesByPlatform,
  GUIDE_PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_PRESET_ID,
  PLATFORM_FIXER_HREF,
} from "@/lib/guidesRegistry";
import type { GuidePlatform, Guide } from "@/lib/guidesRegistry";
import { readCuratedGuide } from "@/lib/guides/mdxLoader";
import { expandIssueContent, classifyIssue } from "@/lib/guides/issueGuideExpander";
import { extractTocFromMdx } from "@/lib/guides/mdxHeadings";
import { rehypeWrapSections } from "@/lib/guides/rehypeWrapSections";
import { slugifyHeading } from "@/lib/guides/slug";
import { isValidLocale, LOCALES, DEFAULT_LOCALE, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";

// ---------------------------------------------------------------------------
// MDX component map (same as English guide page)
// ---------------------------------------------------------------------------
const mdxGuideComponents = {
  section: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
      {children}
    </div>
  ),
  h2: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id} className="text-xl font-semibold text-[var(--text)] scroll-mt-24">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => {
    const text = typeof children === "string" ? children : "";
    const id = slugifyHeading(text);
    return (
      <h3 id={id} className="text-base font-semibold text-[var(--text)] mt-4 scroll-mt-24">
        {children}
      </h3>
    );
  },
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-base leading-relaxed text-[color:rgba(var(--muted-rgb),1)]">{children}</p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc space-y-1.5 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal space-y-1.5 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    className ? (
      <code className={`${className} text-[color:rgba(220,220,220,0.95)] text-sm`}>{children}</code>
    ) : (
      <code className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-sm text-[var(--text)]">
        {children}
      </code>
    ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[color:rgba(0,0,0,0.45)] p-4 font-mono text-sm leading-relaxed text-[color:rgba(220,220,220,0.95)]">
      {children}
    </pre>
  ),
  hr: () => <div className="my-1 border-t border-[color:rgba(var(--border-rgb),0.35)]" />,
  a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a
      href={href}
      className="text-[var(--accent)] underline decoration-[color:rgba(var(--accent-rgb),0.4)] hover:opacity-80"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--text)]">{children}</strong>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-[var(--border)] pl-4 italic text-[color:rgba(var(--muted-rgb),0.8)]">
      {children}
    </blockquote>
  ),
};

type Props = {
  params: Promise<{ locale: string; platform: string; slug: string }>;
};

export async function generateStaticParams() {
  const guides = getAllGuides();
  const locales = LOCALES.filter((l) => l !== DEFAULT_LOCALE);
  return locales.flatMap((locale) =>
    guides.map((g) => ({ locale, platform: g.platform, slug: g.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, platform, slug } = await params;
  if (!isValidLocale(locale)) return {};
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) return {};
  const guide = getGuide(platform as GuidePlatform, slug);
  if (!guide) return {};

  const label = PLATFORM_LABEL[guide.platform];
  const title = `${guide.title} | ${label} CSV Guide | StriveFormats`;
  const description =
    guide.kind === "issue"
      ? `${guide.description} Learn how to fix this ${label} CSV import error step-by-step.`
      : guide.description;

  // Build hreflang map
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = l === DEFAULT_LOCALE
      ? `https://striveformats.com/guides/${platform}/${slug}`
      : `https://striveformats.com/${l}/guides/${platform}/${slug}`;
  }
  languages["x-default"] = `https://striveformats.com/guides/${platform}/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: localeHref(locale as Locale, `/guides/${platform}/${slug}`),
      languages,
    },
    openGraph: { title, description },
  };
}

export default async function LocaleGuideDetailPage({ params }: Props) {
  const { locale, platform, slug } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) notFound();

  const loc = locale as Locale;
  const p = platform as GuidePlatform;
  const guide = getGuide(p, slug);
  if (!guide) notFound();

  const t = await getTranslations(loc);

  const label = PLATFORM_LABEL[p];
  const presetId = PLATFORM_PRESET_ID[p];
  const fixerHref = PLATFORM_FIXER_HREF[p];

  // Related guides scoring
  const currentIssueType =
    guide.kind === "issue" && guide.issueCode
      ? classifyIssue({
          issueCode: guide.issueCode,
          title: guide.title,
          explanation: guide.explanation ?? "",
          whyPlatformCares: guide.whyPlatformCares ?? "",
          howToFix: guide.howToFix ?? "",
          category: guide.category,
          autoFixable: guide.autoFixable ?? false,
          blocking: guide.blocking ?? false,
          platform: p,
        })
      : null;

  const currentKeywords = new Set(guide.keywords.map((k) => k.toLowerCase()));
  const guideCategory = guide.category;

  function scoreRelated(g: Guide): number {
    let score = 0;
    if (currentIssueType && g.kind === "issue" && g.issueCode) {
      const gType = classifyIssue({
        issueCode: g.issueCode,
        title: g.title,
        explanation: g.explanation ?? "",
        whyPlatformCares: g.whyPlatformCares ?? "",
        howToFix: g.howToFix ?? "",
        category: g.category,
        autoFixable: g.autoFixable ?? false,
        blocking: g.blocking ?? false,
        platform: p,
      });
      if (gType === currentIssueType) score += 30;
    }
    if (g.category === guideCategory) score += 20;
    const overlap = g.keywords.filter((k) => currentKeywords.has(k.toLowerCase())).length;
    score += overlap * 5;
    return score;
  }

  const related = getGuidesByPlatform(p)
    .filter((g) => g.slug !== slug)
    .map((g) => ({ guide: g, score: scoreRelated(g) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.guide);

  const expanded =
    guide.kind === "issue" && guide.issueCode
      ? expandIssueContent({
          issueCode: guide.issueCode,
          title: guide.title,
          explanation: guide.explanation ?? "",
          whyPlatformCares: guide.whyPlatformCares ?? "",
          howToFix: guide.howToFix ?? "",
          category: guide.category,
          autoFixable: guide.autoFixable ?? false,
          blocking: guide.blocking ?? false,
          platform: p,
        })
      : null;

  const showWooVariableLink =
    p === "woocommerce" && expanded?.issueType === "variant_structure";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": guide.kind === "curated" ? "Article" : "WebPage",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.lastUpdated,
    url: `https://striveformats.com/${locale}/guides/${platform}/${slug}`,
    inLanguage: locale,
    publisher: { "@type": "Organization", name: "StriveFormats" },
  };

  const curatedData = guide.kind === "curated" ? readCuratedGuide(p, slug) : null;
  const tocItems = curatedData ? extractTocFromMdx(curatedData.rawMdx) : [];

  return (
    <>
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: t.nav.home, href: localeHref(loc) },
          { label: t.nav.guides, href: localeHref(loc, "/guides") },
          { label: label, href: localeHref(loc, `/guides/${platform}`) },
          { label: guide.title },
        ]}
      />

      <article>
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">
              {label}
            </span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize text-[color:rgba(var(--muted-rgb),1)]">
              {guide.category}
            </span>
            {guide.blocking && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {t.guide.importBlocker}
              </span>
            )}
            {guide.autoFixable && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {t.guide.autoFix}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">{guide.title}</h1>
          <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.description}</p>
          {guide.lastUpdated && (
            <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">
              {t.guide.updated} {guide.lastUpdated}
            </div>
          )}
        </header>

        {/* Curated MDX guide */}
        {guide.kind === "curated" && curatedData ? (
          <>
            {(curatedData.frontmatter.whatYouLearn ||
              curatedData.frontmatter.bestFor ||
              curatedData.frontmatter.timeToComplete) && (
              <div className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex flex-wrap gap-5">
                  {curatedData.frontmatter.whatYouLearn && (
                    <div className="min-w-[180px] flex-1">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),0.7)]">
                        {t.guide.whatYouLearn}
                      </div>
                      <ul className="space-y-1">
                        {curatedData.frontmatter.whatYouLearn.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                            <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400">&#10003;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 text-sm">
                    {curatedData.frontmatter.bestFor && (
                      <div>
                        <span className="font-semibold text-[var(--text)]">{t.guide.bestFor}: </span>
                        <span className="text-[color:rgba(var(--muted-rgb),1)]">{curatedData.frontmatter.bestFor}</span>
                      </div>
                    )}
                    {curatedData.frontmatter.timeToComplete && (
                      <div>
                        <span className="font-semibold text-[var(--text)]">{t.guide.timeToComplete}: </span>
                        <span className="text-[color:rgba(var(--muted-rgb),1)]">{curatedData.frontmatter.timeToComplete}</span>
                      </div>
                    )}
                    {guide.lastUpdated && (
                      <div>
                        <span className="font-semibold text-[var(--text)]">{t.guide.lastUpdated}: </span>
                        <span className="text-[color:rgba(var(--muted-rgb),1)]">{guide.lastUpdated}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-8">
              <div className="min-w-0 flex-1 space-y-4">
                <MDXRemote
                  source={curatedData.rawMdx}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={{ mdxOptions: { rehypePlugins: [rehypeWrapSections as any] } }}
                  components={mdxGuideComponents}
                />
              </div>
              {tocItems.length > 0 && (
                <aside className="hidden lg:block w-56 shrink-0 sticky top-24">
                  <MdxGuideToc items={tocItems} onThisPage={t.toc.onThisPage} />
                </aside>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="text-base font-semibold text-[var(--text)]">{t.guide.needHelp}</div>
              <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                {t.guide.uploadDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rg-btn" href="/app">
                  {t.guide.openCsvFixer}
                </Link>
                <Link className="pill-btn" href="/presets">
                  {t.guide.viewTemplates}
                </Link>
              </div>
            </div>
          </>
        ) : expanded ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">What is this issue?</h2>
              <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.explanation}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-[var(--text)]">Affected field:</span>
                <code className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs">
                  {expanded.whereItAppears}
                </code>
              </div>
              {guide.blocking && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                  <strong>{t.guide.importBlocker}:</strong> {t.guide.importBlockerNote}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">Why {label} rejects this</h2>
              <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.whyPlatformCares}</p>
              {expanded.platformNote && (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text)]">{label}-specific note</p>
                  <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">{expanded.platformNote}</p>
                </div>
              )}
            </section>

            {expanded.validValues && expanded.validValues.length > 0 && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Valid values / expected format</h2>
                <ul className="mt-3 space-y-2">
                  {expanded.validValues.map((v, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                      <span className="mt-1 shrink-0 text-green-600 dark:text-green-400">&#10003;</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {expanded.examples.length > 0 && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Examples</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-2 pr-4 text-left font-semibold text-red-700 dark:text-red-400">Bad value</th>
                        <th className="pb-2 pr-4 text-left font-semibold text-green-700 dark:text-green-400">Good value</th>
                        <th className="pb-2 text-left font-medium text-[color:rgba(var(--muted-rgb),1)]">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expanded.examples.map((ex, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2 pr-4">
                            <code className="rounded bg-red-50 px-1.5 py-0.5 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                              {ex.bad}
                            </code>
                          </td>
                          <td className="py-2 pr-4">
                            <code className="rounded bg-green-50 px-1.5 py-0.5 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                              {ex.good}
                            </code>
                          </td>
                          <td className="py-2 text-[color:rgba(var(--muted-rgb),1)]">{ex.note ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">Fix in StriveFormats</h2>
              <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{expanded.striveNote}</p>
              {guide.autoFixable && (
                <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  {t.guide.autoFixable}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rg-btn" href={presetId ? `/app?preset=${presetId}` : "/app"}>
                  {t.guide.openCsvFixer}
                </Link>
                {presetId && (
                  <Link className="pill-btn" href={`/presets/${presetId}`}>
                    {t.common.viewInformation}
                  </Link>
                )}
                {showWooVariableLink && (
                  <Link className="pill-btn" href="/app?preset=woocommerce_variable_products">
                    WooCommerce Variable preset
                  </Link>
                )}
                {fixerHref && (
                  <Link className="pill-btn" href={fixerHref}>
                    {label} Fixer guide
                  </Link>
                )}
              </div>
            </section>

            {expanded.excelSteps.length > 0 && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Fix in Excel</h2>
                <ol className="mt-3 space-y-2">
                  {expanded.excelSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--text)]">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {expanded.sheetsSteps.length > 0 && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Fix in Google Sheets</h2>
                <ol className="mt-3 space-y-2">
                  {expanded.sheetsSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--text)]">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {expanded.preventTips.length > 0 && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Prevent it next time</h2>
                <ul className="mt-3 space-y-2">
                  {expanded.preventTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                      <span className="mt-1 shrink-0 text-[color:rgba(var(--muted-rgb),0.7)]">--</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">How StriveFormats detects this</h2>
              <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{expanded.detectionNote}</p>
              <details className="mt-4 group">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--text)] hover:opacity-80">
                  <span className="transition-transform group-open:rotate-90">&#9658;</span>
                  Technical detail
                </summary>
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                  {expanded.technicalDetail}
                </div>
              </details>
            </section>
          </div>
        ) : null}
      </article>

      {related.length > 0 && (
        <aside className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">{t.guide.relatedGuides}</h2>
          <ul className="space-y-2">
            {related.map((g) => (
              <li key={g.slug}>
                <Link
                  href={localeHref(loc, `/guides/${platform}/${g.slug}`)}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 hover:border-[var(--ring)]"
                >
                  <div className="font-semibold text-[var(--text)]">{g.title}</div>
                  {g.autoFixable && (
                    <span className="ml-3 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {t.guide.autoFix}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
}
