// src/lib/i18n/seo.ts
// Canonical + hreflang alternates for a page that exists at /<path> (English) and
// /<locale>/<path> for every other locale.

import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/locales";

export const SITE_URL = "https://striveformats.com";

/**
 * @param translated  true when the page's main content is translated (in every language, or
 *   in the listed ones). A localized copy whose body is still English points its canonical at
 *   the English page and claims no other-language versions; hreflang lists only languages
 *   that have the content.
 */
export function pageAlternates(locale: Locale, path: string, translated: boolean | readonly Locale[] = true): Metadata["alternates"] {
  const available = translated === true ? LOCALES : translated === false ? [DEFAULT_LOCALE] : [DEFAULT_LOCALE, ...translated];
  if (!available.includes(locale)) return { canonical: localeHref(DEFAULT_LOCALE, path) };
  if (available.length === 1) return { canonical: localeHref(locale, path) };

  const languages: Record<string, string> = {};
  for (const l of LOCALES) if (available.includes(l)) languages[l] = `${SITE_URL}${localeHref(l, path)}`;
  languages["x-default"] = `${SITE_URL}${localeHref(DEFAULT_LOCALE, path)}`;
  return { canonical: localeHref(locale, path), languages };
}

/** Localized href helper bound to a locale. */
export function hrefFor(locale: Locale) {
  return (path: string) => localeHref(locale, path);
}
