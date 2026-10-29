// src/views/migratePages.tsx
// /migrate (index) and /migrate/<route>: store-migration pages built around the converter.
// English only; the embedded converter UI is the translated one.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import ConvertClient from "@/app/convert/ConvertClient";
import FAQJsonLd from "@/components/FAQJsonLd";
import JsonLd from "@/components/JsonLd";
import { parseCsv } from "@/lib/csv";
import { convertCsv } from "@/lib/convertCsv";
import { CONVERT_ROUTES, SAMPLE_EXPORTS, type ConvertRoute } from "@/lib/convertRoutes";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { pageAlternates, SITE_URL } from "@/lib/i18n/seo";
import { card, muted } from "@/app/app/fixer/ui";

const MAX_COLS = 6;

export function migrateMetadata(route: ConvertRoute): Metadata {
  const path = `/migrate/${route.slug}`;
  return {
    title: { absolute: `${route.metaTitle} | StriveFormats` },
    description: route.metaDescription,
    alternates: pageAlternates("en", path, false),
    openGraph: { title: route.metaTitle, description: route.metaDescription, url: `${SITE_URL}${path}`, locale: "en" },
  };
}

/** The route's sample export, run through the real converter. */
function example(route: ConvertRoute) {
  const src = parseCsv(SAMPLE_EXPORTS[route.source]);
  const out = convertCsv(src.headers, src.rows, route.source, route.target);
  const pick = (headers: string[]) => headers.slice(0, MAX_COLS);
  return {
    before: { headers: pick(src.headers), rows: src.rows.slice(0, 4), total: src.headers.length },
    after: { headers: pick(out.headers), rows: out.rows.slice(0, 5), total: out.headers.length },
  };
}

function MiniTable({ caption, headers, rows, total }: { caption: string; headers: string[]; rows: Record<string, string>[]; total: number }) {
  return (
    <figure className="min-w-0">
      <figcaption className={`mb-2 text-xs font-semibold uppercase tracking-wider ${muted}`}>{caption}</figcaption>
      <div className="data-table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h} className="max-w-[12rem] truncate" title={r[h]}>
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {total > headers.length && <p className={`mt-1.5 text-xs ${muted}`}>+ {total - headers.length} more columns</p>}
    </figure>
  );
}

function Steps({ title, items }: { title: string; items: string[] }) {
  return (
    <section className={`${card} p-5 sm:p-7`}>
      <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
      <ol className="mt-4 space-y-3">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm leading-6 text-[var(--text)]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--secondary-soft)] text-xs font-bold text-[var(--secondary-text)]">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function MigrateView({ route }: { route: ConvertRoute }) {
  const t = await getTranslations("en");
  const ex = example(route);
  const others = CONVERT_ROUTES.filter((r) => r.slug !== route.slug);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: route.h1,
          description: route.metaDescription,
          step: [...route.exportSteps, "Convert the file with StriveFormats.", ...route.importSteps].map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
        }}
      />
      <FAQJsonLd items={route.faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav className={`text-sm ${muted}`} aria-label="Breadcrumb">
        <Link href="/convert" className="hover:underline">
          Format converter
        </Link>{" "}
        / <Link href="/migrate" className="hover:underline">Store migrations</Link> / <span className="text-[var(--text)]">{route.sourceName} to {route.targetName}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--secondary-text)]">
          {route.sourceName} → {route.targetName}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">{route.h1}</h1>
        <p className={`mt-4 text-base leading-7 ${muted}`}>{route.intro}</p>
      </header>

      <div className="mt-10">
        <Suspense fallback={<div className="h-64" />}>
          <ConvertClient t={t.convert} initialSource={route.source} initialTarget={route.target} embedded />
        </Suspense>
      </div>

      <section className={`${card} mt-10 p-5 sm:p-7`}>
        <h2 className="text-xl font-semibold text-[var(--text)]">What the conversion looks like</h2>
        <p className={`mt-2 text-sm ${muted}`}>
          A small {route.sourceName} export and the {route.targetName} file the converter makes from it. This is the converter&apos;s real output.
        </p>
        <div className="mt-5 grid gap-6">
          <MiniTable caption={`${route.sourceName} export`} {...ex.before} />
          <MiniTable caption={`${route.targetName} import file`} {...ex.after} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Steps title={`1. Export from ${route.sourceName}`} items={route.exportSteps} />
        <Steps title={`2. Import into ${route.targetName}`} items={route.importSteps} />
      </div>

      <section className={`${card} mt-6 p-5 sm:p-7`}>
        <h2 className="text-xl font-semibold text-[var(--text)]">What doesn&apos;t carry over</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text)]">
          {route.notCarried.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className={`mt-4 text-sm ${muted}`}>
          Before importing, run the file through the{" "}
          <Link href={route.targetLanding} className="font-medium text-[var(--secondary-text)] hover:underline">
            {route.targetName} CSV fixer
          </Link>{" "}
          to catch anything {route.targetName} would reject.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-[var(--text)]">Questions</h2>
        <div className="mt-4 space-y-3">
          {route.faqs.map((f) => (
            <details key={f.q} className={`${card} group p-5`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[var(--text)]">
                {f.q}
                <span className={`transition-transform group-open:rotate-45 ${muted}`} aria-hidden="true">+</span>
              </summary>
              <p className={`mt-3 text-sm leading-6 ${muted}`}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-[var(--text)]">Other migrations</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((r) => (
            <li key={r.slug}>
              <Link href={`/migrate/${r.slug}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text)] hover:border-[rgba(var(--accent-rgb),0.5)]">
                {r.sourceName} to {r.targetName}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export const migrateIndexMetadata: Metadata = {
  title: { absolute: "Store Migration CSV Converters: Shopify, WooCommerce, Etsy, eBay, Amazon | StriveFormats" },
  description: "Move your products between Shopify, WooCommerce, Etsy, eBay and Amazon. Step-by-step export and import instructions with a free in-browser converter.",
  alternates: pageAlternates("en", "/migrate", false),
};

export function MigrateIndexView() {
  const byTarget = new Map<string, ConvertRoute[]>();
  for (const r of CONVERT_ROUTES) byTarget.set(r.targetName, [...(byTarget.get(r.targetName) ?? []), r]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">Move your products to another platform</h1>
      <p className={`mt-4 max-w-2xl text-base leading-7 ${muted}`}>
        Pick your move. Each guide shows where to export from, what the converted file looks like, and how to import it, with the converter built in.
      </p>
      {[...byTarget.entries()].map(([target, routes]) => (
        <section key={target} className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">To {target}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {routes.map((r) => (
              <li key={r.slug}>
                <Link href={`/migrate/${r.slug}`} className={`${card} block p-5 hover:border-[rgba(var(--accent-rgb),0.5)]`}>
                  <span className="block font-semibold text-[var(--text)]">
                    {r.sourceName} to {r.targetName}
                  </span>
                  <span className={`mt-1 block text-sm ${muted}`}>{r.intro.split(". ")[0]}.</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className={`mt-10 text-sm ${muted}`}>
        Need a different pair? The{" "}
        <Link href="/convert" className="font-medium text-[var(--secondary-text)] hover:underline">
          format converter
        </Link>{" "}
        handles every combination of Shopify, WooCommerce, Etsy, eBay and Amazon.
      </p>
    </main>
  );
}
