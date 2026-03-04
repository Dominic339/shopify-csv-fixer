// src/app/guides/[platform]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import {
  getAllGuides,
  getGuidesByPlatform,
  GUIDE_PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_PRESET_ID,
  PLATFORM_FIXER_HREF,
} from "@/lib/guidesRegistry";
import type { GuidePlatform } from "@/lib/guidesRegistry";

type Props = {
  params: Promise<{ platform: string }>;
};

export async function generateStaticParams() {
  return GUIDE_PLATFORMS.map((p) => ({ platform: p }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform } = await params;
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) return {};
  const p = platform as GuidePlatform;
  const label = PLATFORM_LABEL[p];
  const title = `${label} CSV Import Guides | StriveFormats`;
  const description =
    p === "general"
      ? "General CSV guides covering encoding, headers, quoting, line endings, and common import mistakes."
      : `Fix ${label} CSV import errors. Browse guides for every validation issue, with step-by-step instructions and auto-fix tips.`;
  return {
    title,
    description,
    alternates: { canonical: `/guides/${platform}` },
    openGraph: { title, description },
  };
}

export default async function PlatformGuidesPage({ params }: Props) {
  const { platform } = await params;
  if (!(GUIDE_PLATFORMS as string[]).includes(platform)) notFound();
  const p = platform as GuidePlatform;
  const guides = getGuidesByPlatform(p);
  const label = PLATFORM_LABEL[p];
  const presetId = PLATFORM_PRESET_ID[p];
  const fixerHref = PLATFORM_FIXER_HREF[p];

  // Group by category
  const byCategory: Record<string, typeof guides> = {};
  for (const g of guides) {
    if (!byCategory[g.category]) byCategory[g.category] = [];
    byCategory[g.category].push(g);
  }
  const categories = Object.keys(byCategory).sort();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${label} CSV Import Guides`,
    url: `https://striveformats.com/guides/${platform}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="mb-8">
        <div className="text-sm font-semibold uppercase text-[color:rgba(var(--muted-rgb),1)]">
          <Link href="/guides" className="hover:underline">
            Guides
          </Link>{" "}
          / {label}
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{label} CSV Import Guides</h1>
        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          {p === "general"
            ? "General CSV guides for encoding, headers, quoting, line endings, and common import mistakes."
            : `${guides.length} guides covering every validation issue for ${label} CSV imports.`}
        </p>
        {(fixerHref || presetId) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {fixerHref && (
              <Link className="rg-btn" href={fixerHref}>
                {label} CSV Fixer
              </Link>
            )}
            {presetId && (
              <Link className="pill-btn" href={`/app?preset=${presetId}`}>
                Open with preset
              </Link>
            )}
          </div>
        )}
      </header>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold capitalize text-[var(--text)]">{cat}</h2>
          <ul className="space-y-2">
            {byCategory[cat].map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${platform}/${g.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:border-[var(--ring)]"
                >
                  <div>
                    <div className="font-semibold text-[var(--text)]">{g.title}</div>
                    <div className="mt-0.5 text-sm text-[color:rgba(var(--muted-rgb),1)] line-clamp-1">
                      {g.description}
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 gap-2">
                    {g.blocking && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Blocking
                      </span>
                    )}
                    {g.autoFixable && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Auto-fix
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">Need help fixing your file?</h2>
        <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
          Upload your {label} CSV and get instant validation, scoring, and auto-fixes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="rg-btn" href={presetId ? `/app?preset=${presetId}` : "/app"}>
            Open CSV Fixer
          </Link>
          {presetId && (
            <Link className="pill-btn" href={`/presets/${presetId}`}>
              View template
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
