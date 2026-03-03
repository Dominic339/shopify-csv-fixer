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

type Props = {
  params: Promise<{ platform: string; slug: string }>;
};

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((g) => ({ platform: g.platform, slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform, slug } = await params;
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) return {};
  const guide = getGuide(platform as GuidePlatform, slug);
  if (!guide) return {};

  const label = PLATFORM_LABEL[guide.platform];
  const title = `${guide.title} | ${label} CSV Guide | StriveFormats`;
  return {
    title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${platform}/${slug}` },
    openGraph: { title, description: guide.description },
    twitter: { card: "summary", title, description: guide.description },
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

  // Related guides: same platform, same category, different slug (up to 4)
  const related = getGuidesByPlatform(p)
    .filter((g) => g.slug !== slug && g.category === guide.category)
    .slice(0, 4);

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
              {
                "@type": "ListItem",
                position: 2,
                name: label,
                item: `https://striveformats.com/guides/${platform}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: guide.title,
                item: `https://striveformats.com/guides/${platform}/${slug}`,
              },
            ],
          },
        };

  // Load MDX content for curated guides
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
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">
              {label}
            </span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[color:rgba(var(--muted-rgb),1)] capitalize">
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
            <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">
              Updated {guide.lastUpdated}
            </div>
          )}
        </header>

        {guide.kind === "curated" && curatedData ? (
          <div className="prose prose-neutral max-w-none dark:prose-invert">
            <MDXRemote source={curatedData.rawMdx} />
          </div>
        ) : (
          // Structured issue guide
          <div className="space-y-6">
            {guide.explanation && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">What is this issue?</h2>
                <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.explanation}</p>
              </section>
            )}

            {guide.whyPlatformCares && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Why {label} cares</h2>
                <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.whyPlatformCares}</p>
              </section>
            )}

            {guide.howToFix && (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">How to fix it</h2>
                <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{guide.howToFix}</p>
                {guide.autoFixable && (
                  <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                    This issue can be auto-fixed by the CSV Fixer.
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">Fix it automatically</h2>
              <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                Upload your {label} CSV and the fixer will detect this issue, score your file, and apply safe
                auto-fixes.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rg-btn" href={presetId ? `/app?preset=${presetId}` : "/app"}>
                  Open CSV Fixer
                </Link>
                {fixerHref && (
                  <Link className="pill-btn" href={fixerHref}>
                    {label} Fixer guide
                  </Link>
                )}
              </div>
            </section>
          </div>
        )}
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
                    <span className="ml-3 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
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
