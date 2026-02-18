import type { Metadata } from "next";
import Link from "next/link";
import FormatsClient, { type PresetFormatLite } from "./FormatsClient";
import { PRESET_FORMATS, getPresetsByCategory } from "@/lib/presetRegistry";

export const metadata: Metadata = {
  title: "Custom Formats | StriveFormats",
  description:
    "Create and manage reusable CSV formats with column templates and cleanup rules. Browse preset formats to get started quickly.",
  alternates: { canonical: "/formats" },
  robots: { index: true, follow: true },
};

export default function FormatsPage() {
  const byCategory = getPresetsByCategory();

  // Build the exact props that FormatsClient requires.
  // Keep this logic here so the client component stays UI-only.
  const groups: Array<{ category: string; presets: PresetFormatLite[] }> = Object.entries(byCategory).map(
    ([category, presets]) => ({
      category,
      presets: (presets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.shortDescription ?? p.description ?? "",
        category: p.category,
      })),
    })
  );

  // Lightweight featured set (top of registry)
  const featured: PresetFormatLite[] = (PRESET_FORMATS ?? []).slice(0, 6).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.shortDescription ?? p.description ?? "",
    category: p.category,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-sm font-semibold text-[var(--text)]">Custom Formats</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">Save and reuse your rules</h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
          Build reusable column templates and cleanup rules so repeat jobs take seconds. If you just want to start
          quickly, browse preset formats with ready to use sample CSV templates.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/presets" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse preset formats</span>
          </Link>

          <Link href="/ecommerce-csv-fixer" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Ecommerce CSV Fixer</span>
          </Link>
        </div>

        <div className="mt-4 flex gap-6 text-xs text-[var(--muted)]">
          <span>Runs in browser</span>
          <span>Reusable templates</span>
          <span>Export clean CSV</span>
        </div>
      </section>

      <section className="mt-10">
        <FormatsClient groups={groups} featured={featured} />
      </section>
    </main>
  );
}
