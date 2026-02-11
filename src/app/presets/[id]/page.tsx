import Link from "next/link";
import { notFound } from "next/navigation";
import { getPresetById, getPresetFormats } from "@/lib/presets";
import JsonLd from "@/components/JsonLd";

// Important for static export reliability
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const presets = getPresetFormats();
  return presets.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const preset = getPresetById(params.id);
  if (!preset) return {};

  return {
    title: `${preset.name} CSV Fixer`,
    description: preset.description,
  };
}

function guessUseCases(category: string) {
  const cat = (category || "").toLowerCase();

  if (cat.includes("ecommerce")) {
    return [
      "Fix missing required columns (like handles or IDs)",
      "Normalize price, inventory, and option formatting",
      "Catch invalid values that break imports",
    ];
  }

  if (cat.includes("marketing")) {
    return [
      "Clean emails and required audience fields",
      "Normalize names, tags, and segmentation columns",
      "Catch blanks and malformed values early",
    ];
  }

  if (cat.includes("crm")) {
    return [
      "Clean contact rows and normalize required fields",
      "Reduce import rejects caused by missing columns",
      "Standardize formatting across exports",
    ];
  }

  if (cat.includes("accounting")) {
    return [
      "Normalize number-like fields and blanks",
      "Ensure required columns exist in the output",
      "Flag rows that need attention before import",
    ];
  }

  if (cat.includes("shipping")) {
    return [
      "Standardize address fields and required columns",
      "Flag missing address pieces before label creation",
      "Reduce downstream errors during bulk imports",
    ];
  }

  if (cat.includes("support")) {
    return [
      "Normalize user/contact fields for support imports",
      "Catch blanks and invalid values that cause rejects",
      "Clean common formatting issues quickly",
    ];
  }

  return [
    "Normalize blanks and whitespace",
    "Ensure required columns exist in the output",
    "Flag risky rows so you can fix them before export",
  ];
}

export default function PresetDetailPage({ params }: { params: { id: string } }) {
  const preset = getPresetById(params.id);
  if (!preset) return notFound();

  const openUrl = `/app?preset=${encodeURIComponent(preset.id)}`;
  const useCases = guessUseCases(preset.category ?? "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${preset.name} CSV Fixer`,
    description: preset.description,
    isPartOf: {
      "@type": "WebSite",
      name: "CSNest",
    },
    potentialAction: {
      "@type": "UseAction",
      name: "Open in CSV Fixer",
      target: openUrl,
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <JsonLd data={jsonLd} />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--muted)]">Preset format</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">{preset.name} CSV Fixer</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{preset.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openUrl} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
              Open fixer with this preset
            </span>
          </Link>

          <Link href="/presets" className="rg-btn">
            Back to all presets
          </Link>
        </div>

        <div className="mt-4 text-xs text-[var(--muted)]">
          Category: {preset.category ?? "Other"} • Preset ID: {preset.id}
        </div>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">What this preset helps with</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            {useCases.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">How to use</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Open the fixer using the button above</li>
            <li>Upload your CSV</li>
            <li>Review highlighted issues and apply manual fixes if needed</li>
            <li>Export the cleaned CSV</li>
          </ol>

          <div className="mt-6">
            <Link href={openUrl} className="rg-btn">
              Open now
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h2 className="text-lg font-semibold text-[var(--text)]">FAQ</h2>

        <div className="mt-5 grid gap-4">
          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
              Does this upload my CSV anywhere?
            </summary>
            <p className="mt-3 text-sm text-[var(--muted)]">
              The core parsing and edits run in your browser. Your export is generated locally.
            </p>
          </details>

          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
              What if my CSV is missing required columns?
            </summary>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Presets include required columns in the output template and flag rows so you can fill in missing values.
            </p>
          </details>

          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
              Can I still use custom formats?
            </summary>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Yes. Custom formats continue to appear in the app format pills when you save or import them.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
