// src/app/guides/page.tsx
import Link from "next/link";
import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { getAllGuides, GUIDE_PLATFORMS, PLATFORM_LABEL, PLATFORM_FIXER_HREF } from "@/lib/guidesRegistry";
import type { GuidePlatform } from "@/lib/guidesRegistry";

export const metadata: Metadata = {
  title: "CSV Import Guides | StriveFormats",
  description:
    "Step-by-step guides for fixing Shopify, WooCommerce, Etsy, eBay, and Amazon CSV import errors. Learn header rules, encoding, quoting, and platform-specific requirements.",
  keywords: ["csv import guide", "shopify csv help", "woocommerce csv guide", "etsy csv errors", "fix csv import"],
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "CSV Import Guides | StriveFormats",
    description:
      "Step-by-step guides for fixing CSV import errors on Shopify, WooCommerce, Etsy, eBay, and Amazon.",
  },
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function GuidesHubPage({ searchParams }: Props) {
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
    name: "CSV Import Guides",
    description: metadata.description,
    url: "https://striveformats.com/guides",
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--text)]">CSV Import Guides</h1>
        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          Fix CSV import errors for Shopify, WooCommerce, Etsy, eBay, and Amazon. Browse by platform or search for a
          specific issue.
        </p>
      </header>

      {q ? (
        <section>
          <div className="mb-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for <strong className="text-[var(--text)]">"{q}"</strong>
          </div>
          {filtered.length === 0 ? (
            <p className="text-base text-[color:rgba(var(--muted-rgb),1)]">No guides matched your search.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((g) => (
                <li key={`${g.platform}/${g.slug}`}>
                  <Link
                    href={`/guides/${g.platform}/${g.slug}`}
                    className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-[color:rgba(var(--muted-rgb),1)]">
                        {PLATFORM_LABEL[g.platform]}
                      </span>
                      {g.kind === "curated" && (
                        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                          Guide
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
            <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">Browse by platform</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GUIDE_PLATFORMS.map((p) => {
                const count = platformCounts[p] ?? 0;
                return (
                  <Link
                    key={p}
                    href={`/guides/${p}`}
                    className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
                  >
                    <div className="font-semibold text-[var(--text)]">{PLATFORM_LABEL[p]}</div>
                    <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                      {count} guide{count !== 1 ? "s" : ""}
                    </div>
                    {PLATFORM_FIXER_HREF[p] && (
                      <div className="mt-2 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">
                        Includes fixer + issue guides
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {featuredGuides.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">Featured guides</h2>
              <ul className="space-y-3">
                {featuredGuides.map((g) => (
                  <li key={`${g.platform}/${g.slug}`}>
                    <Link
                      href={`/guides/${g.platform}/${g.slug}`}
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
            <h2 className="text-lg font-semibold text-[var(--text)]">Need help fixing your file?</h2>
            <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Upload your CSV and let the fixer validate, score, and auto-fix safe issues before you import.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="rg-btn" href="/app">
                Open CSV Fixer
              </Link>
              <Link className="pill-btn" href="/presets">
                Browse templates
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
