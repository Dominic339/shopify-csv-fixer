// src/app/guides/[platform]/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";

import JsonLd from "@/components/JsonLd";
import {
  getAllGuides,
  getGuide,
  getGuidesByPlatform,
  GUIDE_PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_PRESET_ID,
  PLATFORM_FIXER_HREF,
} from "@/lib/guidesRegistry";
import type { GuidePlatform } from "@/lib/guidesRegistry";
import { readCuratedGuide } from "@/lib/guides/mdxLoader";
import { expandIssueContent } from "@/lib/guides/issueGuideExpander";

type Props = {
  params: Promise<{ platform: string; slug: string }>;
};

export async function generateStaticParams() {
  return getAllGuides().map((g) => ({ platform: g.platform, slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform, slug } = await params;
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) return {};
  const guide = getGuide(platform as GuidePlatform, slug);
  if (!guide) return {};

  const label = PLATFORM_LABEL[guide.platform];
  const title = `${guide.title} | ${label} CSV Guide | StriveFormats`;
  const description =
    guide.kind === "issue"
      ? `${guide.description} Learn how to fix this ${label} CSV import error step-by-step in StriveFormats, Excel, and Google Sheets.`
      : guide.description;
  const keywords = [
    guide.title,
    `${label} CSV`,
    `${label} import error`,
    `fix ${guide.title.toLowerCase()}`,
    `${label} ${guide.title.toLowerCase()}`,
    guide.category,
    "csv import",
    "csv fix",
    label,
    ...guide.keywords,
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/guides/${platform}/${slug}` },
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { platform, slug } = await params;
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) notFound();
  const p = platform as GuidePlatform;
  const guide = getGuide(p, slug);
  if (!guide) notFound();

  const label = PLATFORM_LABEL[p];
  const presetId = PLATFORM_PRESET_ID[p];
  const fixerHref = PLATFORM_FIXER_HREF[p];

  // Related: same platform + same category, different slug, up to 5
  const related = getGuidesByPlatform(p)
    .filter((g) => g.slug !== slug && g.category === guide.category)
    .slice(0, 5);

  // Expand issue content if this is an issue guide
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

  // WooCommerce variant guides also link to the variable products preset
  const showWooVariableLink =
    p === "woocommerce" && expanded?.issueType === "variant_structure";

  const jsonLd =
    guide.kind === "curated"
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          dateModified: guide.lastUpdated,
          url: `https://striveformats.com/guides/${platform}/${slug}`,
          publisher: { "@type": "Organization", name: "StriveFormats" },
        }
      : {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: guide.title,
          description: guide.description,
          url: `https://striveformats.com/guides/${platform}/${slug}`,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Guides", item: "https://striveformats.com/guides" },
              { "@type": "ListItem", position: 2, name: label, item: `https://striveformats.com/guides/${platform}` },
              {
                "@type": "ListItem",
                position: 3,
                name: guide.title,
                item: `https://striveformats.com/guides/${platform}/${slug}`,
              },
            ],
          },
        };

  const curatedData = guide.kind === "curated" ? readCuratedGuide(p, slug) : null;

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/guides" className="hover:underline">
          Guides
        </Link>
        {" / "}
        <Link href={`/guides/${platform}`} className="hover:underline">
          {label}
        </Link>
        {" / "}
        <span className="text-[var(--text)]">{guide.title}</span>
      </div>

      <article>
        {/* Header */}
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
                Import blocker
              </span>
            )}
            {guide.autoFixable && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Auto-fixable
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">{guide.title}</h1>
          <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.description}</p>
          {guide.lastUpdated && (
            <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">Updated {guide.lastUpdated}</div>
          )}
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Curated MDX guide                                                 */}
        {/* ---------------------------------------------------------------- */}
        {guide.kind === "curated" && curatedData ? (
          <div className="prose prose-neutral max-w-none dark:prose-invert">
            <MDXRemote source={curatedData.rawMdx} />
          </div>
        ) : expanded ? (
          /* -------------------------------------------------------------- */
          /* Rich issue guide                                                 */
          /* -------------------------------------------------------------- */
          <div className="space-y-6">
            {/* 1. Overview + where it appears */}
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
                  <strong>Import blocker:</strong> your file will fail to import until this is resolved.
                </div>
              )}
            </section>

            {/* 2. Why the platform rejects it */}
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

            {/* 3. Valid values */}
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

            {/* 4. Examples */}
            {expanded.examples.length > 0 && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Examples</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-2 pr-4 text-left font-semibold text-red-700 dark:text-red-400">Bad value</th>
                        <th className="pb-2 pr-4 text-left font-semibold text-green-700 dark:text-green-400">
                          Good value
                        </th>
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

            {/* 5. Fix in StriveFormats */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">Fix in StriveFormats</h2>
              <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{expanded.striveNote}</p>
              {guide.autoFixable && (
                <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  Auto-fixable: this issue is corrected automatically when you click Fix Issues.
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rg-btn" href={presetId ? `/app?preset=${presetId}` : "/app"}>
                  Open CSV Fixer
                </Link>
                {presetId && (
                  <Link className="pill-btn" href={`/presets/${presetId}`}>
                    View template
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

            {/* 6. Fix in Excel */}
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

            {/* 7. Fix in Google Sheets */}
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

            {/* 8. Prevent it next time */}
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
          </div>
        ) : null}
      </article>

      {/* Related guides */}
      {related.length > 0 && (
        <aside className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">Related guides</h2>
          <ul className="space-y-2">
            {related.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${platform}/${g.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 hover:border-[var(--ring)]"
                >
                  <div className="font-semibold text-[var(--text)]">{g.title}</div>
                  {g.autoFixable && (
                    <span className="ml-3 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Auto-fix
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
