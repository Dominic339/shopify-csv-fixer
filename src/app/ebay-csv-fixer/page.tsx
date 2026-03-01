import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "eBay CSV Fixer | StriveFormats",
  description:
    "Fix eBay listing CSV files before bulk upload. StriveFormats validates eBay File Exchange fields—title length, condition codes, price formatting, duration values, image URLs—and auto-fixes safe issues.",
  alternates: { canonical: "/ebay-csv-fixer" },
};

export default function EbayCsvFixerPage() {
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
            <h1 className="text-3xl font-semibold text-[var(--text)]">eBay CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              eBay File Exchange uploads reject rows silently when condition codes are wrong, titles exceed 80 characters,
              prices include currency symbols, or duration values don't match expected formats. Fix these before uploading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=ebay_listings">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/ebay_listings">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it catches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Missing required fields (Title, StartPrice, Quantity)</li>
            <li>Titles that exceed eBay's 80-character limit</li>
            <li>Invalid or unrecognized ConditionID codes</li>
            <li>Unrecognized Duration values (must be GTC or Days_N)</li>
            <li>Invalid listing Format (FixedPriceItem or Chinese only)</li>
            <li>Image URLs that aren't valid http(s) addresses</li>
            <li>Duplicate CustomLabel (SKU) values across rows</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes price formatting (removes currency symbols)</li>
            <li>Normalizes Action casing (e.g., "add" → "Add")</li>
            <li>Cleans PictureURL lists and removes empty entries</li>
            <li>Enforces canonical eBay File Exchange column order</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            If a fix could change meaning or data, it stays as a flagged issue for manual review.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Export your listing data or prepare a CSV using the eBay File Exchange template.</li>
          <li>Upload the CSV in the app with the eBay Listings preset selected.</li>
          <li>Resolve blocking errors (title length, missing price) then review warnings.</li>
          <li>Export a cleaned file ready for File Exchange bulk upload.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/ebay_listings/sample.csv">
            Download sample CSV
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 space-y-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <div>
            <div className="font-semibold text-[var(--text)]">What is eBay File Exchange?</div>
            <div>
              eBay File Exchange is eBay's bulk listing management tool. It accepts CSV files with specific column names
              and values to create, revise, or end listings in bulk. This fixer validates your CSV against those
              requirements before you upload.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">What ConditionIDs are valid?</div>
            <div>
              Common codes: 1000 (New), 2500 (Like New), 3000 (Good), 4000 (Acceptable), 5000 (For parts or not
              working). The fixer flags unrecognized IDs so you can correct them before upload.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Will it fix my titles automatically?</div>
            <div>
              No. Shortening a title might remove important keywords, so the fixer flags over-limit titles for you to
              edit manually rather than truncating them automatically.
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/ecommerce/ebay" className="hover:underline">
          eBay resources
        </Link>
      </div>
    </main>
  );
}
