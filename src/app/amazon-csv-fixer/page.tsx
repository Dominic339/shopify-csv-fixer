import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "Amazon CSV Fixer | StriveFormats",
  description:
    "Fix Amazon inventory loader CSV files before upload. StriveFormats validates flat-file fields—SKU length, condition codes, price formatting, fulfillment channel, and boolean fields—and auto-fixes safe issues.",
  alternates: { canonical: "/amazon-csv-fixer" },
};

export default function AmazonCsvFixerPage() {
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
            <h1 className="text-3xl font-semibold text-[var(--text)]">Amazon CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Amazon flat-file uploads fail when SKUs are too long, condition codes are unrecognized, prices include
              currency symbols, or fulfillment channel values don't match expected constants. This tool catches those
              issues before submission.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=amazon_inventory_loader">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/amazon_inventory_loader">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it catches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Missing required columns (sku, item-name, price, quantity)</li>
            <li>SKUs exceeding Amazon's 40-character limit</li>
            <li>Invalid or unrecognized item-condition codes</li>
            <li>Unrecognized product-id-type values (ASIN, UPC, EAN, etc.)</li>
            <li>Invalid fulfillment-channel values</li>
            <li>Invalid add-delete operation codes</li>
            <li>Image URLs that aren't valid http(s) addresses</li>
            <li>Boolean fields (will-ship-internationally, expedited-shipping) with invalid values</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes price formatting (removes currency symbols)</li>
            <li>Normalizes product-id-type to uppercase (e.g., "asin" → "ASIN")</li>
            <li>Normalizes add-delete to lowercase (e.g., "A" → "a")</li>
            <li>Enforces canonical Amazon flat-file column order</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Anything that could change meaning stays as a flagged issue for manual review.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Download your inventory file from Amazon Seller Central or prepare a flat-file template.</li>
          <li>Upload the CSV in the app with the Amazon Inventory Loader preset selected.</li>
          <li>Resolve blocking errors (missing SKU, invalid price) then review warnings.</li>
          <li>Export a cleaned file and upload it to Seller Central.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/amazon_inventory_loader/sample.csv">
            Download sample CSV
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 space-y-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <div>
            <div className="font-semibold text-[var(--text)]">What is an Amazon inventory loader flat-file?</div>
            <div>
              Amazon Seller Central supports uploading product listings and inventory in bulk via tab-delimited or
              comma-delimited flat files. This fixer targets the inventory loader format, validating fields like SKU,
              price, quantity, condition, and fulfillment channel.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">What fulfillment-channel values are valid?</div>
            <div>
              Use DEFAULT for Merchant Fulfilled (you ship the orders) or AMAZON_NA for Fulfillment by Amazon (FBA).
              Other regional FBA values include AMAZON_EU and AMAZON_FE.
            </div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">What are valid item-condition codes?</div>
            <div>
              Amazon uses numeric codes: 11=New, 10=Refurbished, 1=Used Like New, 2=Used Very Good, 3=Used Good,
              4=Used Acceptable. The fixer flags any unrecognized condition codes.
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/ecommerce/amazon" className="hover:underline">
          Amazon resources
        </Link>
      </div>
    </main>
  );
}
