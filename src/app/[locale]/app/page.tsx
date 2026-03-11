// src/app/[locale]/app/page.tsx
// Locale-prefixed CSV Fixer page (e.g. /es/app, /de/app).
// Re-uses the same AppClient — locale is read from route params.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import AppClient from "@/app/app/AppClient";
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
    title: t.app.title,
    alternates: { canonical: localeHref(locale as Locale, "/app") },
  };
}

export default async function LocaleAppPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const t = await getTranslations(locale as Locale);

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10">Loading…</div>}>
      <AppClient tApp={t.app} />
    </Suspense>
  );
}
