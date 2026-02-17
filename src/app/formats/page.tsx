// src/app/formats/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import FormatsClient from "./FormatsClient";
import { PRESET_FORMATS, getPresetsByCategory } from "@/lib/presetRegistry";

export const metadata: Metadata = {
  title: "Formats",
  description:
    "Browse built-in preset formats or manage your saved Custom Formats. Presets help you start fast. Custom Formats help you reuse rules.",
  alternates: {
    canonical: "/formats",
  },
  robots: { index: true, follow: true },
};

export default function FormatsPage() {
  const groups = getPresetsByCategory();
  const featured = PRESET_FORMATS.slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-sm font-semibold text-[var(--muted)]">Formats</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--text)]">Preset and Custom Formats</h1>
        <p className="mt-4 max-w-3xl text-base text-[var(--muted)]">
          Presets are built-in templates for common CSV workflows. Custom Formats let you save reusable rules and column
          templates for repeat jobs.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/formats/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse all presets</span>
          </Link>
          <Link href="/ecommerce-csv-fixer" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Ecommerce CSV Fixer</span>
          </Link>
        </div>

        <div className="mt-10">
          <div className="text-sm font-semibold text-[var(--text)]">Featured presets</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.slug}
                href={`/formats/presets/${p.slug}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6 hover:bg-[var(--surface-2)]/80"
              >
                <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
                <p className="mt-2 text-sm text-[var(--muted)]">{p.shortDescription}</p>
                <div className="mt-4 text-xs font-semibold text-[var(--muted)]">View preset →</div>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-2">
            {Object.entries(groups).map(([cat, items]) => (
              <div key={cat}>
                <span className="font-semibold text-[var(--text)]">{cat}</span>
                <span className="ml-2">{items.length} presets</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <FormatsClient />
      </section>
    </main>
  );
}
