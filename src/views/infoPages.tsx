// About, privacy and terms pages, shared by the English and /[locale] routes.
// Text comes from src/i18n/pages/<locale>.json (English is the source).

import type { Metadata } from "next";
import Link from "next/link";
import en from "@/i18n/pages/en.json";
import { localizedLandings } from "@/lib/landing/localize";
import { FREE_EXPORTS_PER_MONTH } from "@/lib/plans";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { fmt } from "@/lib/i18n/getTranslations";
import { DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import { pageAlternates } from "@/lib/i18n/seo";

type PagesDict = typeof en;
type InfoPage = "about" | "privacy" | "terms";

const PAGES_LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: PagesDict }>> = {
  es: () => import("@/i18n/pages/es.json"),
  de: () => import("@/i18n/pages/de.json"),
  fr: () => import("@/i18n/pages/fr.json"),
  pt: () => import("@/i18n/pages/pt.json"),
  it: () => import("@/i18n/pages/it.json"),
  nl: () => import("@/i18n/pages/nl.json"),
  pl: () => import("@/i18n/pages/pl.json"),
  tr: () => import("@/i18n/pages/tr.json"),
  ru: () => import("@/i18n/pages/ru.json"),
  ja: () => import("@/i18n/pages/ja.json"),
  ko: () => import("@/i18n/pages/ko.json"),
  zh: () => import("@/i18n/pages/zh.json"),
};

export async function loadPages(locale: Locale): Promise<PagesDict> {
  return locale === "en" ? en : (await PAGES_LOADERS[locale]()).default;
}

const PATHS: Record<InfoPage, string> = { about: "/about", privacy: "/privacy", terms: "/terms" };

export async function infoPageMetadata(page: InfoPage, locale: Locale = DEFAULT_LOCALE): Promise<Metadata> {
  const d = (await loadPages(locale))[page];
  // "About StriveFormats" already names the brand, so skip the layout's "%s | StriveFormats".
  const title = d.metaTitle.includes("StriveFormats") ? { absolute: d.metaTitle } : d.metaTitle;
  return { title, description: d.metaDescription, alternates: pageAlternates(locale, PATHS[page]) };
}

const card = "min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7";
const muted = "text-[color:rgba(var(--muted-rgb),1)]";

const TOOL_HREFS: Record<keyof PagesDict["about"]["tools"], string> = {
  app: "/app",
  inspector: "/csv-inspector",
  convert: "/convert",
  merge: "/merge",
  formats: "/formats",
};

export async function AboutView({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const [{ about: d }, landings] = await Promise.all([loadPages(locale), localizedLandings(locale)]);
  const href = (path: string) => localeHref(locale, path);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">{d.title}</h1>
        <p className={`mt-4 text-base leading-7 ${muted}`}>{d.intro}</p>
      </header>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-bold text-[var(--text)]">{d.whyTitle}</h2>
        <div className={`mt-3 space-y-3 text-sm leading-7 ${muted}`}>
          {d.why.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-bold text-[var(--text)]">{d.runTitle}</h2>
        <ul className={`mt-3 space-y-2 text-sm leading-6 ${muted}`}>
          {d.run.map((r) => (
            <li key={r.lead}>
              <span className="font-semibold text-[var(--text)]">{r.lead}</span> {fmt(r.text, { count: FREE_EXPORTS_PER_MONTH })}
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-bold text-[var(--text)]">{d.whereTitle}</h2>
        <dl className="mt-4 divide-y divide-[var(--border)]">
          {d.dataFlow.map((x) => (
            <div key={x.what} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-4">
              <dt className="text-sm font-semibold text-[var(--text)]">{x.what}</dt>
              <dd className={`text-sm ${muted}`}>{x.where}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-3 text-xs ${muted}`}>
          {d.detailsBefore}
          {/* Japanese and Chinese don't put spaces between words. */}
          {locale === "ja" || locale === "zh" ? "" : " "}
          <Link className="underline" href={href("/privacy")}>
            {d.detailsLink}
          </Link>
          {d.detailsAfter}
        </p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-bold text-[var(--text)]">{d.platformsTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.values(landings).map((p) => (
              <li key={p.slug}>
                <Link className="text-[var(--text)] hover:underline" href={href(p.path)}>
                  <span className={`font-semibold ${p.accent.text}`}>{p.kicker}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="text-xl font-bold text-[var(--text)]">{d.toolsTitle}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(Object.keys(TOOL_HREFS) as (keyof typeof TOOL_HREFS)[]).map((k) => (
              <li key={k}>
                {/* Custom formats are English-only. */}
                <Link className="font-semibold text-[var(--text)] hover:underline" href={k === "formats" ? TOOL_HREFS[k] : href(TOOL_HREFS[k])}>
                  {d.tools[k].name}
                </Link>
                <p className={`text-xs ${muted}`}>{d.tools[k].desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

/** Replace "{email}" in a paragraph with a link to the support address. */
function withEmail(text: string) {
  const parts = text.split("{email}");
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} className="font-medium text-[var(--secondary-text)] underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>,
          part,
        ],
  );
}

/** Privacy policy and terms: a title, an intro and titled sections of paragraphs. */
export async function PolicyView({ page, locale = DEFAULT_LOCALE }: { page: "privacy" | "terms"; locale?: Locale }) {
  const dict = await loadPages(locale);
  const d = dict[page];
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-[var(--text)]">{d.title}</h1>
      {dict.translationNote && (
        <p className={`mt-3 text-xs ${muted}`}>
          {dict.translationNote}{" "}
          <Link className="underline" href={PATHS[page]} hrefLang="en">
            English
          </Link>
        </p>
      )}
      <p className={`mt-4 text-sm leading-7 ${muted}`}>{d.intro}</p>
      {d.sections.map((s) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-xl font-semibold text-[var(--text)]">{s.title}</h2>
          <div className={`mt-2 space-y-2 text-sm leading-7 ${muted}`}>
            {s.paras.map((p, i) => (
              <p key={i}>{withEmail(p)}</p>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
