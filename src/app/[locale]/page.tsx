// src/app/[locale]/page.tsx
// Localized home page for non-English locales (e.g. /es/, /de/).
// Renders the full HomeClient so the design matches the English home page.

import type { Metadata } from "next";

import { isValidLocale, LOCALES, DEFAULT_LOCALE, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { notFound } from "next/navigation";
import HomeClient from "@/app/HomeClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const t = await getTranslations(locale as Locale);

  // Build hreflang languages map
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = l === DEFAULT_LOCALE
      ? "https://striveformats.com"
      : `https://striveformats.com/${l}`;
  }
  languages["x-default"] = "https://striveformats.com";

  return {
    title: t.home.title,
    description: t.home.description,
    alternates: {
      canonical: localeHref(locale as Locale),
      languages,
    },
  };
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  return <HomeClient />;
}
