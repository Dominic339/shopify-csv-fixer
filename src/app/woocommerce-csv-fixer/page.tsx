import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "WooCommerce CSV Fixer | StriveFormats",
  description:
    "Fix WooCommerce product CSV import issues before you import. StriveFormats validates WooCommerce’s core Product CSV columns, auto-fixes safe issues, and flags blockers (including variations).",
};

export default function WooCommerceCsvFixerPage() {
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
            <h1 className="text-3xl font-semibold text-[var(--text)]">WooCommerce CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              WooCommerce imports can fail quietly when column names don’t match, prices include currency symbols, boolean
              flags aren’t valid, or variation rows are missing parent or attribute values.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=woocommerce_products">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/woocommerce_products">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it catches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Missing required columns (Type, Name, Published)</li>
            <li>Invalid Type values (simple, variable, variation, etc.)</li>
            <li>Bad boolean fields (Published, In stock?)</li>
            <li>Prices that aren’t clean decimals</li>
            <li>Variation blockers (missing Parent or attribute values)</li>
            <li>Duplicate variation attribute combinations under the same parent</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes boolean-ish values to 1/0</li>
            <li>Normalizes price formatting (no currency symbols)</li>
            <li>Cleans image URL lists and removes empty entries</li>
            <li>Enforces a canonical column order while preserving plugin columns</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Anything that could change meaning stays as a manual edit inside the table.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Export your products from WooCommerce (or start with an importer template).</li>
          <li>Upload the CSV in the app.</li>
          <li>Fix blockers (especially variation Parent + attributes), then review warnings.</li>
          <li>Export a fixed CSV and import into WooCommerce.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/woocommerce_products/sample.csv">
            Download sample CSV
          </Link>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/ecommerce/woocommerce" className="hover:underline">
          WooCommerce resources
        </Link>
      </div>
    </main>
  );
}
