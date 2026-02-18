import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "Shopify CSV Fixer | StriveFormats",
  description:
    "Fix Shopify product CSV import errors before they happen. StriveFormats validates the official Shopify products template, auto-fixes safe issues, and highlights blockers for manual edits.",
};

export default function ShopifyCsvFixerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metadata.title,
    description: metadata.description,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-[var(--text)]">Shopify CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Shopify imports are strict about structure. A CSV can look fine in Excel and still fail because of missing
              variant option columns, invalid booleans, inconsistent handles, or pricing/inventory fields that aren’t
              formatted the way Shopify expects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=shopify_products">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/shopify_products">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it catches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Missing required product fields (Title, Handle, Variant Price, etc.)</li>
            <li>Invalid boolean values like Published or Requires Shipping</li>
            <li>Variant structure mistakes (option columns missing or inconsistent)</li>
            <li>Pricing and inventory fields that are blank or not numeric</li>
            <li>Duplicate or conflicting identifiers (common handle/SKU issues)</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes known boolean fields to Shopify-friendly values</li>
            <li>Standardizes common separators (like Tags)</li>
            <li>Applies deterministic Shopify-safe defaults where appropriate</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Anything that could change meaning stays as a manual edit inside the table, with the exact cell highlighted.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Export your products from Shopify (or start with the official template).</li>
          <li>Upload the CSV in the app.</li>
          <li>Review blockers and warnings, then edit any risky cells directly in the table.</li>
          <li>Export a fixed CSV and import into Shopify.</li>
        </ol>
        <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          Want a quick starting file? Download the sample template and replace the example values with your real data.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/shopify_products/sample.csv">
            Download sample CSV
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 space-y-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <div>
            <div className="font-semibold text-[var(--text)]">Does StriveFormats guarantee a perfect import?</div>
            <div>
              It can’t guarantee your business data is correct, but it does aggressively surface Shopify’s structural
              blockers and applies safe auto-fixes. If you clear the remaining blockers, imports are dramatically more
              reliable.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Will it delete rows?</div>
            <div>No. It keeps your rows and focuses on normalizing values and highlighting issues.</div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Why do I see so many issues on big files?</div>
            <div>
              A single structural problem (like missing option columns for variants) can apply to many rows. Fix the root
              blocker and the issue count drops quickly.
            </div>
          </div>
        </div>
      </section>

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
