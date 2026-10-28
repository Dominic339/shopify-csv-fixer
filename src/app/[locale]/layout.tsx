// src/app/[locale]/layout.tsx
// Layout for all non-English locale routes (e.g. /es/, /de/, /fr/).
// Validates the locale param — calls notFound() for unknown values.
// Sets the html lang attribute (client side; the root layout renders lang="en").

import { notFound } from "next/navigation";

import { DEFAULT_LOCALE, isValidLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import LangUpdater from "@/components/i18n/LangUpdater";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export { localeParams as generateStaticParams } from "@/views/localeRoute";

// Each page sets its own canonical and hreflang alternates (see src/lib/i18n/seo.ts).

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
