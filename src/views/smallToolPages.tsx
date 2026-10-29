// src/views/smallToolPages.tsx
// /tools (index) and /tools/<slug>: the free single-purpose tools, at /<path> (English)
// and /<locale>/<path>. Each page is the tool itself, then how it works and a short FAQ.

import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import FAQJsonLd from "@/components/FAQJsonLd";
import JsonLd from "@/components/JsonLd";
import { getTranslations, type Translations } from "@/lib/i18n/getTranslations";
import { localeHref, type Locale } from "@/lib/i18n/locales";
import { pageAlternates, SITE_URL } from "@/lib/i18n/seo";
import { SMALL_TOOLS, smallToolBySlug, type SmallToolKey } from "@/lib/tools/registry";
import BarcodeClient from "@/app/tools/clients/BarcodeClient";
import DedupeClient from "@/app/tools/clients/DedupeClient";
import EncodingClient from "@/app/tools/clients/EncodingClient";
import ExcelClient from "@/app/tools/clients/ExcelClient";
import HandleClient from "@/app/tools/clients/HandleClient";
import SplitClient from "@/app/tools/clients/SplitClient";

type ToolStrings = Translations["smallTools"];

const CLIENTS: Record<SmallToolKey, ComponentType<{ t: ToolStrings }>> = {
  split: SplitClient,
  dedupe: DedupeClient,
  encoding: EncodingClient,
  barcodes: BarcodeClient,
  excel: ExcelClient,
  handles: HandleClient,
};

const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary-text)]";

export async function smallToolsIndexMetadata(locale: Locale): Promise<Metadata> {
  const t = (await getTranslations(locale)).smallTools;
  const url = `${SITE_URL}${localeHref(locale, "/tools")}`;
  return {
    title: t.indexMetaTitle,
    description: t.indexDescription,
    alternates: pageAlternates(locale, "/tools"),
    openGraph: { title: t.indexMetaTitle, description: t.indexDescription, url, locale },
  };
}

export async function smallToolMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const tool = smallToolBySlug(slug);
  if (!tool) return {};
  const s = (await getTranslations(locale)).smallTools.tools[tool.key];
  const path = `/tools/${slug}`;
  return {
    title: s.metaTitle,
    description: s.description,
    alternates: pageAlternates(locale, path),
    openGraph: { title: s.metaTitle, description: s.description, url: `${SITE_URL}${localeHref(locale, path)}`, locale },
  };
}

function ToolCard({ href, name, desc, cta }: { href: string; name: string; desc: string; cta: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--accent)]"
    >
      <h3 className="text-base font-semibold text-[var(--text)]">{name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">{desc}</p>
      <span className="mt-4 text-sm font-semibold text-[var(--accent-text)]">
        {cta} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export async function SmallToolsIndexView({ locale }: { locale: Locale }) {
  const tr = await getTranslations(locale);
  const t = tr.smallTools;
  const href = (p: string) => localeHref(locale, p);
  const full = [
    { path: "/app", name: tr.nav.csvFixer, desc: tr.app.subtitle },
    { path: "/convert", name: tr.nav.formatConverter, desc: tr.convert.description },
    { path: "/merge", name: tr.nav.csvMerger, desc: tr.merge.description },
    { path: "/csv-inspector", name: tr.nav.csvInspector, desc: tr.inspector.description },
  ];
  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="max-w-3xl">
        <p className={eyebrow}>{t.badge}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">{t.indexTitle}</h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">{t.indexIntro}</p>
      </header>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-[var(--text)]">{t.quickTitle}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SMALL_TOOLS.map(({ slug, key }) => (
            <ToolCard key={slug} href={href(`/tools/${slug}`)} name={t.tools[key].name} desc={t.tools[key].intro} cta={t.open} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold text-[var(--text)]">{t.fullTitle}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {full.map((x) => (
            <ToolCard key={x.path} href={href(x.path)} name={x.name} desc={x.desc} cta={t.open} />
          ))}
        </div>
      </section>
    </main>
  );
}

export async function SmallToolView({ locale, slug }: { locale: Locale; slug: string }) {
  const tool = smallToolBySlug(slug)!;
  const t = (await getTranslations(locale)).smallTools;
  const s = t.tools[tool.key];
  const href = (p: string) => localeHref(locale, p);
  const Client = CLIENTS[tool.key];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: s.name,
          description: s.description,
          url: `${SITE_URL}${href(`/tools/${slug}`)}`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: locale,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
      <FAQJsonLd items={s.faq.map((f) => ({ question: f.q, answer: f.a }))} />

      <nav className="text-sm text-[var(--muted)]" aria-label="Breadcrumb">
        <Link href={href("/tools")} className="hover:underline">
          {t.indexTitle}
        </Link>{" "}
        / <span className="text-[var(--text)]">{s.name}</span>
      </nav>

      <header className="mt-5 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">{s.name}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)] sm:text-lg">{s.intro}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--secondary-text)]">{t.badge}</p>
      </header>

      <div className="mt-8">
        <Client t={t} />
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">{t.howTitle}</h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {s.steps.map((step, i) => (
            <li key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-text)]">{i + 1}</span>
              <p className="mt-3 text-sm leading-6 text-[var(--text)]">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">{t.faqTitle}</h2>
        <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {s.faq.map((f) => (
            <div key={f.q} className="py-5">
              <h3 className="text-base font-semibold text-[var(--text)]">{f.q}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold text-[var(--text)]">{t.relatedTitle}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SMALL_TOOLS.filter((x) => x.slug !== slug).map((x) => (
            <ToolCard key={x.slug} href={href(`/tools/${x.slug}`)} name={t.tools[x.key].name} desc={t.tools[x.key].intro} cta={t.open} />
          ))}
        </div>
      </section>
    </main>
  );
}
