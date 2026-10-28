// src/lib/i18n/paths.ts
// Which pages exist under /<locale>/..., and how to move between languages.

import { DEFAULT_LOCALE, isValidLocale, localeHref, type Locale } from "@/lib/i18n/locales";

/** Page groups that have a /<locale>/ version. Other pages are English-only. */
export const LOCALISED_PREFIXES = [
  "/guides",
  "/app",
  "/convert",
  "/merge",
  "/csv-inspector",
  "/profile",
  "/presets",
  "/shopify-csv-fixer",
  "/woocommerce-csv-fixer",
  "/woocommerce-variable-csv-fixer",
  "/etsy-csv-fixer",
  "/ebay-csv-fixer",
  "/ebay-variations-csv-fixer",
  "/amazon-csv-fixer",
];

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocalisedPath(pathname: string): boolean {
  return pathname === "/" || LOCALISED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Split "/de/app" into { locale: "de", path: "/app" }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const seg = pathname.split("/")[1] ?? "";
  if (isValidLocale(seg) && seg !== DEFAULT_LOCALE) {
    return { locale: seg, path: pathname.slice(seg.length + 1) || "/" };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/** The same page in another language (or that language's home page if it has none). */
export function pathInLocale(pathname: string, target: Locale): string {
  const { path } = splitLocale(pathname);
  return localeHref(target, isLocalisedPath(path) ? path : "/");
}

/** Remember the visitor's language (read by the proxy to redirect localisable pages). */
export function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}
