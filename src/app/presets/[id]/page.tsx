import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import { getPresetById } from "@/lib/presets";
import { getFormatById } from "@/lib/formats";

const SITE_URL = "https://striveformats.com";

const keywordMap: Record<string, string[]> = {
  shopify_products: [
    "shopify csv template",
    "shopify product csv",
    "shopify import csv",
    "shopify csv fixer",
    "shopify bulk upload",
    "fix shopify csv",
    "shopify variants csv",
    "shopify product import errors",
  ],
  woocommerce_products: [
    "woocommerce csv template",
    "woocommerce product csv",
    "woocommerce import csv",
    "fix woocommerce csv",
    "woocommerce bulk upload",
    "woocommerce product import",
  ],
  woocommerce_variable_products: [
    "woocommerce variable products csv",
    "woocommerce variations csv",
    "fix woocommerce variations",
    "woocommerce variable import",
    "woocommerce product attributes csv",
  ],
  etsy_listings: [
    "etsy listing csv",
    "etsy csv template",
    "fix etsy csv",
    "etsy bulk upload",
    "etsy listing export",
    "etsy inventory csv",
  ],
  ebay_listings: [
    "ebay listing csv",
    "ebay file exchange csv",
    "fix ebay csv",
    "ebay bulk listing upload",
    "ebay csv template",
  ],
  ebay_variations: [
    "ebay variations csv",
    "ebay variation listing csv",
    "fix ebay variations",
    "ebay variable listing",
  ],
  amazon_inventory_loader: [
    "amazon inventory csv",
    "amazon flat file csv",
    "fix amazon csv",
    "amazon inventory loader",
    "amazon seller csv",
    "amazon bulk listing",
  ],
};

export async function generateMetadata({ params }: PageProps) {
  const resolved = await Promise.resolve(params as any);
  const rawId = typeof resolved?.id === "string" ? resolved.id : "";
  const id = decodeURIComponent(rawId);
  const preset = getPresetById(id);

  if (!preset) {
    return {
      title: "Template | StriveFormats",
      description: "CSV template and fixer information.",
    };
  }

  const keywords = keywordMap[preset.id];

  return {
    title: `${preset.name} | StriveFormats`,
    description: preset.description,
    alternates: { canonical: `/presets/${encodeURIComponent(preset.id)}` },
    keywords,
    openGraph: {
      title: `${preset.name} | StriveFormats`,
      description: preset.description,
      url: `/presets/${encodeURIComponent(preset.id)}`,
      type: "website",
    },
    twitter: keywords
      ? {
          card: "summary_large_image",
          title: `${preset.name} | StriveFormats`,
          description: preset.description,
          images: ["/opengraph-image"],
        }
      : undefined,
  };
}

type PageProps = {
  // Next.js versions differ on whether `params` is plain or a Promise.
  // Support both so we never accidentally 404 in production.
  params: { id: string } | Promise<{ id: string }>;
};

function sampleValueFor(header: string) {
  const h = header.toLowerCase();
  if (h.includes("title") || h.includes("name") || h.includes("item")) return "Sample Product";
  if (h.includes("sku")) return "SKU-1001";
  if (h.includes("handle")) return "sample-product";
  if (h.includes("price")) return "19.99";
  if (h.includes("quantity") || h.includes("stock") || h.includes("inventory")) return "10";
  if (h.includes("published")) return "TRUE";
  if (h.includes("url") || h.includes("image")) return "https://example.com/image.jpg";
  if (h.includes("category")) return "Example Category";
  if (h.includes("tag")) return "tag-one, tag-two";
  return "";
}

function mergeExampleRow(headers: string[], exampleRow?: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const h of headers) {
    const v = exampleRow?.[h];
    out[h] = typeof v === "string" ? v : sampleValueFor(h);
  }
  return out;
}

export default async function PresetDetailPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params as any);
  const rawId = typeof resolved?.id === "string" ? resolved.id : "";
  const id = decodeURIComponent(rawId);

  // Primary lookup by preset id
  let preset = getPresetById(id);
  // Fallback: some links may pass formatId instead of preset id.
  if (!preset) preset = getPresetById(id.replace(/\s+/g, ""));
  if (!preset) return notFound();

  const format = getFormatById(preset.formatId);
  const expectedHeaders = (format as any)?.expectedHeaders as string[] | undefined;
  const headers = Array.isArray(expectedHeaders) && expectedHeaders.length ? expectedHeaders : [];
  const exampleRow = headers.length ? mergeExampleRow(headers, (format as any)?.exampleRow) : null;
  const seo = (format as any)?.seo as
    | {
        longDescription?: string[];
        howItWorks?: string[];
        commonFixes?: string[];
        faq?: Array<{ q: string; a: string }>;
      }
    | undefined;

  const openFixerHref = `/app?preset=${encodeURIComponent(preset.formatId)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const isShopify = preset.id === "shopify_products" || preset.formatId === "shopify_products";
  const pageUrl = `${SITE_URL}/presets/${encodeURIComponent(preset.id)}`;

  const breadcrumbLd = isShopify
    ? {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Preset Formats", item: `${SITE_URL}/presets` },
          { "@type": "ListItem", position: 3, name: preset.name, item: pageUrl },
        ],
      }
    : null;

  const faqLd =
    isShopify && seo?.faq?.length
      ? {
          "@type": "FAQPage",
          mainEntity: seo.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${preset.name} CSV Template`,
        description: preset.description,
        url: pageUrl,
      },
      ...(breadcrumbLd ? [breadcrumbLd] : []),
      ...(faqLd ? [faqLd] : []),
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">{preset.category}</div>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{preset.name}</h1>
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">{preset.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="rg-btn" href={openFixerHref}>
              Open with preset
            </Link>
            <Link className="pill-btn" href={sampleCsvHref}>
              Download sample CSV
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Expected columns</h2>
          {headers.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {headers.map((h) => (
                <div key={h} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                  {h}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
              This preset does not expose a fixed column list yet.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Example row</h2>
          {headers.length && exampleRow ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    {headers.slice(0, 12).map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-[var(--text)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {headers.slice(0, 12).map((h) => (
                      <td key={h} className="whitespace-nowrap px-3 py-2 text-[color:rgba(var(--muted-rgb),1)]">
                        {exampleRow[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <div className="border-t border-[var(--border)] px-4 py-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                Showing 12 columns for readability. Download the sample CSV for the full header set.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 grid gap-7">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">About this format</h2>
          <div className="mt-3 space-y-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
            {(seo?.longDescription?.length ? seo.longDescription : [
              "Use this preset to validate your CSV against the expected template and export a clean, import-ready file.",
            ]).map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>

        <div className="grid gap-7 md:grid-cols-2">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">How it works</h2>
            <ol className="mt-4 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {(seo?.howItWorks?.length
                ? seo.howItWorks
                : [
                    "Upload your CSV.",
                    "We validate required fields and normalize common formatting.",
                    "Auto-fix safe issues, then export a clean file.",
                  ]
              ).map((s, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-[2px] h-6 w-6 shrink-0 rounded-full bg-[var(--surface-2)] text-center text-sm leading-6 text-[var(--text)]">
                    {i + 1}
                  </div>
                  <div>{s}</div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">Examples of fixes</h2>
            <ul className="mt-4 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              {(seo?.commonFixes?.length
                ? seo.commonFixes
                : [
                    "Trim whitespace and normalize basic fields.",
                    "Flag missing required values.",
                    "Standardize common boolean fields.",
                  ]
              ).map((s, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                  <div>{s}</div>
                </li>
              ))}
            </ul>
          
        {isShopify ? (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">Common Shopify import errors this helps prevent</h2>
            <div className="mt-4 space-y-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
              <p>
                Shopify CSV imports often fail for small, easy-to-miss problems: mismatched headers, invalid TRUE/FALSE values,
                prices with currency symbols, broken image URLs, or variant rows with incomplete option fields.
              </p>
              <p>
                StriveFormats validates against Shopify’s official product template, applies safe normalization where possible,
                and flags risky issues so you can fix them before upload. This reduces “Import failed” errors and improves
                consistency across products, variants, images, inventory, and SEO fields.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-base font-semibold text-[var(--text)]">Variants & options</div>
                <ul className="mt-3 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                  <li>Missing Option1 name/value on variant rows</li>
                  <li>Accidental duplicate SKUs across variants</li>
                  <li>Inconsistent option naming (size vs Size) across rows</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-base font-semibold text-[var(--text)]">Prices, inventory, and status</div>
                <ul className="mt-3 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                  <li>Prices formatted as “$19.99” instead of “19.99”</li>
                  <li>Inventory quantity not numeric or missing tracker values</li>
                  <li>Status and boolean fields not using valid Shopify values</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-base font-semibold text-[var(--text)]">Images</div>
                <ul className="mt-3 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                  <li>Image URLs missing protocol (http/https)</li>
                  <li>Image position gaps or non-numeric values</li>
                  <li>Image rows that don’t map cleanly to the product handle</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-base font-semibold text-[var(--text)]">SEO fields</div>
                <ul className="mt-3 space-y-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                  <li>Overlong SEO titles/descriptions</li>
                  <li>Empty SEO fields where you want consistent defaults</li>
                  <li>Whitespace and formatting inconsistencies across rows</li>
                </ul>
              </div>
            </div>
          </section>
        ) : null}
</section>
        </div>

        {seo?.faq?.length ? (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
            <h2 className="text-xl font-semibold text-[var(--text)]">FAQ</h2>
            <div className="mt-5 space-y-5">
              {seo.faq.map((f, i) => (
                <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                  <div className="text-base font-semibold text-[var(--text)]">{f.q}</div>
                  <div className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">{f.a}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/#pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </main>
  );
}
