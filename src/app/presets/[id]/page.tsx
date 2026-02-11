// src/app/presets/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { getPresetFormats, getPresetById } from "@/lib/presets";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamicParams = false;

// IMPORTANT: This ensures every preset id gets a real page at build time.
// If an id is missing here, that preset will 404.
export async function generateStaticParams() {
  const presets = getPresetFormats();
  return presets.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const preset = getPresetById(id);

  if (!preset) {
    return {
      title: "Preset not found",
      description: "This preset CSV format does not exist.",
    };
  }

  const title = `${preset.name} CSV Format`;
  const description =
    preset.description ||
    `Preset CSV format for ${preset.name}. View expected columns, download a sample CSV, or open the fixer with this preset selected.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/presets/${encodeURIComponent(preset.id)}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/presets/${encodeURIComponent(preset.id)}`,
    },
  };
}

export default async function PresetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const preset = getPresetById(id);

  if (!preset) return notFound();

  const openHref = `/app?preset=${encodeURIComponent(preset.formatId)}`;
  const sampleHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${preset.name} CSV Format`,
    description: preset.description ?? "",
    url: `/presets/${encodeURIComponent(preset.id)}`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      {/* Top card (keep this like you requested) */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--muted)]">Preset format</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{preset.name}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{preset.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
              Open fixer with this preset
            </span>
          </Link>

          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
              Back to all presets
            </span>
          </Link>
        </div>

        <div className="mt-4 text-xs text-[var(--muted)]">
          Preset ID: {preset.id}
        </div>
      </div>

      {/* Columns table + sample download */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Expected columns</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              These are the column headers this preset expects (and can normalize to).
            </p>
          </div>

          <a href={sampleHref} className="rg-btn">
            Download sample CSV
          </a>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--text)]" style={{ width: 80 }}>
                  #
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--text)]">Column name</th>
              </tr>
            </thead>
            <tbody>
              {preset.columns.map((col, idx) => (
                <tr key={col} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 text-[var(--muted)]">{idx + 1}</td>
                  <td className="px-4 py-3 text-[var(--text)]">{col}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Tip: If your file has different header names, the fixer can often map or normalize them depending on the preset.
        </p>
      </section>
    </main>
  );
}
