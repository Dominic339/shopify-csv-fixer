// src/app/presets/page.tsx

import Link from "next/link";
import { getPresetFormats, groupPresetsByCategory } from "@/lib/presets";
import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "Preset CSV Formats | StriveFormats",
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
          Presets are ready-made “format packs” that tell the fixer how to validate, auto-fix safe issues, and export a clean CSV
          for a specific platform. Pick your target import and you’ll open the fixer already configured.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
          </Link>
          <Link href="/shopify-csv-fixer" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Shopify CSV Fixer</span>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Most popular</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Shopify imports are the strictest. If you sell products with variants, this is the fastest way to prevent import failures.
          </p>
          <div className="mt-4">
            <Link href="/shopify-csv-fixer" className="rg-btn">Open Shopify landing page</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Run a quick test</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Try the fixer with a sample file. You can download messy CSVs on the Shopify page and see the fix log instantly.
          </p>
          <div className="mt-4">
            <Link href="/shopify-csv-fixer" className="rg-btn">Get sample downloads</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Need reusable rules</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            If you repeatedly clean similar files, Custom Formats lets you save templates and rules so repeat jobs take seconds.
          </p>
          <div className="mt-4">
            <Link href="/formats" className="rg-btn">Custom Formats</Link>
          </div>
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
