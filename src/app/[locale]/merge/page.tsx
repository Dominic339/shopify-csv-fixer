// src/app/[locale]/merge/page.tsx
// Locale-prefixed CSV Merger page (e.g. /es/merge, /de/merge).

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import MergeClient from "@/app/merge/MergeClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/locales";

type Props = { params: Promise<{ locale: string }> };

export async function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const t = await getTranslations(locale as Locale);
  return {
    title: t.merge.title,
    alternates: { canonical: localeHref(locale as Locale, "/merge") },
  };
}

export default async function LocaleMergePage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const t = await getTranslations(locale as Locale);

  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10">Loading…</div>}>
      <MergeClient t={t.merge} />
    </Suspense>
  );
}
