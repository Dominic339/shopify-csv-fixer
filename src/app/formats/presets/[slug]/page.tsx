// src/app/formats/presets/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPresetBySlug, PRESET_FORMATS } from "@/lib/presetRegistry";

type Props = {
  params: { slug: string };
};

export function generateStaticParams() {
  return PRESET_FORMATS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const preset = getPresetBySlug(params.slug);
  if (!preset) return { title: "Preset Format" };

  const title = `${preset.name} CSV Format`;
  const description = preset.shortDescription;

  return {
    title,
    description,
    alternates: { canonical: `/formats/presets/${preset.slug}` },
    robots: { index: true, follow: true },
    keywords: preset.searchKeywords,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/formats/presets/${preset.slug}`,
    },
  };
}

export default function PresetFormatDetailPage({ params }: Props) {
  const preset = getPresetBySlug(params.slug);
  if (!preset) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <nav className="mb-8 text-sm text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        <span className="mx-2">/</span>
        <Link href="/formats/presets" className="hover:underline">
          Preset Formats
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-[var(--text)]">{preset.name}</span>
      </nav>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-sm font-semibold text-[var(--muted)]">{preset.category}</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--text)]">{preset.name}</h1>
        <p className="mt-4 max-w-3xl text-base text-[var(--muted)]">{preset.shortDescription}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app?preset=${encodeURIComponent(preset.id)}&exportName=${encodeURIComponent(preset.slug)}`} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer with this preset</span>
          </Link>
          <Link href="/formats" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Use a Custom Format</span>
          </Link>
          <Link href="/formats/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Back to all presets</span>
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">When to use this preset</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>You have a CSV that should match {preset.name} fields.</li>
            <li>Your import/export is failing due to formatting or inconsistent values.</li>
            <li>You want a fast starting point before making custom rules.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">What it helps with</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Normalizes common CSV issues that break imports.</li>
            <li>Helps align headers and values to a known layout.</li>
            <li>Flags risky changes so you can review before export.</li>
          </ul>
        </div>
      </section>

      {preset.id === "shopify_products" && (
        <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">How to import into Shopify</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>In Shopify Admin, go to Products.</li>
            <li>Click Import.</li>
            <li>Select the CSV you exported from CSV Fixer (it will download as "{preset.slug}_fixed.csv").</li>
            <li>Choose whether you want to overwrite existing products (Shopify will show this option during import).</li>
            <li>Start the import and review the Shopify results screen for any remaining warnings.</li>
          </ol>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Tip</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              In the app, aim for a <span className="font-semibold text-[var(--text)]">Ready to import</span> badge
              before exporting. Warnings are usually safe, but errors commonly block Shopify imports.
            </p>
          </div>
        </section>
      )}

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-lg font-semibold text-[var(--text)]">Tips</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Start with the preset</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Use this preset to get a clean baseline. If you do this workflow often, save a Custom Format so repeat jobs
              take seconds.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Review flagged items</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Anything that could change meaning should be reviewed before export. The goal is safe, predictable imports.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
