import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "eBay Variations CSV Fixer | StriveFormats",
  description:
    "Fix eBay variation listing CSV files before bulk upload. StriveFormats validates VariationSpecifics pairing, duplicate variation combinations, price formatting, and image URLs for eBay File Exchange.",
  alternates: { canonical: "/ebay-variations-csv-fixer" },
};

export default function EbayVariationsCsvFixerPage() {
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
            <h1 className="text-3xl font-semibold text-[var(--text)]">eBay Variations CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              eBay variation uploads fail when VariationSpecificsName and VariationSpecificsValue are mismatched, when
              duplicate variation combinations are present, or when prices aren't formatted as plain decimals. Fix these
              before uploading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=ebay_variations">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/ebay_variations">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it catches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Missing required columns (Title, StartPrice, Quantity, VariationSpecificsName/Value)</li>
            <li>VariationSpecificsName and VariationSpecificsValue mismatches (one filled, one blank)</li>
            <li>Duplicate variation combinations under the same listing</li>
            <li>Titles that exceed eBay's 80-character limit</li>
            <li>Invalid or missing prices</li>
            <li>VariationPictureURL that aren't valid http(s) addresses</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes price formatting (removes currency symbols)</li>
            <li>Normalizes integer quantities</li>
            <li>Enforces canonical eBay Variations column order</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Variation specifics mismatches and duplicate combos stay as flagged issues — they require manual decisions.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Export your variation listing data or prepare a CSV using the eBay Variations template.</li>
          <li>Upload the CSV in the app with the eBay Variations preset selected.</li>
          <li>Resolve blocking errors (specifics mismatches, duplicate combos) then review warnings.</li>
          <li>Export a cleaned file ready for File Exchange bulk upload.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/ebay_variations/sample.csv">
            Download sample CSV
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 space-y-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <div>
            <div className="font-semibold text-[var(--text)]">What is VariationSpecifics in eBay File Exchange?</div>
            <div>
              eBay uses VariationSpecificsName (e.g., "Color|Size") and VariationSpecificsValue (e.g., "Blue|Medium")
              to define each variation row. Both must always be provided together — a row with only one filled causes the
              listing to fail. This fixer flags mismatches so you can correct them.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">What counts as a duplicate variation combination?</div>
            <div>
              If two rows share the same listing (CustomLabel + Title) and the same VariationSpecificsName/Value pair,
              eBay will overwrite one with the other. The fixer detects these so you can remove or correct the duplicate
              before uploading.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">How is this different from the eBay Listings fixer?</div>
            <div>
              The eBay Listings fixer targets standard (non-variation) listings using eBay File Exchange format. This
              fixer is specifically for variation listings that use VariationSpecificsName and VariationSpecificsValue
              columns to define product options like size and color.
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/ebay-csv-fixer" className="hover:underline">
          eBay CSV Fixer
        </Link>
        <Link href="/ecommerce/ebay" className="hover:underline">
          eBay resources
        </Link>
        <Link href="/amazon-csv-fixer" className="hover:underline">
          Amazon CSV Fixer
        </Link>
      </div>
    </main>
  );
}
