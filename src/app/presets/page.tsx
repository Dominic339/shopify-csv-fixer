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
              <Link className="rg-btn" href={`/presets/${encodeURIComponent(p.id)}`}>
                View information
              </Link>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-[var(--text)]">Platform-specific fixers</h2>
        <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">Dedicated validation guides for each ecommerce platform.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/shopify-csv-fixer", label: "Shopify CSV Fixer" },
            { href: "/woocommerce-csv-fixer", label: "WooCommerce CSV Fixer" },
            { href: "/woocommerce-variable-csv-fixer", label: "WooCommerce Variations Fixer" },
            { href: "/etsy-csv-fixer", label: "Etsy CSV Fixer" },
            { href: "/ebay-csv-fixer", label: "eBay CSV Fixer" },
            { href: "/ebay-variations-csv-fixer", label: "eBay Variations Fixer" },
            { href: "/amazon-csv-fixer", label: "Amazon CSV Fixer" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-base font-semibold text-[var(--text)] hover:border-[var(--ring)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

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
