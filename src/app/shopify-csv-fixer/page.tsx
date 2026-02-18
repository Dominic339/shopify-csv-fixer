// src/app/shopify-csv-fixer/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQJsonLd from "@/components/FAQJsonLd";

export const metadata: Metadata = {
  title: "Shopify CSV Fixer | StriveFormats",
  description:
    "Fix Shopify Products CSV files before import. StriveFormats applies safe auto-fixes, flags risky rows (variants, images, options), and exports a Shopify-ready CSV.",
  alternates: { canonical: "/shopify-csv-fixer" },
  openGraph: {
    title: "Shopify CSV Fixer | StriveFormats",
    description:
      "Clean and validate Shopify Products CSV files. Auto-fix safe issues, flag risky ones, and export a Shopify-ready file.",
    type: "website",
    url: "/shopify-csv-fixer",
  },
};

const faqItems = [
  {
    question: "Do you upload my Shopify CSV to a server?",
    answer:
      "No. The parsing, validation, and editing run in your browser. Export generates the cleaned file locally on your device.",
  },
  {
    question: "What does StriveFormats fix automatically for Shopify?",
    answer:
      "Safe fixes include trimming whitespace, normalizing blank cells, standardizing TRUE/FALSE values, and formatting numeric fields. Anything that could change meaning stays flagged for review.",
  },
  {
    question: "Why do Shopify imports fail so often?",
    answer:
      "Shopify is strict about headers and cross-row consistency. Many failures come from duplicated handles, invalid option combinations, mismatched variant rows, invalid booleans, and broken image row rules.",
  },
  {
    question: "Can I see the exact expected columns?",
    answer:
      "Yes. The Shopify template preview shows the exact column set and includes a sample CSV you can download.",
  },
] as const;

export default function ShopifyCsvFixerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StriveFormats",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Fix Shopify Products CSV files before import. StriveFormats applies safe auto-fixes and flags risky issues for review.",
    url: "/shopify-csv-fixer",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
          handle collisions.
        </p>

        <p className="mt-4 text-sm text-[var(--muted)]">
          StriveFormats helps you clean, standardize, and validate your Shopify Products CSV before import. It auto-fixes
          only safe issues and flags anything risky so you can confirm it before export.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app?preset=shopify_products" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upload Shopify CSV</span>
          </Link>
          <Link href="/presets/shopify_products" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Template preview + sample</span>
          </Link>
        </div>

        <div className="mt-4 flex gap-6 text-xs text-[var(--muted)]">
          <span>Files processed locally</span>
          <span>Safe auto-fixes only</span>
          <span>Export Shopify-ready CSV</span>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-xl font-semibold text-[var(--text)]">Common Shopify import problems</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Booleans and Published values not normalized to strict TRUE/FALSE</li>
            <li>Pricing formats with symbols, commas, whitespace, or inconsistent decimals</li>
            <li>Variant grouping: rows under the same Handle that don’t agree on product-level fields</li>
            <li>Options: duplicate option combinations or missing option names/values</li>
            <li>Images: broken URL formatting or image rows placed incorrectly</li>
            <li>SEO basics: missing/duplicate text fields that hurt listing quality</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-xl font-semibold text-[var(--text)]">How the Shopify Products CSV is structured</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Shopify uses a single flat CSV to represent products, variants, and images. That means some rules are
            cross-row, not just “this cell is valid.”
          </p>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Product grouping</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Rows with the same Handle belong to the same product. Product-level fields should be consistent across
                those rows.
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Variants</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Option values and SKUs must be unique per product. Missing option names/values or duplicated combos are
                common import blockers.
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Images</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Image URLs often live on separate rows. Shopify expects consistent placement and valid URLs.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--text)]">Quick checklist before you import</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">1) Start from the right columns</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Preview the Shopify template so your file matches expected headers and order.
            </p>
            <div className="mt-4">
              <Link href="/presets/shopify_products" className="rgb-btn">
                <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">View template</span>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">2) Run the fixer</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Upload your file and apply safe auto-fixes. Risky cells remain flagged for manual review.
            </p>
            <div className="mt-4">
              <Link href="/app?preset=shopify_products" className="rgb-btn">
                <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Open fixer</span>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">3) Export Shopify-ready CSV</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Export enforces the Shopify template headers so you can import with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8" id="faq">
        <h2 className="text-2xl font-semibold text-[var(--text)]">FAQ</h2>
        <div className="mt-6 grid gap-4">
          {faqItems.map((f) => (
            <details key={f.question} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{f.question}</summary>
              <p className="mt-3 text-sm text-[var(--muted)]">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
