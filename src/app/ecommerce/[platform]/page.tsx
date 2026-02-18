// src/app/ecommerce/[platform]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { getEcommercePlatformById } from "@/lib/ecommercePlatforms";
import { getPresetById } from "@/lib/presetRegistry";

type PageProps = {
  params: { platform: string };
};

export function generateMetadata({ params }: PageProps): Metadata {
  const p = getEcommercePlatformById(params.platform);
  if (!p) return { title: "Platform not found | StriveFormats" };

  return {
    title: `${p.name} CSV Fixer | StriveFormats`,
    description: p.blurb,
    alternates: { canonical: `/ecommerce/${encodeURIComponent(p.id)}` },
    robots: { index: true, follow: true },
  };
}

export default function EcommercePlatformPage({ params }: PageProps) {
  const p = getEcommercePlatformById(params.platform);
  if (!p) return notFound();

  // Your ecommercePlatforms.ts uses presetId for the primary preset
  const preset = getPresetById(p.presetId);
  if (!preset) return notFound();

  const openFixerHref = `/app?preset=${encodeURIComponent(preset.id)}`;
  const templatePreviewHref = `/presets/${encodeURIComponent(preset.id)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${p.name} CSV Fixer`,
    description: p.blurb,
    url: `/ecommerce/${encodeURIComponent(p.id)}`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <JsonLd data={jsonLd} />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-sm font-semibold text-[var(--text)]">Ecommerce CSV Fixer</div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">{p.name}</h1>

        <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">{p.blurb}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open {p.name} tool</span>
          </Link>

          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Template preview</span>
          </Link>

          <a href={sampleCsvHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Download sample CSV</span>
          </a>
        </div>

        {preset.shortDescription ? (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">What this preset does</div>
            <p className="mt-2 text-sm text-[var(--muted)]">{preset.shortDescription}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
