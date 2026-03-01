import Link from "next/link";

import JsonLd from "@/components/JsonLd";

export const metadata = {
  title: "Etsy CSV Fixer | StriveFormats",
  description:
    "Clean up Etsy listing CSV data for bulk edits and catalog review. StriveFormats validates titles, prices, quantity, tags, and image URLs—auto-fixing safe issues and flagging risky ones.",
};

export default function EtsyCsvFixerPage() {
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
            <h1 className="text-3xl font-semibold text-[var(--text)]">Etsy CSV Fixer</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{metadata.description}</p>
            <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Keep your listing spreadsheet clean: consistent prices, valid quantities, and tags that fit Etsy’s limits.
              Export-ready data makes bulk editing and migrations smoother.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href="/app?preset=etsy_listings">
              Open the fixer
            </Link>
            <Link className="pill-btn" href="/presets/etsy_listings">
              View template
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it catches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Missing required fields (Title, Price, Quantity)</li>
            <li>Titles that are too long</li>
            <li>Invalid prices or non-integer quantities</li>
            <li>Too many tags or tags that are too long</li>
            <li>Invalid image URLs</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">What it auto-fixes (safe only)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
            <li>Trims hidden whitespace</li>
            <li>Normalizes price formatting</li>
            <li>Normalizes tag and materials separators</li>
            <li>Cleans image URL lists and removes empty entries</li>
            <li>Enforces a consistent column order</li>
          </ul>
          <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
            If a fix could change meaning, we leave it as an issue for you.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How to use it</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Export your listing data (or build a spreadsheet using the preset template).</li>
          <li>Upload the CSV in the app.</li>
          <li>Resolve blockers, then review warnings like tag limits.</li>
          <li>Export your cleaned file for bulk edits or migration prep.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="pill-btn" href="/presets/etsy_listings/sample.csv">
            Download sample CSV
          </Link>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/ecommerce/etsy" className="hover:underline">
          Etsy resources
        </Link>
      </div>
    </main>
  );
}
