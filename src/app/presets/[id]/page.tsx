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

  // Shopify-specific SEO
  if (preset.id === "shopify_products") {
    const title = "Shopify Product CSV Template and Fixer | StriveFormats";
    const description =
      "Download the official Shopify product CSV template and validate your import. StriveFormats flags handle, SKU, variant option collisions, pricing, inventory, images, and SEO issues before you import to Shopify.";

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

  if (c === "url handle" || c === "handle") return "example-item";
  if (c === "title" || c.includes("name")) return "Example Item";
  if (c.includes("description") || c.includes("html")) return "Example description text";
  if (c.includes("vendor") || c.includes("brand")) return "Example Brand";
  if (c.includes("category")) return "Example Category";
  if (c === "type") return "Example Type";
  if (c.includes("tag")) return "tag1, tag2";
  if (c.includes("published")) return "TRUE";
  if (c.includes("status")) return "Active";

  if (c.includes("price") || c.includes("cost") || c.includes("amount")) return "19.99";
  if (c.includes("qty") || c.includes("quantity") || c.includes("inventory") || c.includes("stock")) return "10";

  if (c === "sku" || c.includes("sku")) return "SKU-EXAMPLE-001";
  if (c.includes("barcode")) return "1234567890";

  if (c.includes("option") && c.includes("name")) return "Size";
  if (c.includes("option") && c.includes("value")) return "M";

  if (c.includes("image") && c.includes("alt")) return "Example image alt text";
  if (c.includes("image") || c.includes("url") || c.includes("link")) return "https://example.com/item";

  if (c.includes("email")) return "customer@example.com";
  if (c.includes("phone")) return "555-0100";

  if (c.includes("address")) return "123 Main St";
  if (c.includes("city")) return "Boston";
  if (c.includes("state") || c.includes("province")) return "MA";
  if (c.includes("zip") || c.includes("postal")) return "02101";
  if (c.includes("country")) return "US";

  if (c.includes("date")) return "2026-01-01";

  return "Example";
}

function buildSampleRows(columns: string[]) {
  const row1: Record<string, string> = {};
  for (const c of columns) row1[c] = sampleValueForColumn(c);

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
  const sampleRows =
    preset.sampleRows && preset.sampleRows.length > 0 ? preset.sampleRows : buildSampleRows(columns);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: preset.id === "shopify_products" ? "Shopify Product CSV Template and Fixer" : `${preset.name} CSV Format`,
    description: preset.description ?? "",
    url: `/presets/${encodeURIComponent(preset.id)}`,
  };

  const isShopify = preset.id === "shopify_products";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--muted)]">Preset format</p>

        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">
          {isShopify ? "Shopify Products CSV" : preset.name}
        </h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          {isShopify
            ? "Use the official Shopify product CSV headers and validate your file before importing. StriveFormats flags handle, SKU, variant, pricing, inventory, image, and SEO issues and applies only safe auto-fixes."
            : preset.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open fixer with this preset</span>
          </Link>

          {isShopify ? (
            <Link href="/shopify-csv-fixer" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                Shopify CSV Fixer landing page
              </span>
            </Link>
          ) : null}

          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Back to all presets</span>
          </Link>
        </div>

        <div className="mt-4 text-xs text-[var(--muted)]">Preset ID: {preset.id}</div>
      </div>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">CSV preview</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isShopify
                ? "This preview mirrors the official Shopify product CSV template."
                : "This is what the CSV layout looks like for this preset."}
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
                      <td key={`${idx}-${c}`} className="px-4 py-3 text-[var(--text)] whitespace-nowrap">
                        {r[c] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--muted)]">Tip: Download the sample to get a ready-to-fill template for this import.</p>
      </section>

      {isShopify ? (
        <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">What this Shopify preset checks</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Shopify imports can fail silently or partially when grouping and variant rules are violated. This preset is built
            to catch the common problems before you import.
          </p>

          <ul className="mt-4 list-disc pl-6 text-sm text-[var(--muted)]">
            <li>URL handle grouping and handle formatting rules</li>
            <li>Duplicate handle rows that do not represent valid variants</li>
            <li>Variant option collisions: identical option combinations under the same handle</li>
            <li>Duplicate SKUs (and a stronger alert when the same SKU appears across different products)</li>
            <li>Pricing numeric validation and compare at price sanity checks</li>
            <li>Inventory quantity integer validation</li>
            <li>Image URL validation and image position consistency</li>
            <li>Basic SEO guidance for title and description length</li>
          </ul>

          <p className="mt-4 text-sm text-[var(--muted)]">
            If you want, the next improvements can be Shopify specific autofix packs (safer “fix all” rules) and deeper catalog
            consistency checks like duplicate barcodes, missing required tax codes, and Google Shopping field completeness.
          </p>
        </section>
      ) : null}
    </main>
  );
}
