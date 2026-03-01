"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PresetCategory = string;

export type PresetFormatLite = {
  id: string;
  name: string;
  description?: string;
  category: PresetCategory;
};

type Props = {
  groups: Array<{
    category: PresetCategory;
    presets: PresetFormatLite[];
  }>;
  featured: PresetFormatLite[];
};

export default function FormatsClient({ groups, featured }: Props) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((g) => {
        const presets = g.presets.filter((p) => {
          const hay = `${p.name} ${p.description ?? ""} ${p.id}`.toLowerCase();
          return hay.includes(q);
        });
        return { ...g, presets };
      })
      .filter((g) => g.presets.length > 0);
  }, [groups, query]);

  const filteredFeatured = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return featured;
    return featured.filter((p) => {
      const hay = `${p.name} ${p.description ?? ""} ${p.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [featured, query]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-sm font-semibold text-[var(--text)]">Formats</div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Browse presets and start fixing faster
        </h1>

        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Choose a preset to see the expected columns, download a sample CSV, and open the fixer with the right format
          selected.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label className="sr-only" htmlFor="format-search">
              Search presets
            </label>
            <input
              id="format-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search presets (Shopify, Etsy, Mailchimp...)"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/presets" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Browse all presets</span>
            </Link>
            <Link href="/app" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
            </Link>
          </div>
        </div>

        {filteredFeatured.length > 0 ? (
          <div className="mt-8">
            <div className="text-sm font-semibold text-[var(--text)]">Featured</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filteredFeatured.map((p) => (
                <Link
                  key={p.id}
                  href={`/presets/${encodeURIComponent(p.id)}`}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6 hover:border-[var(--ring)]"
                >
                  <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{p.category}</div>
                  <div className="mt-3 text-sm text-[var(--muted)]">{p.description ?? ""}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-sm font-semibold text-[var(--text)]">All presets</div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Presets are grouped by category. Click one to view columns, sample data, and the download link.
        </p>

        <div className="mt-6 grid gap-8">
          {filteredGroups.map((g) => (
            <div key={g.category}>
              <div className="text-xs font-semibold tracking-wide text-[var(--muted)]">{g.category}</div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {g.presets.map((p) => (
                  <Link
                    key={p.id}
                    href={`/presets/${encodeURIComponent(p.id)}`}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6 hover:border-[var(--ring)]"
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
                    <div className="mt-3 text-sm text-[var(--muted)]">{p.description ?? ""}</div>
                    <div className="mt-4 text-xs text-[var(--muted)]">Preset ID: {p.id}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

        {filteredGroups.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
            No presets match your search.
          </div>
        ) : null}
      </section>
    </main>
  );
}
