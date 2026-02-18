import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import { getEcommercePlatformById } from "@/lib/ecommercePlatforms";
import { getPresetById } from "@/lib/presetRegistry";

type PageProps = {
  params: { platform: string };
};

function titleFor(platformName: string) {
  return `${platformName} CSV Fixer`;
}

export default function EcommercePlatformPage({ params }: PageProps) {
  const platform = getEcommercePlatformById(params.platform);
  if (!platform) return notFound();

  const preset = getPresetById(platform.presetId);
  if (!preset) return notFound();

  const openFixerHref = `/app?preset=${encodeURIComponent(preset.formatId)}`;
  const templatePreviewHref = `/presets/${encodeURIComponent(preset.id)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: titleFor(platform.name),
    description: platform.blurb,
    url: `/ecommerce/${encodeURIComponent(platform.id)}`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-[var(--text)]">{titleFor(platform.name)}</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{platform.blurb}</p>
            {platform.description ? (
              <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">{platform.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href={openFixerHref}>
              Open the fixer
            </Link>
            <Link className="pill-btn" href={templatePreviewHref}>
              View template
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What StriveFormats checks</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Required columns and missing essentials</li>
            <li>Blank cells, hidden whitespace, and inconsistent formatting</li>
            <li>Pricing and numeric fields that should be numbers</li>
            <li>Common marketplace gotchas (like invalid values and empty identifiers)</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            The goal is simple: catch import-breaking problems early, and automatically clean up safe issues so your file is
            easier to finish manually.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">How it works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Upload your CSV</li>
            <li>We validate against the {preset.name} template</li>
            <li>Safe fixes apply automatically and are logged</li>
            <li>You manually edit anything risky directly in the table</li>
            <li>Export an import-ready CSV</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="pill-btn" href={sampleCsvHref}>
              Download a sample CSV
            </Link>
            <Link className="pill-btn" href="/presets">
              Browse all presets
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 space-y-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <div>
            <div className="font-semibold text-[var(--text)]">Will this change my product data?</div>
            <div>
              StriveFormats only applies deterministic, low risk fixes automatically (like trimming whitespace or normalizing
              known boolean fields). Anything that could change meaning stays as a manual edit.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">What if my columns are different?</div>
            <div>
              Use the template preview to see the expected column names. If your file uses different headers, rename columns
              to match before importing, or export from your source platform using the closest matching template.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Does it support variants?</div>
            <div>
              Shopify is the most advanced right now. Other ecommerce presets focus on consistent structure, required fields,
              and common import blockers.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/#pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </main>
  );
}
