// src/app/presets/page.tsx

import Link from "next/link";
import { getPresetFormats, groupPresetsByCategory } from "@/lib/presets";
import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "Preset CSV Formats",
  description:
    "Pick a preset CSV format for Shopify, WooCommerce, Google Ads, Mailchimp, QuickBooks and more. Open the fixer preconfigured for your platform.",
};

export default function PresetsPage() {
  const presets = getPresetFormats();
  const { categories, map } = groupPresetsByCategory(presets);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Preset CSV Formats",
    description:
      "Preset CSV formats for popular platforms. Open the CSV Fixer preconfigured for your import target.",
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--muted)]">StriveFormats</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Preset CSV Formats</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Pick your platform and open the CSV Fixer already configured for that import.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
              Open CSV Fixer
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {categories.map((cat) => {
          const items = map.get(cat) ?? [];
          return (
            <section key={cat}>
              <h2 className="text-lg font-semibold text-[var(--text)]">{cat}</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const detailHref = `/presets/${encodeURIComponent(p.id)}`;
                  const openHref = `/app?preset=${encodeURIComponent(p.formatId)}`;

                  return (
                    <div
                      key={p.id}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
                    >
                      <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
                      <p className="mt-2 text-sm text-[var(--muted)]">{p.description}</p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link href={detailHref} className="rg-btn">
                          View details
                        </Link>
                        <Link href={openHref} className="rg-btn">
                          Open in fixer
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
