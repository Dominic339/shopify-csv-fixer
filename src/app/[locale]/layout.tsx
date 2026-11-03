// src/app/[locale]/layout.tsx
// Root layout for all non-English locale routes (e.g. /es/, /de/, /fr/), so each page is
// served with the right <html lang>. Unknown locale values get a 404.

import { notFound } from "next/navigation";

import { RootDocument, rootMetadata } from "@/components/layout/RootDocument";
import { DEFAULT_LOCALE, isValidLocale } from "@/lib/i18n/locales";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export { localeParams as generateStaticParams } from "@/views/localeRoute";
// Only the generated locales exist; anything else (e.g. /nope) goes to app/global-not-found.tsx.
export const dynamicParams = false;

// Each page sets its own canonical and hreflang alternates (see src/lib/i18n/seo.ts).
export const metadata = rootMetadata;

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Reject unknown or English-that-should-have-been-redirected locale values
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) {
    notFound();
  }

  return <RootDocument lang={locale}>{children}</RootDocument>;
}
