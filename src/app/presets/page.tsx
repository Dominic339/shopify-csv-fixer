import Link from "next/link";

import JsonLd from "@/components/JsonLd";
import { getPresetFormats } from "@/lib/presets";

export const metadata = {
  title: "Preset Formats | StriveFormats",
  description:
    "Browse ecommerce CSV templates for Shopify, WooCommerce, Etsy, Amazon, and eBay. Preview columns, download samples, and open the fixer with a preset selected.",
};

export default function PresetsPage() {
  const presets = getPresetFormats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Preset Formats",
    description: metadata.description,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Preset Formats</h1>
        <p className="mt-3 max-w-3xl text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {presets.map((p) => (
          <div key={p.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">{p.category}</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">{p.name}</h2>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{p.description}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rg-btn" href={`/app?preset=${encodeURIComponent(p.formatId)}`}>
                Open with preset
              </Link>
              <Link className="pill-btn" href={`/presets/${encodeURIComponent(p.id)}`}>
                View template
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/app?preset=shopify_products" className="hover:underline">
          CSV Fixer
        </Link>
        <Link href="/#pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </main>
  );
}
