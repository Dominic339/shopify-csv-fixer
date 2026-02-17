// src/app/shopify-csv-fixer/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQJsonLd from "@/components/FAQJsonLd";

export const metadata: Metadata = {
  title: "Shopify CSV Fixer for Products Import | StriveFormats",
  description:
    "Clean, standardize, and validate Shopify Products CSV files before import. StriveFormats checks handles, SKUs, variants, option collisions, pricing formats, inventory, images, and SEO — and applies only safe auto-fixes.",
  alternates: {
    canonical: "/shopify-csv-fixer",
  },
  openGraph: {
    title: "Shopify CSV Fixer for Products Import | StriveFormats",
    description:
      "Clean, standardize, and validate Shopify Products CSV files before import. Flags risky issues and applies only safe auto-fixes.",
    type: "website",
    url: "/shopify-csv-fixer",
  },
};

const faqItems = [
  {
    question: "Does my CSV get uploaded to a server?",
    answer:
      "The core parsing, validation, and edits run in your browser. When you export, the cleaned CSV is generated locally on your device.",
  },
  {
    question: "What does StriveFormats fix automatically?",
    answer:
      "Safe fixes include normalizing boolean values, trimming whitespace, standardizing numeric formats (like prices), and enforcing Shopify’s expected header names and order. Anything that could change meaning stays flagged for review.",
  },
  {
    question: "What does StriveFormats refuse to auto-fix?",
    answer:
      "Anything ambiguous or meaning-changing, such as choosing a variant option value, deciding which duplicate SKU is correct, or guessing missing business-critical fields. Those issues stay in the table so you can set the final value.",
  },
  {
    question: "Why does Shopify reject CSVs that look fine in Excel?",
    answer:
      "Shopify import rules depend on cross-row grouping (handles), unique option combinations within a product, strict TRUE/FALSE booleans, and clean numeric formats. Spreadsheets can hide problems like whitespace, mixed booleans, and duplicate option combos.",
  },
  {
    question: "Will the exported file match Shopify’s template order?",
    answer:
      "Yes. Export enforces Shopify’s expected header names and order for the Products CSV template, so your import is template-shaped.",
  },
  {
    question: "Do you support other formats?",
    answer:
      "Yes. StriveFormats includes multiple preset formats and supports reusable Custom Formats for repeat workflows.",
  },
] as const;

export default function ShopifyCsvFixerPage() {
  const openFixerHref = "/app?preset=shopify_products";
  const templatePreviewHref = "/presets/shopify_products";

  // Public sample paths (place the files in /public/samples to match these URLs)
  const sampleTemplate = "/samples/shopify_product_template.csv";
  const sampleMessy1 = "/samples/messy_shopify_export_1_classic_tee.csv";
  const sampleMessy2 = "/samples/messy_shopify_export_2_duplicate_sku.csv";
  const sampleMessy3 = "/samples/messy_shopify_export_3_multivariant_edges.csv";
  const sampleStress = "/samples/shopify_stress_test_5500_rows.csv";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StriveFormats",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Clean, standardize, and validate Shopify Products CSV files before import. Applies only safe auto-fixes and flags risky issues for review.",
    url: "/shopify-csv-fixer",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />
      <FAQJsonLd items={[...faqItems]} />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span className="pill-btn is-active">StriveFormats</span>
          <span className="pill-btn">Clean. Standardize. Validate.</span>
          <span className="pill-btn">Shopify Products CSV</span>
          <span className="pill-btn">Runs in-browser</span>
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text)]">Shopify CSV Fixer</h1>

        <p className="mt-4 text-lg text-[var(--muted)]">
          Shopify imports fail for reasons that are easy to miss in spreadsheets: invalid booleans, inconsistent pricing
          formats, variant rows that don’t agree with each other, duplicate option combinations, duplicate SKUs, and
          handle collisions where multiple products accidentally share the same handle.
        </p>

        <p className="mt-4 text-sm text-[var(--muted)]">
          StriveFormats helps you clean, standardize, and validate your Shopify Products CSV before import. It auto-fixes
          only safe issues and flags anything risky so you can export an import-ready CSV with confidence.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upload Shopify CSV</span>
          </Link>

          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View template preview</span>
          </Link>

          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse presets</span>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 text-xs text-[var(--muted)]">
          <span>Files processed locally</span>
          <span>Safe auto-fixes only</span>
          <span>Export import-ready CSV</span>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-xl font-semibold text-[var(--text)]">Common Shopify import problems</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            These are the issues that most commonly cause failed imports or partial imports.
          </p>

          <div className="mt-5 space-y-3 text-sm text-[var(--muted)]">
            <div>
              <span className="font-semibold text-[var(--text)]">Booleans and Published values:</span> normalized to
              strict TRUE/FALSE.
            </div>
            <div>
              <span className="font-semibold text-[var(--text)]">Inventory policy:</span> validated and mapped to
              Shopify-safe meaning.
            </div>
            <div>
              <span className="font-semibold text-[var(--text)]">Pricing formats:</span> symbols, commas, whitespace,
              and decimals standardized.
            </div>
            <div>
              <span className="font-semibold text-[var(--text)]">Variant grouping:</span> cross-row checks for broken
              variant structure.
            </div>
            <div>
              <span className="font-semibold text-[var(--text)]">Options:</span> detects duplicate option combinations
              under the same handle.
            </div>
            <div>
              <span className="font-semibold text-[var(--text)]">Images:</span> validates URLs and flags common image
              row problems.
            </div>
            <div>
              <span className="font-semibold text-[var(--text)]">SEO basics:</span> flags missing/duplicate text fields
              that hurt listings.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={openFixerHref} className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Fix my file</span>
            </Link>
            <Link href={templatePreviewHref} className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">See columns</span>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-xl font-semibold text-[var(--text)]">What you get in StriveFormats</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Designed for trust: it shows what changed, why it matters, and what still needs review.
          </p>

          <ul className="mt-5 list-disc space-y-2 pl-6 text-sm text-[var(--muted)]">
            <li>Import confidence score with category breakdown</li>
            <li>Safe auto-fixes applied instantly with a downloadable fix log</li>
            <li>Issues table with manual edits for risky cells (you decide final values)</li>
            <li>Pinned blockers so you can fix import-stoppers first</li>
            <li>Export that enforces Shopify template headers and order</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={openFixerHref} className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open the fixer</span>
            </Link>
            <Link href="/presets" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse presets</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">Download Shopify CSV examples</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use these to verify behavior, test edge cases, and confirm export results.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <a href={sampleTemplate} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Shopify product template (ready-to-fill)</div>
            <div className="mt-1 text-xs text-[var(--muted)]">A clean, template-shaped file you can fill in and import.</div>
            <div className="mt-3 text-sm font-semibold text-[var(--text)]">Download</div>
          </a>

          <a href={sampleMessy1} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Messy export 1 (Classic Tee)</div>
            <div className="mt-1 text-xs text-[var(--muted)]">Mixed booleans, messy tags, formatting problems, and common import pitfalls.</div>
            <div className="mt-3 text-sm font-semibold text-[var(--text)]">Download</div>
          </a>

          <a href={sampleMessy2} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Messy export 2 (Duplicate SKU)</div>
            <div className="mt-1 text-xs text-[var(--muted)]">Duplicate SKUs and grouping inconsistencies that often cause rejected imports.</div>
            <div className="mt-3 text-sm font-semibold text-[var(--text)]">Download</div>
          </a>

          <a href={sampleMessy3} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Messy export 3 (Multi-variant edge cases)</div>
            <div className="mt-1 text-xs text-[var(--muted)]">Option collisions, duplicate variant combinations, and tricky rows.</div>
            <div className="mt-3 text-sm font-semibold text-[var(--text)]">Download</div>
          </a>

          <a href={sampleStress} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 md:col-span-2">
            <div className="text-sm font-semibold text-[var(--text)]">Stress test (5,500 rows)</div>
            <div className="mt-1 text-xs text-[var(--muted)]">Large file for performance, stability, and fix-log verification.</div>
            <div className="mt-3 text-sm font-semibold text-[var(--text)]">Download</div>
          </a>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upload an example file</span>
          </Link>
          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View template preview</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">Before and after: safe fixes</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Auto-fixes only apply to deterministic formatting and schema rules. Anything risky is flagged for review.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Booleans</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Shopify expects strict TRUE/FALSE in multiple columns. CSVs often contain true/false, yes/no, 1/0, or blanks.
            </div>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
Published on online store
true   → TRUE
False  → FALSE
""     → "" (left blank if unknown)
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Pricing formats</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Prices commonly arrive with currency symbols, commas, or extra whitespace. Shopify expects numeric formats.
            </div>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
Variant Price
"$19.9"   → 19.90
"1,299.00"→ 1299.00
"  15"    → 15.00
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Inventory policy mapping</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Legacy policy values are mapped to Shopify’s meaning (continue selling true/false).
            </div>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
Continue selling when out of stock
continue → TRUE
deny     → FALSE
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Template-shaped export</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Even if your CSV has missing headers or wrong order, export enforces Shopify’s expected header names and order.
            </div>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
Export enforces:
• official header names
• official header order
• empty cells normalized
            </pre>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">Why Shopify CSV imports fail</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          These rules are the real reason imports fail even when rows look fine in a spreadsheet.
        </p>

        <div className="mt-6 space-y-5 text-sm text-[var(--muted)]">
          <div>
            <div className="font-semibold text-[var(--text)]">Handle grouping is cross-row</div>
            Shopify groups variant rows by Handle. If two different products share a handle, Shopify can merge them,
            overwrite variants, or reject combinations. StriveFormats checks handle grouping consistency and flags
            collisions clearly.
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Variant option combinations must be unique</div>
            Under a single handle, the combination of Option1 Value, Option2 Value, and Option3 Value must be unique.
            Duplicate combinations are a frequent import blocker.
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">SKUs collide across products</div>
            Duplicate SKUs across different products cause fulfillment and inventory problems, and some Shopify apps
            require uniqueness. StriveFormats flags duplicates so you can fix them intentionally.
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Prices must be numeric (no symbols/commas)</div>
            Currency symbols, commas, and invisible whitespace cause import errors or incorrect values. StriveFormats
            standardizes formatting and flags outliers.
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Image URL rules are stricter than they look</div>
            Broken schemes, invalid URLs, and inconsistent image rows cause partial imports. StriveFormats validates URLs
            and flags patterns that commonly break import expectations.
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Fix my Shopify CSV</span>
          </Link>
          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">See the template preview</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">How it works</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Upload → validate + safe fixes → export.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">1 Upload</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Upload a Shopify Products CSV. StriveFormats reads headers, rows, and variant groups.
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">2 Validate + standardize</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Checks structure, variants, options, pricing, inventory, images, and SEO. Applies safe fixes automatically
              and logs changes.
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">3 Export</div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Export a template-shaped CSV that imports cleanly into Shopify.
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Quick answers to common questions.</p>

        <div className="mt-6 grid gap-4">
          {faqItems.map((it) => (
            <details key={it.question} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{it.question}</summary>
              <p className="mt-3 text-sm text-[var(--muted)]">{it.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Fix my Shopify CSV</span>
          </Link>
          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse presets</span>
          </Link>
          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View template preview</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
