// src/app/shopify-csv-fixer/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shopify CSV Fixer | StriveFormats",
  description:
    "Clean, standardize, and validate Shopify product CSVs before import. Catch handle, SKU, variant option collisions, pricing, inventory, images, and SEO issues — then export a Shopify-ready CSV.",
  alternates: { canonical: "/shopify-csv-fixer" },
  openGraph: {
    title: "Shopify CSV Fixer | StriveFormats",
    description:
      "Client-side Shopify CSV validation + safe auto-fix for products, variants, pricing, inventory, images, and SEO.",
    url: "/shopify-csv-fixer",
    type: "website",
  },
};

type DownloadItem = {
  name: string;
  href: string;
  note: string;
};

const downloads: DownloadItem[] = [
  {
    name: "Shopify product template (ready-to-fill)",
    href: "/samples/shopify_product_template.csv",
    note: "A clean, template-shaped file you can fill in and import.",
  },
  {
    name: "Messy export 1 (Classic Tee)",
    href: "/samples/messy_shopify_export_1_classic_tee.csv",
    note: "Mixed booleans, messy tags, formatting problems, and common import pitfalls.",
  },
  {
    name: "Messy export 2 (Duplicate SKU)",
    href: "/samples/messy_shopify_export_2_duplicate_sku.csv",
    note: "Duplicate SKUs and grouping inconsistencies that often cause rejected imports.",
  },
  {
    name: "Messy export 3 (Multi-variant edge cases)",
    href: "/samples/messy_shopify_export_3_multivariant_edges.csv",
    note: "Option collisions, duplicate variant combinations, and tricky rows.",
  },
  {
    name: "Stress test (5,500 rows)",
    href: "/samples/shopify_stress_test_5500_rows.csv",
    note: "Large file for performance, stability, and fix-log verification.",
  },
];

type FAQItem = { q: string; a: string };

const faq: FAQItem[] = [
  {
    q: "Does my CSV get uploaded to a server?",
    a: "The core parsing, validation, and edits run in your browser. Export generates a cleaned CSV locally. Subscription status may be checked server-side, but your CSV content does not need to be uploaded for the fixer to work.",
  },
  {
    q: "What does StriveFormats fix automatically?",
    a: "Safe, deterministic fixes only: trimming extra spaces, normalizing Shopify booleans, enforcing price formatting, mapping inventory policy values, normalizing tags, and enforcing Shopify’s expected headers and export order. Anything that could change meaning is flagged for manual review.",
  },
  {
    q: "What does StriveFormats refuse to auto-fix?",
    a: "Anything that requires business judgement: choosing a new handle in a conflict, inventing option values, selecting titles/vendors, or guessing images. Those issues are flagged so you decide before export.",
  },
  {
    q: "Why does Shopify reject CSVs that look fine in Excel?",
    a: "Many failures are cross-row rules: duplicate handles that merge products, duplicate option combinations under the same handle, duplicate SKUs across products, and inconsistent variant structure. Excel hides these problems; Shopify enforces them.",
  },
  {
    q: "Will the exported file match Shopify’s template order?",
    a: "Yes. The Shopify preset exports using Shopify’s official header names and a template-shaped header order so you can import directly.",
  },
  {
    q: "Do you support other formats?",
    a: "Yes. StriveFormats supports multiple preset formats and continues to expand. Shopify is the most hardened preset today.",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted)]">
      {children}
    </span>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p> : null}
    </div>
  );
}

export default function ShopifyCsvFixerPage() {
  // Primary actions
  const openFixerHref = "/app?preset=shopify_products&exportName=shopify-products";
  const templatePreviewHref = "/presets/shopify_products";
  const presetsHref = "/presets";

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

        <p className="mt-3 text-base text-[var(--muted)]">
          Shopify imports fail for reasons that are easy to miss in spreadsheets: invalid booleans, inconsistent pricing formats,
          variant rows that don’t agree with each other, duplicate option combinations, duplicate SKUs, and handle collisions where
          multiple products accidentally share the same handle.
        </p>

        <p className="mt-3 text-base text-[var(--muted)]">
          StriveFormats helps you clean, standardize, and validate your Shopify Products CSV before import. It auto-fixes only safe issues and
          flags anything risky so you can export an import-ready CSV with confidence.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upload Shopify CSV</span>
          </Link>

          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View template preview</span>
          </Link>

          <Link href={presetsHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse presets</span>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 text-xs text-[var(--muted)]">
          <span>Files processed locally</span>
          <span>Safe auto-fixes only</span>
          <span>Export import-ready CSV</span>
        </div>
      </section>

      {/* VALUE GRID */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <SectionTitle
            title="Common Shopify import problems"
            subtitle="These are the issues that most commonly cause failed imports or partial imports."
          />
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>
              <strong className="text-[var(--text)]">Booleans and Published values:</strong> normalized to strict TRUE/FALSE.
            </li>
            <li>
              <strong className="text-[var(--text)]">Inventory policy:</strong> validated and mapped to Shopify-safe meaning.
            </li>
            <li>
              <strong className="text-[var(--text)]">Pricing formats:</strong> symbols, commas, whitespace, and decimals standardized.
            </li>
            <li>
              <strong className="text-[var(--text)]">Variant grouping:</strong> cross-row checks for broken variant structure.
            </li>
            <li>
              <strong className="text-[var(--text)]">Options:</strong> detects duplicate option combinations under the same handle.
            </li>
            <li>
              <strong className="text-[var(--text)]">Images:</strong> validates URLs and flags common image row problems.
            </li>
            <li>
              <strong className="text-[var(--text)]">SEO basics:</strong> flags missing/duplicate text fields that hurt listings.
            </li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={openFixerHref} className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Fix my file</span>
            </Link>
            <Link href={templatePreviewHref} className="rg-btn">
              See columns
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <SectionTitle
            title="What you get in StriveFormats"
            subtitle="Designed for trust: it shows what changed, why it matters, and what still needs review."
          />
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>Import confidence score with category breakdown</li>
            <li>Safe auto-fixes applied instantly with a downloadable fix log</li>
            <li>Issues table with manual edits for risky cells (you decide final values)</li>
            <li>Pinned blockers so you can fix import-stoppers first</li>
            <li>Export that enforces Shopify template headers and order</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={openFixerHref} className="rg-btn">
              Open the fixer
            </Link>
            <Link href={presetsHref} className="rg-btn">
              Browse presets
            </Link>
          </div>
        </div>
      </section>

      {/* DOWNLOADS */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Download Shopify CSV examples"
          subtitle="Use these to verify behavior, test edge cases, and confirm export results."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {downloads.map((d) => (
            <a
              key={d.href}
              href={d.href}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 hover:bg-[var(--surface)]"
            >
              <div className="text-sm font-semibold text-[var(--text)]">{d.name}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{d.note}</div>
              <div className="mt-3 text-xs font-semibold text-[var(--text)]">Download</div>
            </a>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upload an example file</span>
          </Link>

          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View template preview</span>
          </Link>
        </div>
      </section>

      {/* BEFORE / AFTER (SEO DETAILS) */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Before and after: safe fixes"
          subtitle="Auto-fixes only apply to deterministic formatting and schema rules. Anything risky is flagged for review."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Booleans</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Shopify expects strict TRUE/FALSE in multiple columns. CSVs often contain true/false, yes/no, 1/0, or blanks.
            </p>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Published on online store
true   → TRUE
False  → FALSE
""     → "" (left blank if unknown)`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Pricing formats</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Prices commonly arrive with currency symbols, commas, or extra whitespace. Shopify expects numeric formats.
            </p>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Variant Price
"$19.9 "    → 19.90
"1,299.00"  → 1299.00
"  15"      → 15.00`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Inventory policy mapping</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Legacy policy values are mapped to Shopify’s meaning (continue selling true/false).
            </p>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Variant Inventory Policy
deny     → Continue selling = FALSE
continue → Continue selling = TRUE`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Template-shaped export</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Even if your CSV has missing headers or wrong order, export enforces Shopify’s expected header names and order.
            </p>
            <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Export matches Shopify template header order
Missing required headers added as blank columns
(no data invented)`}
            </pre>
          </div>
        </div>
      </section>

      {/* WHY SHOPIFY IMPORTS FAIL (LONG FORM SEO) */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Why Shopify CSV imports fail"
          subtitle="These rules are the real reason imports fail even when rows look fine in a spreadsheet."
        />

        <div className="mt-6 space-y-6 text-sm text-[var(--muted)]">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Handle grouping is cross-row</div>
            <p className="mt-2">
              Shopify groups variant rows by Handle. If two different products share a handle, Shopify can merge them, overwrite variants,
              or reject combinations. StriveFormats checks handle grouping consistency and flags collisions clearly.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Variant option combinations must be unique</div>
            <p className="mt-2">
              Under a single handle, the combination of Option1 Value, Option2 Value, and Option3 Value must be unique. Duplicate combinations
              are a frequent import blocker. The Shopify preset checks this across the entire handle group.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">SKUs collide across products</div>
            <p className="mt-2">
              Duplicate SKUs across different products cause fulfillment and inventory problems, and some Shopify apps require uniqueness.
              StriveFormats flags duplicates so you can fix them intentionally.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Prices must be numeric (no symbols/commas)</div>
            <p className="mt-2">
              Shopify expects strict numeric formats. Currency symbols, commas, and invisible whitespace cause import errors or incorrect values.
              StriveFormats standardizes formatting and flags outliers.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Image URL rules are stricter than they look</div>
            <p className="mt-2">
              Broken schemes, invalid URLs, and inconsistent image rows cause partial imports. The Shopify preset validates URLs and flags patterns
              that commonly break import expectations.
            </p>
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

      {/* HOW IT WORKS */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle title="How it works" subtitle="Upload → validate + safe fixes → export." />

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">1 Upload</div>
            <p className="mt-2 text-sm text-[var(--muted)]">Upload a Shopify Products CSV. StriveFormats reads headers, rows, and variant groups.</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">2 Validate + standardize</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Checks structure, variants, options, pricing, inventory, images, and SEO. Applies safe fixes automatically and logs changes.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">3 Export</div>
            <p className="mt-2 text-sm text-[var(--muted)]">Export a template-shaped CSV that imports cleanly into Shopify.</p>
          </div>
        </div>
      </section>

      {/* FAQ + BOTTOM CTAS (FIXED) */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle title="FAQ" subtitle="Quick answers to common questions." />

        <div className="mt-6 grid gap-4">
          {faq.map((x) => (
            <details key={x.q} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{x.q}</summary>
              <p className="mt-3 text-sm text-[var(--muted)]">{x.a}</p>
            </details>
          ))}
        </div>

        {/* Buttons here are now consistent with the rest of the app */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Fix my Shopify CSV</span>
          </Link>

          <Link href={presetsHref} className="rgb-btn">
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
