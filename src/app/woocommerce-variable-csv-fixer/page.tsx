import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "WooCommerce Variations CSV Fixer | StriveFormats",
  description:
    "Fix WooCommerce variable product + variation CSV imports before you import. StriveFormats validates variation structure, detects overwrite risks, and can auto-create missing parent rows safely.",
  alternates: { canonical: "/woocommerce-variable-csv-fixer" },
};

export default function WooCommerceVariableCsvFixerPage() {
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
            <h1 className="text-3xl font-semibold text-[var(--text)]">WooCommerce Variations CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Variable imports fail when variations are orphaned, attribute values are missing, SKUs collide, or duplicate
              attribute combinations overwrite each other.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=woocommerce_variable_products">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/woocommerce_variable_products">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it simulates</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Parent/variation grouping and rebuild impact</li>
            <li>Orphaned variation detection (and safe parent auto-creation)</li>
            <li>Overwrite risk when SKUs collide</li>
            <li>Duplicate variation combinations that can merge/overwrite</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes boolean-ish values to 1/0</li>
            <li>Normalizes price formatting (no currency symbols)</li>
            <li>Auto-creates missing parent rows (placeholder variable products)</li>
            <li>Enforces a canonical column order while preserving plugin columns</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Anything that could change meaning (like guessing SKUs or attribute values) stays manual.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Export variable products + variations from WooCommerce (or your plugin’s template).</li>
          <li>Upload the CSV in the app.</li>
          <li>Fix remaining blockers, then review warnings (especially SKU collisions).</li>
          <li>Export a fixed CSV and import into WooCommerce.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/woocommerce_variable_products/sample.csv">
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
