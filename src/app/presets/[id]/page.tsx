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

function sampleValueForColumn(colName: string) {
  const c = colName.trim().toLowerCase();

  // Common patterns first
  if (c === "handle") return "example-item";
  if (c === "title" || c.includes("name")) return "Example Item";
  if (c.includes("body") || c.includes("description") || c.includes("html"))
    return "Example description text";
  if (c.includes("vendor") || c.includes("brand")) return "Example Brand";
  if (c.includes("category")) return "Example Category";
  if (c === "type") return "Example Type";
  if (c.includes("tag")) return "tag1, tag2";
  if (c.includes("published") || c.includes("active") || c.includes("enabled")) return "TRUE";
  if (c.includes("status")) return "active";

  // Money + quantities
  if (c.includes("price") || c.includes("cost") || c.includes("amount")) return "19.99";
  if (c.includes("qty") || c.includes("quantity") || c.includes("inventory") || c.includes("stock"))
    return "10";

  // IDs / SKUs
  if (c === "sku" || c.includes("sku")) return "SKU-EXAMPLE-001";
  if (c.includes("id")) return "12345";

  // Options / variants
  if (c.includes("option") && c.includes("name")) return "Size";
  if (c.includes("option") && c.includes("value")) return "M";
  if (c.includes("variant") && c.includes("price")) return "19.99";
  if (c.includes("variant") && c.includes("sku")) return "SKU-VAR-001";
  if (c.includes("variant") && (c.includes("qty") || c.includes("quantity") || c.includes("inventory")))
    return "10";

  // URLs / images
  if (c.includes("image") && c.includes("alt")) return "Example image alt text";
  if (c.includes("image") || c.includes("url") || c.includes("link"))
    return "https://example.com/item";

  // Contact-ish fields
  if (c.includes("email")) return "customer@example.com";
  if (c.includes("phone")) return "555-0100";

  // Address-ish fields
  if (c.includes("address")) return "123 Main St";
  if (c.includes("city")) return "Boston";
  if (c.includes("state") || c.includes("province")) return "MA";
  if (c.includes("zip") || c.includes("postal")) return "02101";
  if (c.includes("country")) return "US";

  // Dates
  if (c.includes("date")) return "2026-01-01";

  // Fallback: something non-empty that still reads like a placeholder
  return "Example";
}

function buildSampleRows(columns: string[]) {
  // Row 1: fill EVERY column with something
  const row1: Record<string, string> = {};
  for (const c of columns) row1[c] = sampleValueForColumn(c);

  // Row 2/3: keep blank so it still looks like a template
  const row2: Record<string, string> = {};
  const row3: Record<string, string> = {};
  for (const c of columns) {
    row2[c] = "";
    row3[c] = "";
  }

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
                    <th
                      key={c}
                      className="px-4 py-3 font-semibold text-[var(--text)] whitespace-nowrap"
                    >
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
