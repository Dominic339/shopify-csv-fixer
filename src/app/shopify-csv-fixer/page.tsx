import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shopify CSV Fixer | StriveFormats",
  description:
    "Clean, standardize, and validate Shopify product CSVs before import. Catch handle, variant, option, pricing, inventory, image, and SEO issues — then export a Shopify-ready CSV.",
  alternates: { canonical: "/shopify-csv-fixer" },
  openGraph: {
    title: "Shopify CSV Fixer | StriveFormats",
    description:
      "Client-side Shopify CSV validation + safe auto-fix for products, variants, pricing, inventory, images, and SEO.",
    url: "/shopify-csv-fixer",
    type: "website",
  },
};

const sampleDownloads = [
  {
    name: "Messy Shopify export 1 (Classic Tee)",
    href: "/samples/messy_shopify_export_1_classic_tee.csv",
    note: "Missing handles, mixed booleans, messy tags, and formatting problems.",
  },
  {
    name: "Messy Shopify export 2 (Duplicate SKU)",
    href: "/samples/messy_shopify_export_2_duplicate_sku.csv",
    note: "Duplicate SKUs, inconsistent variant grouping, and import blockers.",
  },
  {
    name: "Messy Shopify export 3 (Multi-variant edge cases)",
    href: "/samples/messy_shopify_export_3_multivariant_edges.csv",
    note: "Option collisions, duplicate variant combinations, and tricky rows.",
  },
  {
    name: "Stress test (5,500 rows)",
    href: "/samples/shopify_stress_test_5500_rows.csv",
    note: "Big file to test performance, stability, and fix logging.",
  },
  {
    name: "Stress test (fixed output)",
    href: "/samples/shopify_stress_test_5500_rows_fixed.csv",
    note: "What StriveFormats exports after fixes (optional to include).",
  },
];

const faq = [
  {
    q: "Does my CSV get uploaded to a server?",
    a: "The core parsing, validation, and cell edits run in your browser. When you export, the cleaned CSV is generated locally. (Your subscription status may be checked server-side, but your CSV content does not need to be uploaded for the fixer to work.)",
  },
  {
    q: "What does StriveFormats fix automatically?",
    a: "Safe, deterministic fixes: trimming extra spaces, normalizing Shopify booleans, enforcing price formatting, mapping legacy inventory policy values, filling missing required headers with blank values, normalizing tags, and other changes that do not require business judgement.",
  },
  {
    q: "What does StriveFormats refuse to auto-fix?",
    a: "Anything that could change meaning: choosing a new handle when there is a conflict, deciding a product title, selecting a vendor, or inventing option values. Those are flagged as issues so you can review and decide.",
  },
  {
    q: "Why does Shopify reject CSVs that look “fine” in Excel?",
    a: "Because Shopify is strict about the *shape* of your data across rows. Many failures are cross-row: duplicate handles that are not valid variants, duplicate SKUs across products, duplicate option combinations, missing required values on a single variant row, and invalid booleans/prices that Excel visually hides.",
  },
  {
    q: "Can I use this if I exported from another system (ERP, PIM, etc.)?",
    a: "Yes. As long as you can output a CSV, StriveFormats can validate and normalize it into Shopify’s expected import template shape, then highlight anything that still needs human attention.",
  },
  {
    q: "Will the exported file match Shopify’s template column order?",
    a: "Yes — the Shopify optimizer enforces the official header names and order on export so the file is import-ready.",
  },
  {
    q: "Do you support WooCommerce, Etsy, eBay, and other formats?",
    a: "Yes. Preset formats exist for many platforms, and Shopify is the most hardened preset right now. You can browse the full preset list any time.",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted)]">
      {children}
    </span>
  );
}

export default function ShopifyCsvFixerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StriveFormats",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Clean, standardize, and validate Shopify product CSVs before import. Catch handle, variant, pricing, inventory, image, and SEO issues, then export a Shopify-ready CSV.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>StriveFormats</Pill>
          <Pill>Clean. Standardize. Validate.</Pill>
          <Pill>Shopify Products CSV</Pill>
          <Pill>Runs in-browser</Pill>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-[var(--text)]">Shopify CSV Fixer</h1>

        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          Shopify CSV imports fail for reasons that are easy to miss in spreadsheets: invalid booleans, inconsistent
          pricing formats, variant rows that don’t agree with each other, duplicate option combinations, duplicate SKUs,
          and “handle collisions” where multiple products accidentally share the same handle.
        </p>

        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          StriveFormats is built to do one thing extremely well: <strong className="text-[var(--text)]">clean, standardize, and validate</strong>{" "}
          your Shopify Products CSV before you import. It auto-fixes the safe issues and clearly flags anything risky,
          so you can export an import-ready CSV with confidence.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app?preset=shopify_products&exportName=shopify-products"
            className="rounded-2xl bg-[color:rgba(var(--accent-rgb),0.9)] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Open Shopify CSV Fixer
          </Link>
          <Link
            href="/presets"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            Browse all presets
          </Link>
          <Link href="/#pricing" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]">
            View pricing
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 text-xs text-[var(--muted)]">
          <span>Files processed locally</span>
          <span>No forced signup</span>
          <span>Export import-ready CSV</span>
        </div>
      </section>

      {/* QUICK VALUE GRID */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Common Shopify import problems (and what we do)</h2>
          <ul className="mt-4 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            <li><strong className="text-[var(--text)]">Published values</strong>: normalize to Shopify-safe TRUE/FALSE.</li>
            <li><strong className="text-[var(--text)]">Inventory policy</strong>: map legacy values and validate continue/deny logic.</li>
            <li><strong className="text-[var(--text)]">Pricing formats</strong>: strip currency symbols/commas, fix decimals, normalize blanks.</li>
            <li><strong className="text-[var(--text)]">Required headers</strong>: enforce Shopify’s template header set and export order.</li>
            <li><strong className="text-[var(--text)]">Variant grouping</strong>: detect broken variant groupings and cross-row inconsistencies.</li>
            <li><strong className="text-[var(--text)]">Options</strong>: detect option collisions and invalid Option1/2/3 structures.</li>
            <li><strong className="text-[var(--text)]">Images</strong>: validate URLs and flag obvious image issues and duplicates.</li>
            <li><strong className="text-[var(--text)]">SEO</strong>: surface duplicates and missing content that will hurt listings.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">What you get inside the fixer</h2>
          <ul className="mt-4 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            <li>Import confidence score and category breakdown (structure, variants, pricing, inventory, images, SEO)</li>
            <li>Safe auto-fixes applied instantly (with a downloadable fix log)</li>
            <li>Issues table with editing for risky cells (you choose final values)</li>
            <li>Pinned “manual fix” rows so you can work blockers first</li>
            <li>Export button that produces Shopify-template-shaped CSV output</li>
          </ul>
          <div className="mt-5 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            If you want to see it in action fast, download a messy example below, upload it, and compare before/after.
          </div>
        </div>
      </section>

      {/* DOWNLOADS */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">Download messy Shopify CSV examples</h2>
        <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          These sample exports are intentionally messy. They’re useful for verifying that validation, auto-fixes, and the fix log behave correctly.
          Upload them into the Shopify preset and you’ll immediately see the tool catch issues that Shopify typically rejects.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sampleDownloads.map((d) => (
            <a
              key={d.href}
              href={d.href}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 hover:bg-[var(--surface)]"
            >
              <div className="text-sm font-semibold text-[var(--text)]">{d.name}</div>
              <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">{d.note}</div>
              <div className="mt-3 text-xs font-semibold text-[var(--text)]">Download</div>
            </a>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app?preset=shopify_products&exportName=shopify-products"
            className="rounded-2xl bg-[color:rgba(var(--accent-rgb),0.9)] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Upload one of these now
          </Link>
          <Link href="/presets" className="text-sm font-semibold text-[var(--text)] hover:underline">
            Browse all presets
          </Link>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">Before and after (what “safe fixes” look like)</h2>
        <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          The Shopify preset only auto-fixes deterministic changes. That means formatting and normalization that Shopify expects,
          without inventing business decisions. Here are a few examples of real fixes you’ll commonly see in the fix log.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Booleans</div>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Shopify expects strict TRUE/FALSE in several columns. CSVs often contain true/false, yes/no, 1/0, or blanks.
            </p>
            <div className="mt-3 text-xs text-[var(--muted)]">Example</div>
            <pre className="mt-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Published on online store
true  →  TRUE
False →  FALSE
""    →  "" (left blank if unknown)`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Pricing normalization</div>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Prices commonly arrive with currency symbols, commas, or extra whitespace. Shopify expects numeric formats.
            </p>
            <div className="mt-3 text-xs text-[var(--muted)]">Example</div>
            <pre className="mt-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Variant Price
"$19.9 "   →  19.90
"1,299.00" →  1299.00
"  15"     →  15.00`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Inventory policy mapping</div>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Shopify exports and third-party tools sometimes use legacy inventory policy values. StriveFormats maps these safely.
            </p>
            <div className="mt-3 text-xs text-[var(--muted)]">Example</div>
            <pre className="mt-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Variant Inventory Policy
deny      →  Continue selling = FALSE
continue  →  Continue selling = TRUE`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Template-shape export</div>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Even if your CSV has missing columns or wrong header order, the exporter enforces Shopify’s expected header names and order.
            </p>
            <div className="mt-3 text-xs text-[var(--muted)]">Result</div>
            <pre className="mt-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Exported CSV header row matches Shopify template order
Missing required headers added as blank columns (no data invented)`}
            </pre>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">How the Shopify CSV Fixer works</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">1 Upload</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Drop in your Shopify Products CSV. StriveFormats reads headers, rows, and grouped variants.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">2 Validate and standardize</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              The validator checks structure, variants, options, pricing, inventory, images, and SEO. Safe fixes apply automatically.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">3 Export import-ready CSV</div>
            <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              You export a Shopify-shaped CSV file with standardized formatting and a fix log you can keep for records.
            </p>
          </div>
        </div>

        <div className="mt-6 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          The important part: Shopify import success is not just about a single row. Variant problems are often cross-row problems.
          That’s why StriveFormats treats variants as a group and checks for collisions and inconsistencies that Shopify flags.
        </div>
      </section>

      {/* PLAN COMPARISON (lightweight, marketing friendly) */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">Which plan do I need?</h2>
        <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          You can start free and still get real value. Paid plans are mainly for higher usage, advanced controls, and power workflows.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Free</div>
            <ul className="mt-3 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              <li>Use Shopify preset</li>
              <li>Auto-fix safe issues</li>
              <li>Manual cell edits</li>
              <li>Export fixed CSV</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Basic</div>
            <ul className="mt-3 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              <li>Higher monthly exports</li>
              <li>Faster repeat workflow</li>
              <li>Better for weekly imports</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Advanced</div>
            <ul className="mt-3 space-y-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              <li>Custom Formats (save reusable rules)</li>
              <li>Best for agencies and teams</li>
              <li>Designed for repeat, high volume work</li>
            </ul>
            <div className="mt-4">
              <Link href="/#pricing" className="text-sm font-semibold text-[var(--text)] hover:underline">
                See pricing details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-4 grid gap-4">
          {faq.map((x) => (
            <details key={x.q} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{x.q}</summary>
              <p className="mt-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">{x.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app?preset=shopify_products&exportName=shopify-products"
            className="rounded-2xl bg-[color:rgba(var(--accent-rgb),0.9)] px-5 py-3 text-sm font-semibold text-black shadow-sm hover:opacity-90"
          >
            Fix my Shopify CSV
          </Link>
          <Link href="/presets" className="text-sm font-semibold text-[var(--text)] hover:underline">
            Browse presets
          </Link>
        </div>
      </section>

      {/* INTERNAL LINKING CLUSTER */}
      <section className="mt-10 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        Looking for another platform format? Start here:{" "}
        <Link className="hover:underline" href="/presets">
          Preset CSV Formats
        </Link>
        {" · "}
        Want to reuse your own rules?{" "}
        <Link className="hover:underline" href="/formats">
          Custom Formats
        </Link>
        {" · "}
        Ready to clean a file now?{" "}
        <Link className="hover:underline" href="/app?preset=shopify_products&exportName=shopify-products">
          Open the fixer
        </Link>
      </section>
    </main>
  );
}
