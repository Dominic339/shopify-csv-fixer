// Shared body for the platform landing pages (/shopify-csv-fixer, /de/etsy-csv-fixer, ...).
// Each page's content comes from src/lib/landing/platforms.ts (translations in
// src/i18n/landing); the before/after example is the real fixer run on LANDING_DEMOS
// when the page is built, with its messages translated.

import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FAQJsonLd from "@/components/FAQJsonLd";
import { parseCsv } from "@/lib/csv";
import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import { getGuidesByPlatform, issueCodeToSlug } from "@/lib/guidesRegistry";
import { guideLocalizer } from "@/lib/guides/localizeGuide";
import { LANDING_DEMOS } from "@/lib/landing/demos";
import { type LandingSlug } from "@/lib/landing/platforms";
import { localizedLandings } from "@/lib/landing/localize";
import { FREE_EXPORTS_PER_MONTH } from "@/lib/plans";
import { SHOPIFY_HEADER_ALIASES } from "@/lib/shopifySchema";
import { ISSUE_META_REGISTRY } from "@/lib/validation/issueMetaRegistry";
import { pageAlternates, SITE_URL } from "@/lib/i18n/seo";
import { fmt, getTranslations, platformLabel } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import { loadValidationDicts, validationText } from "@/lib/i18n/validationText";
import type { CsvIssue, CsvRow } from "@/lib/formats/types";

const card = "min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)]";
const muted = "text-[color:rgba(var(--muted-rgb),1)]";

export async function platformLandingMetadata(slug: LandingSlug, locale: Locale = DEFAULT_LOCALE): Promise<Metadata> {
  const p = (await localizedLandings(locale))[slug];
  return {
    // metaTitle already ends with the brand, so skip the layout's "%s | StriveFormats".
    title: { absolute: p.metaTitle },
    description: p.metaDescription,
    alternates: pageAlternates(locale, p.path),
    openGraph: { title: p.metaTitle, description: p.metaDescription, url: `${SITE_URL}${localeHref(locale, p.path)}` },
  };
}

/** Which input column an output column came from (Shopify renames old template columns). */
function sourceColumn(outHeader: string, inputHeaders: string[]): string | null {
  const byKey = new Map(inputHeaders.map((h) => [h.trim().toLowerCase(), h]));
  for (const name of [outHeader, ...(SHOPIFY_HEADER_ALIASES[outHeader] ?? [])]) {
    const hit = byKey.get(name.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function runDemo(slug: LandingSlug) {
  const demo = LANDING_DEMOS[slug];
  const format = getAllFormats().find((f) => f.id === demo.formatId);
  if (!format) return null;
  const parsed = parseCsv(demo.csv);
  const result = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);
  // Show only the columns the demo file had, under their output names.
  const columns = result.fixedHeaders
    .map((out) => ({ out, src: sourceColumn(out, parsed.headers) }))
    .filter((c): c is { out: string; src: string } => c.src !== null);
  const rowIssues = result.issues.filter((i) => i.rowIndex >= 0);
  const cellSeverity = new Map<string, CsvIssue["severity"]>();
  for (const i of rowIssues) {
    const key = `${i.rowIndex}:${i.column}`;
    if (cellSeverity.get(key) !== "error") cellSeverity.set(key, i.severity);
  }
  // One line per distinct problem (validators report it on each affected row).
  const seen = new Set<string>();
  const problems = result.issues
    .filter((i) => i.severity !== "info")
    .filter((i) => {
      const key = `${i.code}:${i.message.replace(/^Row \d+: /, "").replace(/rows? [\d, ]+/g, "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { parsed, result, columns, cellSeverity, problems };
}

function Cell({ value, tone }: { value: string; tone?: "fixed" | "error" | "warning" }) {
  const cls =
    tone === "error"
      ? "bg-red-500/15 text-red-300"
      : tone === "warning"
        ? "bg-amber-500/15 text-amber-200"
        : tone === "fixed"
          ? "bg-green-500/15 text-green-300"
          : "text-[var(--text)]";
  return (
    <td className="px-2 py-1.5 align-top">
      <span className={`block max-w-[11rem] truncate rounded px-1 font-mono text-[11px] ${cls}`} title={value}>
        {value === "" ? " " : value}
      </span>
    </td>
  );
}

function DemoTable({ caption, headers, rows, tone }: { caption: string; headers: string[]; rows: (string | { v: string; tone?: "fixed" | "error" | "warning" })[][]; tone: "before" | "after" }) {
  return (
    <figure className="min-w-0">
      <figcaption className={`mb-2 text-xs font-bold uppercase tracking-widest ${tone === "before" ? "text-red-400" : "text-green-400"}`}>{caption}</figcaption>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[rgba(4,10,22,0.6)]">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold text-cyan-400/80">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                {r.map((c, j) => (typeof c === "string" ? <Cell key={j} value={c} /> : <Cell key={j} value={c.v} tone={c.tone} />))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export async function PlatformLandingView({ slug, locale = DEFAULT_LOCALE }: { slug: LandingSlug; locale?: Locale }) {
  const [landings, t, dicts, localizeGuide] = await Promise.all([
    localizedLandings(locale),
    getTranslations(locale),
    loadValidationDicts(locale),
    guideLocalizer(locale),
  ]);
  const p = landings[slug];
  const L = t.landing;
  const vt = validationText(dicts);
  const href = (path: string) => localeHref(locale, path);
  const fixerHref = href(`/app?preset=${encodeURIComponent(p.presetId)}`);
  const sampleHref = `/presets/${encodeURIComponent(p.presetId)}/sample.csv`;

  const checks = Object.values(ISSUE_META_REGISTRY[p.presetId] ?? {})
    .filter((m) => m.checked !== false)
    .map((m) => vt.meta(m));
  const blockers = checks.filter((m) => m.blocking);

  const demo = runDemo(slug);
  const guides = getGuidesByPlatform(p.guidePlatform)
    .filter((g) => g.kind === "curated")
    .slice(0, 4)
    .map(localizeGuide);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: p.title,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web browser",
    description: p.metaDescription,
    url: `${SITE_URL}${localeHref(locale, p.path)}`,
    inLanguage: locale,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={jsonLd} />
      <FAQJsonLd items={p.faq.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* Hero */}
      <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
        <div className="min-w-0">
          <p className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${p.accent.text} ${p.accent.soft} ${p.accent.border}`}>{p.kicker}</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--text)] sm:text-5xl">{p.title}</h1>
          <p className={`mt-4 max-w-2xl text-base leading-7 ${muted}`}>{p.intro}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link className="btn-primary text-center" href={fixerHref}>
              {L.checkFree}
            </Link>
            <Link className="pill-btn text-center" href={sampleHref}>
              {L.downloadSample}
            </Link>
          </div>
          <p className={`mt-4 text-xs ${muted}`}>
            {fmt(L.trustLine, { count: FREE_EXPORTS_PER_MONTH })}
          </p>
        </div>

        <dl className={`${card} grid grid-cols-3 gap-2 p-5 text-center md:grid-cols-1 md:text-left`}>
          {[
            [checks.length, L.statChecks],
            [blockers.length, L.statBlockers],
            [demo?.result.fixesApplied.length ?? 0, L.statFixes],
          ].map(([n, label]) => (
            <div key={label} className="min-w-0">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className={`block text-3xl font-black ${p.accent.text}`}>{n}</span>
                <span className={`block text-xs ${muted}`}>{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Live before / after */}
      {demo && (
        <section className={`${card} mt-10 p-5 sm:p-7`}>
          <h2 className="text-2xl font-bold text-[var(--text)]">{L.demoTitle}</h2>
          <p className={`mt-2 text-sm ${muted}`}>{fmt(L.demoIntro, { kind: p.kicker })}</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <DemoTable caption={L.before} tone="before" headers={demo.parsed.headers} rows={demo.parsed.rows.map((r: CsvRow) => demo.parsed.headers.map((h) => r[h] ?? ""))} />
            <DemoTable
              caption={L.after}
              tone="after"
              headers={demo.columns.map((c) => c.out)}
              rows={demo.result.fixedRows.map((r, ri) =>
                demo.columns.map((c) => {
                  const v = r[c.out] ?? "";
                  const sev = demo.cellSeverity.get(`${ri}:${c.out}`);
                  const before = demo.parsed.rows[ri]?.[c.src] ?? "";
                  const tone = sev === "error" ? "error" : sev === "warning" ? "warning" : v !== before ? "fixed" : undefined;
                  return { v, tone };
                })
              )}
            />
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-green-400">{fmt(L.fixedAuto, { count: demo.result.fixesApplied.length })}</h3>
              <ul className={`mt-2 list-disc space-y-1 pl-5 text-sm ${muted}`}>
                {demo.result.fixesApplied.slice(0, 6).map((f) => (
                  <li key={f}>{vt.msg(f)}</li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-red-400">{fmt(L.leftForYou, { count: demo.problems.length })}</h3>
              <ul className={`mt-2 list-disc space-y-1 pl-5 text-sm ${muted}`}>
                {demo.problems.slice(0, 6).map((i) => (
                  <li key={`${i.code}-${i.rowIndex}`}>
                    {i.code ? (
                      <Link className="hover:underline" href={href(`/guides/${p.guidePlatform}/${issueCodeToSlug(i.code)}`)}>
                        {vt.msg(i.message)}
                      </Link>
                    ) : (
                      vt.msg(i.message)
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Platform specifics */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-[var(--text)]">{fmt(L.gotchasTitle, { kind: p.kicker })}</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {p.gotchas.map((g, i) => (
            <li key={g.title} className={`${card} p-5`}>
              <span className={`text-4xl font-black ${p.accent.text} opacity-60`}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-base font-bold text-[var(--text)]">{g.title}</h3>
              <p className={`mt-2 text-sm leading-6 ${muted}`}>{g.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* How to use + blockers */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className={`${card} p-5 sm:p-7`}>
          <h2 className="text-xl font-bold text-[var(--text)]">{L.howTitle}</h2>
          <ol className={`mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 ${muted}`}>
            <li>{p.exportTip}</li>
            <li>
              <Link className="font-semibold text-[var(--text)] hover:underline" href={fixerHref}>
                {L.howOpen}
              </Link>
              {/* Japanese and Chinese don't put spaces between words. */}
              {locale === "ja" || locale === "zh" ? "" : " "}
              {L.howOpenRest}
            </li>
            <li>{L.howWork}</li>
            <li>{L.howExport}</li>
          </ol>
        </div>
        <div className={`${card} p-5 sm:p-7`}>
          <h2 className="text-xl font-bold text-[var(--text)]">{L.blockersTitle}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {blockers.slice(0, 7).map((m) => (
              <li key={m.code} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <Link className="text-[var(--text)] hover:underline" href={href(`/guides/${p.guidePlatform}/${issueCodeToSlug(m.code)}`)}>
                  {m.title}
                </Link>
                {m.autoFixable && <span className="shrink-0 text-xs text-green-400">{L.autoFix}</span>}
              </li>
            ))}
          </ul>
          <Link className={`mt-4 inline-block text-sm font-semibold ${p.accent.text} hover:underline`} href={href(`/presets/${p.presetId}`)}>
            {fmt(L.seeAllChecks, { count: checks.length })}
          </Link>
        </div>
      </section>

      {/* Guides + FAQ */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className={`${card} p-5 sm:p-7`}>
          <h2 className="text-xl font-bold text-[var(--text)]">{L.questions}</h2>
          <div className="mt-4 space-y-3">
            {p.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{f.q}</summary>
                <p className={`mt-2 text-sm leading-6 ${muted}`}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className={`${card} p-5 sm:p-7`}>
          <h2 className="text-xl font-bold text-[var(--text)]">{L.guidesTitle}</h2>
          <ul className="mt-4 space-y-3">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link className="text-sm font-semibold text-[var(--text)] hover:underline" href={href(`/guides/${g.platform}/${g.slug}`)}>
                  {g.title}
                </Link>
                <p className={`mt-0.5 line-clamp-2 text-xs ${muted}`}>{g.description}</p>
              </li>
            ))}
          </ul>
          <Link className={`mt-4 inline-block text-sm font-semibold ${p.accent.text} hover:underline`} href={href(`/guides/${p.guidePlatform}`)}>
            {fmt(L.allGuides, { platform: platformLabel(t, p.guidePlatform) })}
          </Link>
        </div>
      </section>

      {/* Related */}
      <nav className="mt-10" aria-label={L.otherFixers}>
        <h2 className={`text-xs font-bold uppercase tracking-widest ${muted}`}>{L.otherFixers}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {p.related.map((r) => {
            const o = landings[r];
            return (
              <li key={r}>
                <Link href={href(o.path)} className={`${card} block p-4 transition-colors hover:bg-[var(--surface-2)]`}>
                  <span className={`text-xs font-semibold ${o.accent.text}`}>{o.kicker}</span>
                  <span className="mt-1 block text-sm font-bold text-[var(--text)]">{o.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
