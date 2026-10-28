// src/lib/i18n/seo.ts
// Canonical + hreflang alternates for a page that exists at /<path> (English) and
// /<locale>/<path> for every other locale.

import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/locales";

export const SITE_URL = "https://striveformats.com";

/**
 * @param translated  true when the page's main content is translated. Pages whose body is
 *   English everywhere (guides, preset write-ups) point localized copies at the English page
 *   as canonical and do not claim other-language versions.
 */
export function pageAlternates(locale: Locale, path: string, translated = true): Metadata["alternates"] {
  if (!translated) return { canonical: localeHref(DEFAULT_LOCALE, path) };

  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `${SITE_URL}${localeHref(l, path)}`;
  languages["x-default"] = `${SITE_URL}${localeHref(DEFAULT_LOCALE, path)}`;
  return { canonical: localeHref(locale, path), languages };
}

/** Localized href helper bound to a locale. */
export function hrefFor(locale: Locale) {
  return (path: string) => localeHref(locale, path);
}
