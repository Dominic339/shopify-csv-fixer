import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import { getPresetById } from "@/lib/presets";
import { getFormatById } from "@/lib/formats";

type PageProps = {
  // Next.js versions differ on whether `params` is plain or a Promise.
  // Support both so we never accidentally 404 in production.
  params: { id: string } | Promise<{ id: string }>;
};

function sampleValueFor(header: string) {
  const h = header.toLowerCase();
  if (h.includes("title") || h.includes("name") || h.includes("item")) return "Sample Product";
  if (h.includes("sku")) return "SKU-1001";
  if (h.includes("handle")) return "sample-product";
  if (h.includes("price")) return "19.99";
  if (h.includes("quantity") || h.includes("stock") || h.includes("inventory")) return "10";
  if (h.includes("published")) return "TRUE";
  if (h.includes("url") || h.includes("image")) return "https://example.com/image.jpg";
  if (h.includes("category")) return "Example Category";
  if (h.includes("tag")) return "tag-one, tag-two";
  return "";
}

export default async function PresetDetailPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params as any);
  const rawId = typeof resolved?.id === "string" ? resolved.id : "";
  const id = decodeURIComponent(rawId);

  // Primary lookup by preset id
  let preset = getPresetById(id);
  // Fallback: some links may pass formatId instead of preset id.
  if (!preset) preset = getPresetById(id.replace(/\s+/g, ""));
  if (!preset) return notFound();

  const format = getFormatById(preset.formatId);
  const expectedHeaders = (format as any)?.expectedHeaders as string[] | undefined;
  const headers = Array.isArray(expectedHeaders) && expectedHeaders.length ? expectedHeaders : [];

  const openFixerHref = `/app?preset=${encodeURIComponent(preset.formatId)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${preset.name} Template`,
    description: preset.description,
    url: `/presets/${encodeURIComponent(preset.id)}`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">{preset.category}</div>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{preset.name}</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{preset.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href={openFixerHref}>
              Open with preset
            </Link>
            <Link className="pill-btn" href={sampleCsvHref}>
              Download sample CSV
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Expected columns</h2>
          {headers.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                  {h}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
              This preset does not expose a fixed column list yet.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Example row</h2>
          {headers.length ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    {headers.slice(0, 6).map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {headers.slice(0, 6).map((h) => (
                      <td key={h} className="px-3 py-2 text-[color:rgba(var(--muted-rgb),1)]">
                        {sampleValueFor(h)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <div className="border-t border-[var(--border)] px-4 py-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                Showing 6 columns for readability. Download the sample CSV for the full header set.
              </div>
            </div>
          ) : null}
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
