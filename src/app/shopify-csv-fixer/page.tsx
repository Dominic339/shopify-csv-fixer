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

const sampleDownloads = [
  {
    name: "Messy Shopify export 1 (Classic Tee)",
    href: "/samples/messy_shopify_export_1_classic_tee.csv",
    note: "Missing handles, mixed booleans, messy tags, and formatting problems.",
  },
  {
    name: "Messy Shopify export 2 (Duplicate SKU)",
    href: "/samples/messy_shopify_export_2_duplicate_sku.csv",
    note: "Duplicate SKUs, inconsistent grouping, and import blockers.",
  },
  {
    name: "Messy Shopify export 3 (Multi-variant edge cases)",
    href: "/samples/messy_shopify_export_3_multivariant_edges.csv",
    note: "Option collisions, duplicate variant combinations, and tricky rows.",
  },
  {
    name: "Stress test (5,500 rows)",
    href: "/samples/shopify_stress_test_5500_rows.csv",
    note: "Large file to test stability, performance, and fix logging.",
  },
  {
    name: "Stress test (fixed output)",
    href: "/samples/shopify_stress_test_5500_rows_fixed.csv",
    note: "Optional: compare exported output after safe fixes.",
  },
];

const faq = [
  {
    q: "Does my CSV get uploaded to a server?",
    a: "The core parsing, validation, and edits run in your browser. Exporting generates the cleaned CSV locally. Your subscription status may be checked server-side, but your CSV content does not need to be uploaded for the fixer to work.",
  },
  {
    q: "What does StriveFormats fix automatically?",
    a: "Safe, deterministic fixes only: trimming extra spaces, normalizing Shopify booleans, enforcing price formatting, mapping inventory policy values, normalizing tags, and enforcing Shopify’s expected header names and export order. Anything that could change meaning is flagged for review.",
  },
  {
    q: "What does StriveFormats refuse to auto-fix?",
    a: "Anything that requires business judgement: choosing a new handle in a conflict, inventing option values, selecting product titles/vendors, or guessing images. Those are flagged so you can decide before export.",
  },
  {
    q: "Why does Shopify reject CSVs that look fine in Excel?",
    a: "Many failures are cross-row: duplicate handles that do not represent valid variants, duplicate option combinations under the same handle, duplicate SKUs across products, and inconsistent variant structure. Excel hides these issues; Shopify enforces them.",
  },
  {
    q: "Will the exported file match Shopify’s template column order?",
    a: "Yes. The Shopify preset exports using Shopify’s official header names and a consistent template-shaped column order so you can import directly.",
  },
  {
    q: "Do you support other formats (WooCommerce, Etsy, eBay, etc.)?",
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

  const openFixerHref = "/app?preset=shopify_products&exportName=shopify-products";
  const templatePreviewHref = "/presets/shopify_products";
  const presetsHref = "/presets";

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
          Shopify CSV imports fail for reasons that are easy to miss in spreadsheets: invalid booleans, inconsistent
          pricing formats, variant rows that don’t agree with each other, duplicate option combinations, duplicate SKUs,
          and “handle collisions” where multiple products accidentally share the same handle.
        </p>

        <p className="mt-3 text-base text-[var(--muted)]">
          StriveFormats is built to clean, standardize, and validate your Shopify Products CSV before you import. It
          auto-fixes only safe issues and clearly flags anything risky, so you can export an import-ready CSV with
          confidence.
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
          <span>No forced signup</span>
          <span>Export import-ready CSV</span>
        </div>
      </section>

      {/* QUICK VALUE GRID */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <SectionTitle
            title="Common Shopify import problems (and what we do)"
            subtitle="These are the issues that routinely cause failed imports or partial imports."
          />
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>
              <strong className="text-[var(--text)]">Published and boolean fields:</strong> normalized to strict TRUE/FALSE.
            </li>
            <li>
              <strong className="text-[var(--text)]">Inventory policy:</strong> validated and mapped to Shopify-safe meaning.
            </li>
            <li>
              <strong className="text-[var(--text)]">Pricing formats:</strong> currency symbols, commas, whitespace, and decimals standardized.
            </li>
            <li>
              <strong className="text-[var(--text)]">Required headers:</strong> ensured so export matches Shopify’s expected template shape.
            </li>
            <li>
              <strong className="text-[var(--text)]">Variant grouping:</strong> cross-row checks for broken variant structures and collisions.
            </li>
            <li>
              <strong className="text-[var(--text)]">Options:</strong> detects duplicate option combinations and inconsistent Option1/2/3 rules.
            </li>
            <li>
              <strong className="text-[var(--text)]">Images:</strong> validates URLs and flags common image row issues.
            </li>
            <li>
              <strong className="text-[var(--text)]">SEO:</strong> surfaces missing/duplicate fields that hurt listings.
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <SectionTitle
            title="What you get inside the fixer"
            subtitle="Designed for trust: it shows the why, the risk, and exactly what changed."
          />
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>Import confidence score and category breakdown (structure, variants, pricing, inventory, images, SEO)</li>
            <li>Safe auto-fixes applied instantly (with a downloadable fix log)</li>
            <li>Issues table with manual edits for risky cells (you choose final values)</li>
            <li>Pinned blockers so you can fix import-stoppers first</li>
            <li>Export that produces Shopify-template-shaped CSV output</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={openFixerHref} className="rg-btn">
              Try it now
            </Link>
            <Link href={templatePreviewHref} className="rg-btn">
              See the template
            </Link>
          </div>
        </div>
      </section>

      {/* DOWNLOADS */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Download messy Shopify CSV examples"
          subtitle="Use these to validate that the Shopify preset, fix log, and export behavior match real-world edge cases."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sampleDownloads.map((d) => (
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

        <p className="mt-4 text-xs text-[var(--muted)]">
          Tip: If a download link 404s, ensure you uploaded the sample CSVs into <code>public/samples/</code>.
        </p>
      </section>

      {/* BEFORE / AFTER */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Before and after: what safe fixes look like"
          subtitle="The Shopify preset only auto-fixes deterministic changes. Anything that could change meaning is flagged for review."
        />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Booleans</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Shopify expects strict TRUE/FALSE in multiple columns. CSVs often contain true/false, yes/no, 1/0, or blanks.
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
            <p className="mt-2 text-sm text-[var(--muted)]">
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
            <p className="mt-2 text-sm text-[var(--muted)]">
              Legacy policies from exports or third-party tools are mapped to a Shopify-safe meaning.
            </p>
            <div className="mt-3 text-xs text-[var(--muted)]">Example</div>
            <pre className="mt-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Variant Inventory Policy
deny      →  Continue selling = FALSE
continue  →  Continue selling = TRUE`}
            </pre>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Template-shaped export</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Even if your CSV has missing columns or wrong header order, export enforces Shopify’s expected headers and order.
            </p>
            <div className="mt-3 text-xs text-[var(--muted)]">Result</div>
            <pre className="mt-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]">
{`Export header matches Shopify template order
Missing required headers added as blank columns (no data invented)`}
            </pre>
          </div>
        </div>
      </section>

      {/* WHY SHOPIFY IMPORTS FAIL (SEO HEAVY) */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Why Shopify CSV imports fail"
          subtitle="This section is intentionally detailed. These are the real rules that trip people up."
        />

        <div className="mt-6 space-y-6 text-sm text-[var(--muted)]">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Handle grouping is cross-row</div>
            <p className="mt-2">
              Shopify uses the Handle column to group rows into a single product with variants. If two different products accidentally share
              a handle, Shopify can merge them, overwrite variants, or reject combinations. StriveFormats detects collisions and flags them
              clearly.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Variant option combinations must be unique</div>
            <p className="mt-2">
              Under a single handle, the combination of Option1 Value, Option2 Value, and Option3 Value must be unique. Duplicate combinations
              are a frequent “looks fine in Excel” issue that Shopify rejects. The fixer checks this across the entire group, not just per row.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">SKUs collide across products</div>
            <p className="mt-2">
              If your workflow expects SKUs to be unique, duplicated SKUs across different handles are a serious operational problem. Some stores
              also run apps that require SKU uniqueness. StriveFormats flags duplicates so you can decide the correct SKU assignment.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Prices need strict numeric formatting</div>
            <p className="mt-2">
              Shopify expects numeric values for price columns. Currency symbols, commas, and hidden whitespace cause imports to fail or behave
              unpredictably. StriveFormats standardizes prices and flags outliers that should be reviewed.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Images rely on consistent row logic</div>
            <p className="mt-2">
              Shopify image rows have rules around URLs, positions, and association with variants. Messy exports often include invalid URLs, bad
              schemes, or duplicates. StriveFormats validates URLs and flags patterns that commonly break import expectations.
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
        <SectionTitle title="How the Shopify preset works" subtitle="Simple workflow. Strict validation. Safe fixes only." />

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">1 Upload</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Upload a Shopify Products CSV. StriveFormats reads headers, rows, and variant groups.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">2 Validate + standardize</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              The validator checks structure, variants, options, pricing, inventory, images, and SEO. Safe fixes apply automatically.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">3 Export</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Export a Shopify-shaped CSV with consistent formatting, plus a fix log you can keep for records.
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-[var(--muted)]">
          Important: Shopify import success is not just about a single row. Many failures are cross-row. That’s why the Shopify preset
          groups variants and checks the full product set for collisions and inconsistencies.
        </p>
      </section>

      {/* PLAN GUIDANCE */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Which plan do I need?"
          subtitle="Start free. Upgrade if you need higher usage, advanced controls, or saved reusable rules."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Free</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Use Shopify preset</li>
              <li>Safe auto-fixes</li>
              <li>Manual cell edits</li>
              <li>Export fixed CSV</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Basic</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Higher monthly exports</li>
              <li>Best for regular imports</li>
              <li>More breathing room for revisions</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Advanced</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Custom Formats (save reusable rules)</li>
              <li>Best for agencies and high volume</li>
              <li>Repeat workflow optimized</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/#pricing" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </Link>
          <Link href="/formats" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
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

        {/* FIXED: bottom CTAs to match app styling */}
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

      {/* INTERNAL LINKS */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <SectionTitle
          title="Explore more in StriveFormats"
          subtitle="If you’re cleaning CSVs for other platforms, start with presets or build reusable rules with Custom Formats."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Preset formats</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Open the fixer preconfigured for other import targets.
            </p>
            <div className="mt-4">
              <Link href="/presets" className="rg-btn">
                Browse presets
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Custom Formats</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Save reusable column templates and rules for repeat work.
            </p>
            <div className="mt-4">
              <Link href="/formats" className="rg-btn">
                Open Custom Formats
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Start fixing now</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Upload a file, fix the safe issues automatically, then export.
            </p>
            <div className="mt-4">
              <Link href="/app" className="rg-btn">
                Open CSV Fixer
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
