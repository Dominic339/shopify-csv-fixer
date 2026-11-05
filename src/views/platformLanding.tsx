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
import { fitDescription, fitTitleString, pageAlternates, SHARE_IMAGES, SITE_URL } from "@/lib/i18n/seo";
import { fmt, getTranslations, platformLabel } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import { loadValidationDicts, validationText } from "@/lib/i18n/validationText";
import type { CsvIssue, CsvRow } from "@/lib/formats/types";

const muted = "text-[color:rgba(var(--muted-rgb),1)]";

export async function platformLandingMetadata(slug: LandingSlug, locale: Locale = DEFAULT_LOCALE): Promise<Metadata> {
  const p = (await localizedLandings(locale))[slug];
  return {
    // metaTitle already ends with the brand, so skip the layout's "%s | StriveFormats".
    title: { absolute: fitTitleString(p.metaTitle) },
    description: fitDescription(p.metaDescription),
    alternates: pageAlternates(locale, p.path, !p.englishOnly),
    openGraph: { images: SHARE_IMAGES, title: p.metaTitle, description: p.metaDescription, url: `${SITE_URL}${localeHref(locale, p.path)}` },
  };
}

/** Output columns a fixer renames from another name (TikTok's sku_id from a Google/Meta id). */
const RENAMED_FROM: Record<string, string[]> = { sku_id: ["id"] };

/** Which input column an output column came from (Shopify renames old template columns). */
function sourceColumn(outHeader: string, inputHeaders: string[]): string | null {
  const byKey = new Map(inputHeaders.map((h) => [h.trim().toLowerCase(), h]));
  for (const name of [outHeader, ...(SHOPIFY_HEADER_ALIASES[outHeader] ?? []), ...(RENAMED_FROM[outHeader] ?? [])]) {
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
      ? "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300"
      : tone === "warning"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : tone === "fixed"
          ? "cell-glow border border-transparent text-[var(--text)]"
          : "text-[var(--text)]";
  return (
    <td className="px-2 py-1.5 align-top">
      <span className={`block max-w-[11rem] truncate rounded-md px-1.5 py-0.5 font-mono text-[11px] ${cls}`} title={value}>
        {value === "" ? " " : value}
      </span>
    </td>
  );
}

function DemoTable({ caption, headers, rows, tone }: { caption: string; headers: string[]; rows: (string | { v: string; tone?: "fixed" | "error" | "warning" })[][]; tone: "before" | "after" }) {
  return (
    <figure className="min-w-0">
      <figcaption className={`mb-2 text-xs font-bold uppercase tracking-widest ${tone === "before" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-green-400"}`}>{caption}</figcaption>
      {/* Focusable so keyboard users can scroll the table sideways. */}
      <div tabIndex={0} role="region" aria-label={caption} className={`overflow-x-auto rounded-2xl border bg-[var(--surface)] ${tone === "after" ? "border-[rgba(var(--accent-rgb),0.45)] shadow-[0_18px_40px_-24px_rgba(var(--accent-rgb),0.7)]" : "border-[var(--border)]"}`}>
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold text-[var(--muted)]">
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
  // Written guides first; a platform with few of them is topped up with its blocking-issue guides.
  const platformGuides = getGuidesByPlatform(p.guidePlatform);
  const guides = [
    ...platformGuides.filter((g) => g.kind === "curated"),
    ...platformGuides.filter((g) => g.kind === "issue" && g.blocking && g.checkedByFixer),
  ]
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

  const stats: [number, string][] = [
    [checks.length, L.statChecks],
    [blockers.length, L.statBlockers],
    [demo?.result.fixesApplied.length ?? 0, L.statFixes],
  ];
  const wrap = "mx-auto max-w-6xl px-4 sm:px-6";
  // Some languages' link text already ends in an arrow; add exactly one.
  const arrow = (text: string) => `${text.replace(/\s*→\s*$/, "")} →`;

  return (
    <main className="overflow-x-clip">
      <JsonLd data={jsonLd} />
      <FAQJsonLd items={p.faq.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* Hero: glow, bubbles, and the stats as round "bubbles" */}
      <div className="hero-glow relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="orb orb-teal -left-24 -top-24 h-[380px] w-[380px]" />
          <span className="orb orb-indigo slow -right-32 top-10 h-[420px] w-[420px]" />
          <span className="bubble left-[44%] top-[16%] hidden h-8 w-8 md:block" />
          <span className="bubble left-[6%] top-[78%] h-6 w-6" style={{ animationDelay: "-3s" }} />
        </div>
        <section className={`${wrap} relative grid gap-12 pb-16 pt-14 sm:pt-20 md:grid-cols-[minmax(0,1fr)_360px] md:items-center`}>
          <div className="min-w-0">
            <p className={`glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${p.accent.text}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
              {p.kicker}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--text)] sm:text-6xl">{p.title}</h1>
            <p className={`mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 ${muted}`}>{p.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link className="btn-primary rounded-full px-7 py-3.5 text-base shadow-[0_12px_30px_-12px_rgba(var(--accent-rgb),0.8)]" href={fixerHref}>
                {arrow(L.checkFree)}
              </Link>
              <Link className="rgb-btn rounded-full px-7 py-3.5 text-base" href={sampleHref}>
                {L.downloadSample}
              </Link>
            </div>
            <p className={`mt-5 text-xs ${muted}`}>{fmt(L.trustLine, { count: FREE_EXPORTS_PER_MONTH })}</p>
          </div>

          {/* Three round stats, different sizes, overlapping like bubbles */}
          <dl className="relative mx-auto h-[300px] w-[320px] md:h-[340px] md:w-[360px]">
            <span aria-hidden="true" className="absolute inset-6 rounded-full border border-dashed border-[rgba(var(--accent-rgb),0.3)]" />
            {stats.map(([n, label], i) => {
              const pos = ["left-0 top-4 h-44 w-44", "right-0 top-24 h-36 w-36", "bottom-0 left-16 h-32 w-32"][i];
              return (
                <div key={label} className={`glass float-chip absolute flex flex-col items-center justify-center rounded-full p-4 text-center shadow-[0_18px_40px_-20px_rgba(var(--secondary-rgb),0.6)] ${pos} ${i === 1 ? "delay-1" : i === 2 ? "delay-2" : ""}`}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className={`block font-extrabold leading-none ${p.accent.text} ${i === 0 ? "text-5xl" : "text-4xl"}`}>{n}</span>
                    <span className={`mt-1.5 block text-[11px] leading-4 ${muted}`}>{label}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      {/* Live before / after, on a curved panel */}
      {demo && (
        <section className={`${wrap} pb-20`}>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
            <span aria-hidden="true" className="orb orb-teal -right-24 -top-28 h-80 w-80" />
            <span aria-hidden="true" className="absolute left-6 top-6 h-9 w-9 border-l-[3px] border-t-[3px] border-[var(--accent)] opacity-60" />
            <span aria-hidden="true" className="absolute bottom-6 right-6 h-9 w-9 border-b-[3px] border-r-[3px] border-[var(--secondary)] opacity-60" />
            <div className="relative">
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">{L.demoTitle}</h2>
              <p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>{fmt(L.demoIntro, { kind: p.kicker })}</p>
              <div className="mt-7 grid gap-5 lg:grid-cols-2">
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
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.06)] p-5">
                  <h3 className="text-sm font-bold text-[var(--accent-text)]">{fmt(L.fixedAuto, { count: demo.result.fixesApplied.length })}</h3>
                  <ul className={`mt-2 space-y-1.5 text-sm ${muted}`}>
                    {demo.result.fixesApplied.slice(0, 6).map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        {vt.msg(f)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0 rounded-2xl border border-red-400/30 bg-red-500/5 p-5">
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(L.leftForYou, { count: demo.problems.length })}</h3>
                  <ul className={`mt-2 space-y-1.5 text-sm ${muted}`}>
                    {demo.problems.slice(0, 6).map((i) => (
                      <li key={`${i.code}-${i.rowIndex}`} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
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
            </div>
          </div>
        </section>
      )}

      {/* Platform specifics: staggered cards with big gradient numbers */}
      <section className={`${wrap} pb-20`}>
        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">{fmt(L.gotchasTitle, { kind: p.kicker })}</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3 md:items-start">
          {p.gotchas.map((g, i) => (
            <li key={g.title} className={`lift relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 ${i === 1 ? "md:mt-10" : i === 2 ? "md:mt-20" : ""}`}>
              <span aria-hidden="true" className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.16),transparent_70%)]" />
              <span aria-hidden="true" className="relative block bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] bg-clip-text text-5xl font-extrabold text-transparent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="relative mt-3 text-base font-bold text-[var(--text)]">{g.title}</h3>
              <p className={`relative mt-2 text-sm leading-6 ${muted}`}>{g.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* How to use (a timeline) + the blockers (a cloud of pills) */}
      <section className={`${wrap} grid gap-6 pb-20 md:grid-cols-2`}>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">{L.howTitle}</h2>
          <ol className="relative mt-6 space-y-6">
            <span aria-hidden="true" className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-[var(--accent)] to-[var(--secondary)]" />
            {[
              p.exportTip,
              <>
                <Link className="font-semibold text-[var(--text)] hover:underline" href={fixerHref}>
                  {L.howOpen}
                </Link>
                {/* Japanese and Chinese don't put spaces between words. */}
                {locale === "ja" || locale === "zh" ? "" : " "}
                {L.howOpenRest}
              </>,
              L.howWork,
              L.howExport,
            ].map((step, i) => (
              <li key={i} className="relative flex gap-4">
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--on-primary)] shadow-[0_0_0_5px_var(--surface)]">
                  {i + 1}
                </span>
                <span className={`pt-1 text-sm leading-6 ${muted}`}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <span aria-hidden="true" className="orb orb-indigo -bottom-24 -right-20 h-64 w-64" />
          <h2 className="relative text-xl font-extrabold tracking-tight text-[var(--text)]">{L.blockersTitle}</h2>
          <ul className="relative mt-6 flex flex-wrap gap-2">
            {blockers.slice(0, 10).map((m) => (
              <li key={m.code}>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                  href={href(`/guides/${p.guidePlatform}/${issueCodeToSlug(m.code)}`)}
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {m.title}
                  {m.autoFixable && <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] font-semibold text-[var(--accent-text)]">{L.autoFix}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link className={`relative mt-6 inline-block text-sm font-semibold ${p.accent.text} hover:underline`} href={href(`/presets/${p.presetId}`)}>
            {arrow(fmt(L.seeAllChecks, { count: checks.length }))}
          </Link>
        </div>
      </section>

      {/* Questions + guides */}
      <section className={`${wrap} grid gap-6 pb-20 md:grid-cols-2`}>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">{L.questions}</h2>
          <div className="mt-5 divide-y divide-[var(--border)]">
            {p.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--text)]">
                  {f.q}
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className={`mt-2 text-sm leading-6 ${muted}`}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">{L.guidesTitle}</h2>
          <ul className="mt-5 space-y-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link className="group block rounded-2xl p-3 transition-colors hover:bg-[var(--surface-2)]" href={href(`/guides/${g.platform}/${g.slug}`)}>
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--text)]">
                    {g.title}
                    <span aria-hidden="true" className="text-[var(--accent-text)] transition-transform group-hover:translate-x-1">→</span>
                  </span>
                  <span className={`mt-0.5 line-clamp-2 block text-xs ${muted}`}>{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className={`mt-4 inline-block text-sm font-semibold ${p.accent.text} hover:underline`} href={href(`/guides/${p.guidePlatform}`)}>
            {arrow(fmt(L.allGuides, { platform: platformLabel(t, p.guidePlatform) }))}
          </Link>
        </div>
      </section>

      {/* Related: pill cards with a glow on hover */}
      <nav className={`${wrap} pb-24`} aria-label={L.otherFixers}>
        <h2 className={`text-xs font-bold uppercase tracking-widest ${muted}`}>{L.otherFixers}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {p.related.map((r) => {
            const o = landings[r];
            return (
              <li key={r}>
                <Link href={href(o.path)} className="lift group flex items-center justify-between gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] py-3 pl-5 pr-3">
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold ${o.accent.text}`}>{o.kicker}</span>
                    <span className="block truncate text-sm font-bold text-[var(--text)]">{o.title}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
