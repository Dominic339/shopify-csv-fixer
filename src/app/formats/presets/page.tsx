// src/app/formats/presets/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getPresetsByCategory } from "@/lib/presetRegistry";

export const metadata: Metadata = {
  title: "Preset Formats",
  description:
    "Browse built-in preset CSV formats for ecommerce, marketing, CRM, accounting, shipping, and support. Open the CSV Fixer with a preset selected in one click.",
  alternates: { canonical: "/formats/presets" },
  robots: { index: true, follow: true },
};

export default function PresetFormatsPage() {
  const groups = getPresetsByCategory();

  const categories = Object.keys(groups) as Array<keyof typeof groups>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10">
        <div className="text-sm font-semibold text-[var(--muted)]">Formats</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--text)]">Preset Formats</h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
          These are built-in presets for common CSV workflows. Click any preset to see details and open the CSV Fixer
          with the preset selected.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/formats" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
          </Link>
          <Link href="/app" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-10">
        {categories.map((cat) => {
          const items = groups[cat];
          if (!items?.length) return null;

          return (
            <section key={cat}>
              <h2 className="text-xl font-semibold text-[var(--text)]">{cat}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/formats/presets/${p.slug}`}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-[var(--surface)]/80"
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{p.shortDescription}</p>
                    <div className="mt-4 text-xs font-semibold text-[var(--muted)]">View details →</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
