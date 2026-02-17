// src/app/ecommerce/[platform]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { ECOMMERCE_PLATFORMS, getEcommercePlatformById } from "@/lib/ecommercePlatforms";

type PageProps = {
  params: Promise<{ platform: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return ECOMMERCE_PLATFORMS.map((p) => ({ platform: p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { platform } = await params;
  const p = getEcommercePlatformById(platform);
  if (!p) return { title: "Not found" };

  const title = `${p.name} CSV Fixer | StriveFormats`;
  const description =
    p.id === "shopify"
      ? "Clean, standardize, and validate Shopify Products CSV files before import. StriveFormats checks handles, variants, SKUs, pricing, inventory, images, and SEO and applies only safe auto-fixes."
      : `Clean, standardize, and validate ${p.name} CSV files before import. StriveFormats applies safe auto-fixes and flags risky issues for review.`;

  return {
    title,
    description,
    alternates: { canonical: `/ecommerce/${encodeURIComponent(p.id)}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/ecommerce/${encodeURIComponent(p.id)}`,
    },
  };
}

function platformLongCopy(platformId: string) {
  switch (platformId) {
    case "shopify":
      return {
        headline: "Shopify CSV Fixer",
        subhead:
          "Shopify imports can fail for reasons that are easy to miss in spreadsheets: invalid booleans, inconsistent pricing formats, variant rows that don’t agree with each other, duplicate option combinations, duplicate SKUs, and handle collisions.",
        bullets: [
          "Header and template shaping for Shopify Products CSV",
          "Handle grouping checks and handle formatting rules",
          "Variant option collision detection (identical option combos under one handle)",
          "Duplicate SKU alerts (including stronger alerts across different handles)",
          "Pricing numeric validation and compare-at sanity checks",
          "Inventory quantity integer validation",
          "Image URL checks and image position consistency",
          "Basic SEO guidance for title and description fields",
        ],
        extra:
          "StriveFormats auto-fixes only safe issues and leaves meaning-changing decisions for you to review before export.",
      };
    case "woocommerce":
      return {
        headline: "WooCommerce CSV Fixer",
        subhead:
          "WooCommerce product imports are sensitive to missing essentials, inconsistent numeric fields, and messy blanks that turn into unexpected values during upload.",
        bullets: [
          "Normalize headers to the expected WooCommerce template",
          "Flag missing SKU or Name values",
          "Validate numeric prices and clean obvious formatting issues",
          "Keep descriptions, categories, and image links consistent",
        ],
        extra: "This preset focuses on predictable product imports and clean spreadsheet handoffs for bulk edits.",
      };
    case "ebay":
      return {
        headline: "eBay CSV Fixer",
        subhead:
          "eBay listing CSV work tends to break down when prices and quantities are inconsistent, or when key listing fields are blank across many rows.",
        bullets: [
          "Validate Title, Price, and Quantity",
          "Normalize numeric values so they are import-friendly",
          "Clean up blanks and whitespace that cause hidden mismatches",
          "Keep image URLs and descriptions consistent",
        ],
        extra:
          "This includes a basic listing template plus a variations template so you can keep parent and child rows consistent.",
      };
    case "amazon":
      return {
        headline: "Amazon Seller Central CSV Fixer",
        subhead:
          "Amazon uploads depend on consistent identifiers and clean numeric fields. Formatting drift across spreadsheets can cause costly upload errors.",
        bullets: [
          "Validate required identifiers (SKU and key ID columns)",
          "Normalize numeric formatting to plain values",
          "Standardize blanks so spreadsheets don’t invent values",
          "Keep URLs and core product fields consistent",
        ],
        extra:
          "This includes an Inventory Loader style template plus a minimal Product Template starter for category-based workflows.",
      };
    case "etsy":
      return {
        headline: "Etsy CSV Fixer",
        subhead:
          "Etsy listing exports often drift in formatting and required values. Small inconsistencies can cause upload errors or messy bulk edits.",
        bullets: [
          "Validate core listing fields like Title, Price, and Quantity",
          "Normalize numeric values (plain numbers)",
          "Clean hidden whitespace and blank inconsistencies",
          "Keep tags and description fields consistent",
        ],
        extra: "This preset focuses on reliable cleanup for repeat bulk listing edits.",
      };
    default:
      return null;
  }
}

export default async function EcommercePlatformPage({ params }: PageProps) {
  const { platform } = await params;
  const p = getEcommercePlatformById(platform);
  if (!p) return notFound();

  const copy = platformLongCopy(p.id);
  if (!copy) return notFound();

  const primary = p.formats[0];
  if (!primary) return notFound();

  const openFixerHref = `/app?preset=${encodeURIComponent(primary.formatId)}`;
  const templatePreviewHref = `/presets/${encodeURIComponent(primary.presetId)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(primary.presetId)}/sample.csv`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${p.name} CSV Fixer`,
    description: p.blurb,
    url: `/ecommerce/${encodeURIComponent(p.id)}`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span className="pill-btn is-active">StriveFormats</span>
          <span className="pill-btn">Clean. Standardize. Validate.</span>
          <span className="pill-btn">{p.name} CSV</span>
          <span className="pill-btn">Runs in-browser</span>
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text)]">{copy.headline}</h1>

        <p className="mt-4 text-lg text-[var(--muted)]">{copy.subhead}</p>
        <p className="mt-4 text-sm text-[var(--muted)]">{copy.extra}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={openFixerHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upload {p.name} CSV</span>
          </Link>

          <Link href={templatePreviewHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">View template preview</span>
          </Link>

          <a href={sampleCsvHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Download sample CSV</span>
          </a>

          <Link href="/ecommerce-csv-fixer" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Back to Ecommerce</span>
          </Link>
        </div>

        {p.legacySeoPath ? (
          <div className="mt-4 text-xs text-[var(--muted)]">
            Looking for the deep-dive Shopify page?{" "}
            <Link className="underline" href={p.legacySeoPath}>
              Open the Shopify guide
            </Link>
            .
          </div>
        ) : null}
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--text)]">Supported formats for {p.name}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Start with the primary template, then use the additional formats as needed. All formats prioritize safe validation and safe auto-fixes only.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {p.formats.map((f) => (
            <div key={f.formatId} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
              <div className="text-sm font-semibold text-[var(--text)]">{f.label}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/app?preset=${encodeURIComponent(f.formatId)}`} className="rgb-btn">
                  <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Open in fixer</span>
                </Link>
                <Link href={`/presets/${encodeURIComponent(f.presetId)}`} className="rgb-btn">
                  <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Template preview</span>
                </Link>
                <a href={`/presets/${encodeURIComponent(f.presetId)}/sample.csv`} className="rgb-btn">
                  <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Sample CSV</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--text)]">What this preset checks</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          These checks are designed to catch the common problems that cause failed imports, partial imports, or silent data drift.
        </p>

        <ul className="mt-4 list-disc pl-6 text-sm text-[var(--muted)]">
          {copy.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Next steps for this platform can include additional, platform-specific autofix packs (still safe by default) and deeper catalog consistency checks.
        </p>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--text)]">Other supported platforms</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          StriveFormats v1 focuses on ecommerce. These pages keep the tool focused while still letting you move between templates quickly.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {ECOMMERCE_PLATFORMS.filter((x) => x.id !== p.id).map((x) => {
            const primaryX = x.formats[0];
            return (
              <div key={x.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
                <div className="text-sm font-semibold text-[var(--text)]">{x.name}</div>
                <div className="mt-2 text-sm text-[var(--muted)]">{x.blurb}</div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/ecommerce/${x.id}`} className="rgb-btn">
                    <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Open {x.name}</span>
                  </Link>
                  {primaryX ? (
                    <Link href={`/presets/${encodeURIComponent(primaryX.presetId)}`} className="rgb-btn">
                      <span className="px-5 py-3 text-sm font-semibold text-[var(--text)]">Template preview</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
