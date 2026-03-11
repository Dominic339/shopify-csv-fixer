// src/app/[locale]/layout.tsx
// Layout for all non-English locale routes (e.g. /es/, /de/, /fr/).
// Validates the locale param — calls notFound() for unknown values.
// Sets the html lang attribute and generates hreflang metadata.

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LOCALES, DEFAULT_LOCALE, isValidLocale, localeHref } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import LangUpdater from "@/components/i18n/LangUpdater";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  // Pre-render all non-English locale segments at build time.
  // /en/* is handled by a redirect in middleware → not needed here.
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) return {};

  // Build hreflang map for all locales
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = l === DEFAULT_LOCALE
      ? "https://striveformats.com"
      : `https://striveformats.com/${l}`;
  }
  languages["x-default"] = "https://striveformats.com";

  return {
    alternates: {
      canonical: localeHref(locale as Locale),
      languages,
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Reject unknown or English-that-should-have-been-redirected locale values
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) {
    notFound();
  }

  return (
    <>
      {/* Client component: updates document.documentElement.lang for accessibility */}
      <LangUpdater locale={locale as Locale} />
      {children}
    </>
  );
}
