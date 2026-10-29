// src/views/howItWorks.tsx
// /how-it-works: a screenshot walkthrough of the CSV Fixer, shared by the English and
// /[locale] routes. Text comes from the "howItWorks" block of src/i18n/pages/<locale>.json.
// The screenshots (public/screens, made by scripts/capture-screens.mjs) are in English;
// their numbered markers match the numbered notes under each one.

import type { Metadata } from "next";
import Link from "next/link";

import en from "@/i18n/pages/en.json";
import JsonLd from "@/components/JsonLd";
import { Screenshot, type ScreenName } from "@/components/ui/Screenshot";
import { fmt } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import { pageAlternates, SITE_URL } from "@/lib/i18n/seo";
import { FREE_ROWS_PER_EXPORT } from "@/lib/plans";
import { loadPages } from "@/views/infoPages";

type HowDict = (typeof en)["howItWorks"];

// One screenshot per step; the "-marked" ones carry numbered markers for the notes.
const STEP_SHOTS: { shot: ScreenName; numbered: boolean }[] = [
  { shot: "step-setup-marked", numbered: true },
  { shot: "step-review-marked", numbered: true },
  { shot: "step-issues-marked", numbered: true },
  { shot: "step-export", numbered: false },
];

const PATH = "/how-it-works";
const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary-text)]";
const lead = "text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8";

export async function howItWorksMetadata(locale: Locale = DEFAULT_LOCALE): Promise<Metadata> {
  const d = (await loadPages(locale)).howItWorks;
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    alternates: pageAlternates(locale, PATH),
    openGraph: { title: d.metaTitle, description: d.metaDescription, url: `${SITE_URL}${localeHref(locale, PATH)}` },
  };
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-text)]" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 10.5l3.2 3.2L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Same look as the markers drawn on the screenshots. */
function Marker({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-sm font-bold text-white" aria-hidden="true">
      {n}
    </span>
  );
}

export async function HowItWorksView({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const d: HowDict = (await loadPages(locale)).howItWorks;
  const href = (path: string) => localeHref(locale, path);
  const rows = (s: string) => fmt(s, { rows: FREE_ROWS_PER_EXPORT });

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: d.title,
          description: d.metaDescription,
          inLanguage: locale,
          step: d.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.desc,
            image: `${SITE_URL}/screens/${STEP_SHOTS[i].shot}.webp`,
          })),
        }}
      />

      <header className="mx-auto max-w-3xl px-4 pb-6 pt-16 text-center sm:px-6 sm:pt-20">
        <p className={eyebrow}>{d.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">{d.title}</h1>
        <p className={`mt-5 ${lead}`}>{d.intro}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={href("/app?preset=shopify_products")} className="btn-primary px-6 py-3 text-base">
            {d.ctaFixer}
          </Link>
          <a href="/samples/demo-products.csv" download className="rgb-btn px-6 py-3 text-base">
            {d.ctaDemo}
          </a>
        </div>
      </header>

      <ol className="mx-auto max-w-5xl space-y-24 px-4 py-16 sm:px-6">
        {d.steps.map((s, i) => {
          const { shot, numbered } = STEP_SHOTS[i];
          return (
            <li key={s.title}>
              <div className="max-w-3xl">
                <p className={eyebrow}>{fmt(d.stepLabel, { n: i + 1 })}</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">{s.title}</h2>
                <p className={`mt-3 ${lead}`}>{s.desc}</p>
              </div>
              <Screenshot name={shot} alt={s.alt} className="mt-8" />
              <ul className="mt-8 grid gap-6 md:grid-cols-3">
                {s.notes.map((note, j) => (
                  <li key={j} className="flex gap-3 text-sm leading-6 text-[var(--text)]">
                    {numbered ? <Marker n={j + 1} /> : <Check />}
                    <span>{rows(note)}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className={eyebrow}>{d.convertLabel}</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">{d.convertTitle}</h2>
            <p className={`mt-4 ${lead}`}>{d.convertDesc}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={href("/convert")} className="btn-primary px-5 py-2.5">
                {d.ctaConverter}
              </Link>
              {/* The migration guides are English-only. */}
              <Link href="/migrate" className="text-sm font-semibold text-[var(--secondary-text)] hover:underline">
                {d.ctaMigrations} →
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <Screenshot name="convert" alt={d.convertAlt} frame={false} sizes="(min-width: 1024px) 640px, 100vw" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">{d.tipsTitle}</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {d.tips.map((tip) => (
            <li key={tip.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="text-base font-semibold text-[var(--text)]">{tip.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{rows(tip.desc)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">{d.finalTitle}</h2>
        <p className={`mt-4 ${lead}`}>{d.finalDesc}</p>
        <Link href={href("/app?preset=shopify_products")} className="btn-primary mt-8 px-6 py-3 text-base">
          {d.ctaFixer}
        </Link>
      </section>
    </main>
  );
}
