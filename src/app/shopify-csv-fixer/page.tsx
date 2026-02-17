// src/app/shopify-csv-fixer/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shopify CSV Fixer | StriveFormats Shopify Import Optimizer",
  description:
    "Fix Shopify product CSV import errors instantly. Validate handles, variants, options, pricing, inventory, images, and SEO — then export a Shopify-ready CSV.",
  alternates: { canonical: "/shopify-csv-fixer" },
  openGraph: {
    title: "Shopify CSV Fixer | StriveFormats",
    description:
      "Client-side Shopify CSV validation + auto-fix for products, variants, images, pricing, inventory, and SEO.",
    url: "/shopify-csv-fixer",
    type: "website",
  },
};

export default function ShopifyCsvFixerPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted)]">
          StriveFormats · Shopify Import Optimizer
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">Shopify CSV Fixer</h1>
        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          Upload your Shopify Products CSV and we’ll highlight exactly what Shopify will reject — then auto-fix the safe stuff
          (booleans, pricing formats, inventory rules, schema issues) so your import works the first time.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app?preset=shopify_products&exportName=shopify-products"
            className="rounded-2xl bg-[color:rgba(var(--accent-rgb),0.9)] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Upload Shopify CSV
          </Link>

          <Link
            href="/presets/shopify_products"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            View template columns + sample
          </Link>

          <Link
            href="/presets"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            Browse all presets
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Common Shopify import errors we fix</h2>
          <ul className="mt-4 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            <li>Invalid Published values (TRUE/FALSE normalization)</li>
            <li>Invalid Variant Inventory Policy (deny/continue)</li>
            <li>Bad price formats (currency symbols, commas, whitespace)</li>
            <li>Missing required columns (adds headers safely with blank values)</li>
            <li>Variant grouping issues (duplicate handles that aren’t real variants)</li>
            <li>Option structure problems (Option2/3 hierarchy rules)</li>
          </ul>

          <div className="mt-5 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Want to see the exact column layout Shopify expects?{" "}
            <Link className="font-semibold text-[var(--text)] hover:underline" href="/presets/shopify_products">
              View the template preview
            </Link>
            .
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">What you get</h2>
          <ul className="mt-4 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            <li>Weighted validation score with category breakdown</li>
            <li>One-click Fix All Blocking Issues (safe fixes only)</li>
            <li>Plain-English error explanations (why Shopify rejects it, how to fix)</li>
            <li>Image URL validation and duplicate image detection</li>
            <li>Lightweight SEO checks (titles, descriptions, duplicates)</li>
          </ul>
        </section>
      </div>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">How it works</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">1) Upload</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Drop in your Shopify Products CSV. Everything runs in your browser.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">2) Validate + Optimize</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              We enforce strict schema rules for handles, variants, options, pricing, inventory, images, and SEO.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">3) Export</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Export a fixed CSV that imports cleanly into Shopify.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Does my data leave my browser?</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              No. Validation and fixes run client-side. You can export locally.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Can you fix every Shopify error?</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              We auto-fix deterministic issues (formatting, normalization, missing headers). Anything that requires business
              context (like choosing the correct handle, title, or vendor) is left for manual editing.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Do you support WooCommerce, Etsy, eBay…?</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Yes. StriveFormats is built around presets. Shopify is the most advanced today, and the same framework scales to 20+ formats.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app?preset=shopify_products&exportName=shopify-products"
            className="rounded-2xl bg-[color:rgba(var(--accent-rgb),0.9)] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Fix my Shopify CSV
          </Link>

          <Link
            href="/presets"
            className="text-sm font-semibold text-[var(--text)] hover:underline"
          >
            See all presets
          </Link>
        </div>
      </section>

      <div className="mt-10 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        Looking for another platform? Start here:{" "}
        <Link className="hover:underline" href="/presets">
          Preset Formats
        </Link>
      </div>
    </div>
  );
}
