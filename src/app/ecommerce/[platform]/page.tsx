// src/app/ecommerce/[platform]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import { getEcommercePlatformById } from "@/lib/ecommercePlatforms";
import { getPresetById } from "@/lib/presetRegistry";

type PageProps = {
  params: { platform: string };
};

function titleFor(platformName: string) {
  return `${platformName} CSV Fixer`;
}

function checksFor(platformId: string): string[] {
  switch (platformId) {
    case "shopify":
      return [
        "Strict headers and Shopify-friendly ordering",
        "Handle normalization and duplicate handle detection",
        "Variant grouping consistency checks",
        "Price formatting normalization",
        "TRUE/FALSE boolean normalization",
        "Image URL checks and image-row structure hints",
        "SKU duplication checks (where available)",
        "Tag formatting and cleanup",
      ];
    case "woocommerce":
      return [
        "Required header presence and normalization",
        "Type and status field normalization",
        "Price formatting normalization",
        "Stock status / quantity sanity checks",
        "Category and tag cleanup",
        "Image URL formatting checks",
        "Blank/whitespace cleanup across rows",
        "Safer export formatting for import tools",
      ];
    case "etsy":
      return [
        "Header mapping and basic required fields",
        "Price and quantity format normalization",
        "Title length / empty field checks",
        "Tag formatting cleanup",
        "Image URL formatting checks",
        "Whitespace cleanup and standardization",
      ];
    case "ebay":
      return [
        "Header presence and basic template alignment",
        "Required field checks (title, price, quantity)",
        "Category / condition format sanity checks",
        "Whitespace cleanup and standardization",
        "Image URL formatting checks",
        "Safer export formatting for upload tools",
      ];
    case "amazon":
      return [
        "Basic template checks for common seller uploads",
        "Price formatting normalization",
        "Quantity / inventory sanity checks",
        "Whitespace cleanup and standardization",
        "Image URL formatting checks",
        "Safer export formatting for upload tools",
      ];
    default:
      return [
        "Header checks and normalization",
        "Whitespace cleanup and standardization",
        "Basic required-field checks",
        "Safer export formatting",
      ];
  }
}

export default function EcommercePlatformPage({ params }: PageProps) {
  const platform = getEcommercePlatformById(params.platform);
  if (!platform) return notFound();

  const preset = getPresetById(platform.presetId);
  if (!preset) return notFound();

  // PresetFormat does not have formatId — preset.id is the formatId for /app?preset=
  const openFixerHref = `/app?preset=${encodeURIComponent(preset.id)}`;
  const templatePreviewHref = `/presets/${encodeURIComponent(preset.id)}`;
  const sampleCsvHref = `/presets/${encodeURIComponent(preset.id)}/sample.csv`;

  const bullets = checksFor(platform.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: titleFor(platform.name),
    description: platform.blurb,
    url: `/ecommerce/${encodeURIComponent(platform.id)}`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">StriveFormats</div>
            <h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">{titleFor(platform.name)}</h1>
            <p className="mt-3 max-w-2xl text-base text-[color:rgba(var(--muted-rgb),1)]">{platform.blurb}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rg-btn" href={openFixerHref}>
                Open {platform.name} tool
              </Link>
              <Link className="rg-btn" href={templatePreviewHref}>
                Template preview
              </Link>
              <Link className="rg-btn" href={sampleCsvHref}>
                Download sample CSV
              </Link>
            </div>

            <div className="mt-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Files processed locally • Safe auto-fixes only • Export import-ready CSV
            </div>
          </div>

          <div className="min-w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Included checks</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              {bullets.slice(0, 8).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <div className="mt-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Looking for more templates?{" "}
              <Link className="hover:underline" href="/presets">
                Browse templates
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-7 md:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-base font-semibold text-[var(--text)]">1) Pick the platform</div>
          <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Choose the import target so the fixer can validate against the right headers and rules.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-base font-semibold text-[var(--text)]">2) Upload your CSV</div>
          <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Safe fixes happen automatically. Anything risky stays visible as an issue for manual review.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-base font-semibold text-[var(--text)]">3) Export confidently</div>
          <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Export an import-ready file with clean formatting and consistent values.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/ecommerce-csv-fixer" className="hover:underline">
          Ecommerce CSV Fixer
        </Link>
        <Link href="/presets" className="hover:underline">
          Templates
        </Link>
        <Link href="/#pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </main>
  );
}
