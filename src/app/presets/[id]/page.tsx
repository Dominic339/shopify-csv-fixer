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
    `Preset CSV format for ${preset.name}. View columns, download a sample CSV, or open the fixer with this preset selected.`;

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

function buildSampleRows(columns: string[]) {
  // Keep sample values minimal and generic so it still “looks like a CSV”
  // You can later swap this for per-preset sample data if you want.
  const row1: Record<string, string> = {};
  const row2: Record<string, string> = {};
  const row3: Record<string, string> = {};

  for (const c of columns) {
    row1[c] = "";
    row2[c] = "";
    row3[c] = "";
  }

  // Put a couple obvious examples when common fields exist (optional but nice)
  const setIfExists = (row: Record<string, string>, key: string, val: string) => {
    if (key in row) row[key] = val;
  };

  setIfExists(row1, "Title", "Example Item");
  setIfExists(row1, "Price", "19.99");
  setIfExists(row1, "Quantity", "10");
  setIfExists(row1, "Description", "Short description here");
  setIfExists(row1, "ImageURL", "https://example.com/image.jpg");
  setIfExists(row1, "Handle", "example-item");
  setIfExists(row1, "Email", "customer@example.com");

  return [row1, row2, row3];
}

export default async function PresetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const preset = getPresetById(id);

  if (!preset) return notFound();

  const openHref = `/app?preset=${encodeURIComponent(preset.formatId)}`;
  const sampleHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const columns = preset.columns ?? [];
  const sampleRows = buildSampleRows(columns);

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

      {/* Top card */}
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

        <div className="mt-4 text-xs text-[var(--muted)]">Preset ID: {preset.id}</div>
      </div>

      {/* CSV preview */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">CSV preview</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              This is what the CSV layout looks like for this preset.
            </p>
          </div>

          <a href={sampleHref} className="rg-btn">
            Download sample CSV
          </a>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[var(--surface-2)]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--text)]" style={{ width: 80 }}>
                    Row
                  </th>
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-3 font-semibold text-[var(--text)] whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sampleRows.map((r, idx) => (
                  <tr key={idx} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 text-[var(--muted)]">{idx + 1}</td>
                    {columns.map((c) => (
                      <td key={`${idx}-${c}`} className="px-4 py-3 text-[var(--text)]">
                        {r[c] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Tip: Download the sample to get a ready-to-fill template for this import.
        </p>
      </section>
    </main>
  );
}
