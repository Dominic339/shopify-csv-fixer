// src/app/ecommerce-csv-fixer/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQJsonLd from "@/components/FAQJsonLd";
import { ECOMMERCE_PLATFORMS } from "@/lib/ecommercePlatforms";

export const metadata: Metadata = {
  title: "Ecommerce CSV Fixer | StriveFormats",
  description:
    "Clean, standardize, and validate ecommerce CSV files before import. StriveFormats supports Shopify, WooCommerce, BigCommerce, eBay, and Amazon templates with safe auto-fixes and clear warnings.",
  alternates: {
    canonical: "/ecommerce-csv-fixer",
  },
  openGraph: {
    title: "Ecommerce CSV Fixer | StriveFormats",
    description:
      "Fix messy ecommerce CSV files with safe auto-fixes and clear validation. Supports Shopify, WooCommerce, BigCommerce, eBay, and Amazon.",
    type: "website",
    url: "/ecommerce-csv-fixer",
  },
};

const faqItems = [
  {
    question: "Do you upload my CSV to a server?",
    answer:
      "The core parsing, validation, and editing run in your browser. When you export, your cleaned CSV is generated locally on your device.",
  },
  {
    question: "What does StriveFormats fix automatically?",
    answer:
      "Safe fixes include trimming whitespace, normalizing blank cells, and standardizing numeric and boolean formats. Anything that could change meaning stays flagged so you can confirm it.",
  },
  {
    question: "Why do ecommerce imports fail even when the spreadsheet looks fine?",
    answer:
      "Imports often depend on strict headers, consistent row grouping rules, and predictable values (like TRUE/FALSE or plain numbers). Spreadsheets can hide whitespace, mixed formats, and cross-row collisions.",
  },
  {
    question: "Can I download templates?",
    answer:
      "Yes. Each supported platform has a template preview and a ready-to-fill sample CSV so you can start from the expected column layout.",
  },
  {
    question: "Do you support Custom Formats?",
    answer:
      "Yes. Custom Formats let you save reusable column templates and rules so repeat jobs take seconds.",
  },
] as const;

export default function EcommerceCsvFixerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StriveFormats",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Clean, standardize, and validate ecommerce CSV files before import. StriveFormats applies only safe auto-fixes and flags risky issues for review.",
    url: "/ecommerce-csv-fixer",
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
          <span className="pill-btn">Ecommerce CSV</span>
          <span className="pill-btn">Runs in-browser</span>
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text)]">Ecommerce CSV Fixer</h1>

        <p className="mt-4 text-lg text-[var(--muted)]">
          Fix ecommerce CSV files before you import. Auto-fix safe issues, flag risky ones, and export a clean file you
          can trust.
        </p>

        <p className="mt-4 text-sm text-[var(--muted)]">
          This page is the starting point for the ecommerce tools in StriveFormats. Pick the platform you are importing
          into, then upload your CSV and validate it against that platform’s template.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/ecommerce/shopify" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Shopify CSV Fixer</span>
          </Link>

          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse templates</span>
          </Link>

          <Link href="/pricing#pricing" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--text)]">Supported ecommerce platforms</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Start with these five apps. Each page includes a template preview, a sample CSV you can download, and a
          one-click link that opens the fixer with the right preset selected.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {ECOMMERCE_PLATFORMS.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6"
            >
              <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">{p.blurb}</div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/ecommerce/${p.id}`} className="rgb-btn">
                  <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Open {p.name} tool</span>
                </Link>

                <Link href={`/presets/${encodeURIComponent(p.presetId)}`} className="rgb-btn">
                  <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Template preview</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--text)]">How the ecommerce workflow works</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">1) Choose a platform</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Each platform has its own column expectations. Pick Shopify, WooCommerce, BigCommerce, eBay, or Amazon.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">2) Upload your CSV</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              StriveFormats validates header names and scans for common issues like invalid numbers, blanks, and
              inconsistent values.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">3) Export confidently</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Apply safe auto-fixes, review anything risky, then export a clean CSV that matches the expected template.
            </p>
          </div>
        </div>

        <div className="mt-6 text-sm text-[var(--muted)]">
          If you have repeat workflows, Custom Formats let you save your own templates and rules so future cleanups take
          seconds.
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
