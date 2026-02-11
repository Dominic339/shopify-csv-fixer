// src/app/presets/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPresetById, getPresetFormats } from "@/lib/presets";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getPresetFormats().map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const preset = getPresetById(params.id);
  if (!preset) return {};
  return {
    title: `${preset.name} CSV Fixer`,
    description: preset.description,
  };
}

export default function PresetDetailPage({ params }: { params: { id: string } }) {
  const preset = getPresetById(params.id);
  if (!preset) return notFound();

  const openHref = `/app?preset=${encodeURIComponent(preset.formatId)}`;
  const sampleHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const columns = preset.columns ?? [];
  const sample = preset.sampleRows?.[0] ?? {};

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--muted)]">Preset format</p>

        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">
          {preset.name} CSV Fixer
        </h1>

        <p className="mt-3 text-sm text-[var(--muted)]">{preset.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
              Open fixer with this preset
            </span>
          </Link>

          <a href={sampleHref} className="rg-btn">
            Download sample CSV
          </a>

          <Link href="/presets" className="rg-btn">
            Back to all presets
          </Link>
        </div>

        <div className="mt-4 text-xs text-[var(--muted)]">Category: {preset.category}</div>
      </div>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Example columns</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              These are the columns this preset expects. Download the sample CSV to start from a clean template.
            </p>
          </div>

          <a href={sampleHref} className="rg-btn">
            Download sample CSV
          </a>
        </div>

        <div className="mt-6 data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {columns.map((c) => (
                    <td key={c} className="text-[color:rgba(var(--muted-rgb),1)]">
                      {sample[c] ?? ""}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {columns.length ? (
            <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
              Showing 1 example row. Download the sample CSV for a ready-to-use template.
            </div>
          ) : (
            <div className="p-4 text-sm text-[var(--muted)]">
              No columns configured for this preset yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
