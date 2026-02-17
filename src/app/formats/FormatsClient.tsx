// src/app/formats/FormatsClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PresetFormat } from "@/lib/presets";

type Props = {
  presets: PresetFormat[];
};

export default function FormatsClient({ presets }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;

    return presets.filter((p) => {
      const hay = [p.name, p.description, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [presets, query]);

  const byCategory = useMemo(() => {
    return filtered.reduce<Record<string, PresetFormat[]>>((acc, p) => {
      const key = p.category || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [filtered]);

  const categories = useMemo(() => Object.keys(byCategory).sort(), [byCategory]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Preset Formats</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/80 md:text-base">
          Pick a preset format to preview the columns, download a sample template, and open it in the fixer.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formats"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 md:max-w-md"
          />

          <div className="flex flex-wrap gap-3">
            <Link href="/app" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Fixer</span>
            </Link>
            <Link href="/ecommerce-csv-fixer" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Ecommerce CSV Fixer</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-8">
        {categories.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/75">
            No formats match your search.
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-xl font-semibold">{cat}</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {byCategory[cat].map((p) => (
                  <div key={p.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="text-lg font-semibold">{p.name}</div>
                    <div className="mt-1 text-sm text-white/75">{p.description}</div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={`/presets/${encodeURIComponent(p.id)}`} className="rgb-btn">
                        <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">View template</span>
                      </Link>
                      <Link href={`/app?preset=${encodeURIComponent(p.id)}`} className="rgb-btn">
                        <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Open in fixer</span>
                      </Link>
                      <Link href={`/presets/${encodeURIComponent(p.id)}/sample.csv`} className="rgb-btn">
                        <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Sample CSV</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
