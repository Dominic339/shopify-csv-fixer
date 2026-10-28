// src/views/localeRoute.ts
// Helpers shared by every /[locale]/... route.

import { DEFAULT_LOCALE, isValidLocale, LOCALES, type Locale } from "@/lib/i18n/locales";

export type LocaleParams = { params: Promise<{ locale: string }> };

/** Every non-English locale (English lives at the un-prefixed URLs). */
export function localeParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

/** The route's locale, or null for unknown values and "en" (served without a prefix). */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale | null> {
  const { locale } = await params;
  return isValidLocale(locale) && locale !== DEFAULT_LOCALE ? locale : null;
}
