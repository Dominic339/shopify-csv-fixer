// src/app/ecommerce-csv-fixer/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQJsonLd from "@/components/FAQJsonLd";
import { ECOMMERCE_PLATFORMS } from "@/lib/ecommercePlatforms";

export const metadata: Metadata = {
  title: "Ecommerce CSV Fixer | StriveFormats",
  description:
    "Clean, standardize, and validate ecommerce CSV files before import. Supports Shopify, WooCommerce, Amazon Seller Central, eBay, and Etsy templates with safe auto-fixes and clear warnings.",
  alternates: { canonical: "/ecommerce-csv-fixer" },
  openGraph: {
    title: "Ecommerce CSV Fixer | StriveFormats",
    description:
      "Fix messy ecommerce CSV files with safe auto-fixes and clear validation. Supports Shopify, WooCommerce, Amazon Seller Central, eBay, and Etsy.",
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
      "Safe fixes include trimming whitespace, normalizing blanks, standardizing numeric formats, and normalizing booleans. Anything that could change meaning stays flagged so you can confirm it.",
  },
  {
    question: "Why do ecommerce imports fail even when the spreadsheet looks fine?",
    answer:
      "Imports often depend on strict headers, consistent row grouping, and predictable values. Spreadsheets can hide whitespace, mixed formats, and cross-row collisions.",
  },
  {
    question: "Can I download templates?",
    answer:
      "Yes. Each platform page links to a template preview and a ready-to-fill sample CSV so you can start from the expected column layout.",
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
    "@type": "WebPage",
    name: "Ecommerce CSV Fixer",
    description: metadata.description,
    url: "https://striveformats.com/ecommerce-csv-fixer",
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={jsonLd} />
      {/* ✅ FIX: component expects prop name "items" */}
      <FAQJsonLd items={[...faqItems]} />

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Ecommerce CSV Fixer</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/80 md:text-base">
          Pick a platform, upload your CSV, and export an import-ready file with safe auto-fixes and clear warnings.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {ECOMMERCE_PLATFORMS.map((p) => (
            <Link
              key={p.id}
              href={`/ecommerce/${encodeURIComponent(p.id)}`}
              className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="mt-1 text-sm text-white/75">{p.blurb}</div>
                </div>
                <div className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
                  {p.formats.length} format{p.formats.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-4 text-sm text-white/80">
                View supported templates <span className="opacity-70">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Fixer</span>
          </Link>
          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse presets</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h2 className="text-xl font-semibold">FAQ</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="text-sm font-semibold">{item.question}</div>
              <div className="mt-2 text-sm text-white/75">{item.answer}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
