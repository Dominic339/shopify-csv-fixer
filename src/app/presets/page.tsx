import Link from "next/link";

import JsonLd from "@/components/JsonLd";
import { getPresetFormats } from "@/lib/presets";
import { getPopularGuides } from "@/lib/guides/getPopularGuides";

export const metadata = {
  title: "CSV Import Templates | Fix CSV Import Errors | StriveFormats",
  description:
    "Browse ecommerce CSV templates for Shopify, WooCommerce, Etsy, Amazon, and eBay. Preview columns, download samples, and open the fixer with a preset selected.",
};

export default function PresetsPage() {
  const presets = getPresetFormats();
  const popularGuides = getPopularGuides(null, 6);

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

      {popularGuides.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[var(--text)]">Popular CSV Guides</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Step-by-step guides for the most common CSV import problems.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularGuides.map((g) => (
              <Link
                key={`${g.platform}/${g.slug}`}
                href={`/guides/${g.platform}/${g.slug}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ring)]"
              >
                <div className="text-xs text-[color:rgba(var(--muted-rgb),0.7)] capitalize">{g.platform}</div>
                <div className="mt-1 font-semibold text-[var(--text)]">{g.title}</div>
                <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)] line-clamp-2">{g.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5">
            <Link href="/guides" className="text-base text-[var(--accent)] hover:underline">
              Browse all CSV guides &rarr;
            </Link>
          </div>
        </section>
      )}

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
