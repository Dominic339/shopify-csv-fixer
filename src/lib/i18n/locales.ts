// src/lib/i18n/locales.ts
// Single source of truth for supported locales.

export const LOCALES = [
  "en",
  "es",
  "de",
  "fr",
  "pt",
  "it",
  "nl",
  "pl",
  "tr",
  "ru",
  "ja",
  "ko",
  "zh",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  tr: "Türkçe",
  ru: "Русский",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

export function isValidLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Returns the canonical URL for a locale.
 *  English uses the root; all others use /<locale>/...
 */
export function localeHref(locale: Locale, path = ""): string {
  const norm = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return norm || "/";
  return `/${locale}${norm}`;
}
