// src/lib/i18n/seo.ts
// Canonical + hreflang alternates for a page that exists at /<path> (English) and
// /<locale>/<path> for every other locale.

import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, localeHref, type Locale } from "@/lib/i18n/locales";

export const SITE_URL = "https://striveformats.com";

/**
 * The share image for link previews. Pages that set their own openGraph must include it:
 * Next merges openGraph shallowly, so a page's openGraph replaces the inherited images.
 */
export const SHARE_IMAGES = [{ url: "/og.png", width: 1200, height: 630, alt: "StriveFormats" }];

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

// ── Search-result lengths ──────────────────────────────────────────────────
// Google shows roughly 60 characters of a title and 155 of a description before cutting them
// off. Chinese, Japanese and Korean characters are about twice as wide, so they count double.

const BRAND = "StriveFormats";
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

/** Display width: CJK and full-width characters count as 2. */
export function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 2 : 1;
  return w;
}

/**
 * A page title that fits search results: "main | extra… | StriveFormats". The brand goes first,
 * then extras from the end, until it fits; the main part is always kept whole. Descriptive words
 * help a search result more than the brand does.
 */
export function fitTitle(main: string, ...extras: (string | null | undefined)[]): string {
  const parts = [main, ...extras.filter((x): x is string => Boolean(x && x.trim()) && x !== BRAND)];
  for (let n = parts.length; n >= 1; n--) {
    for (const candidate of [[...parts.slice(0, n), BRAND], parts.slice(0, n)]) {
      const title = candidate.join(" | ");
      if (textWidth(title) <= TITLE_MAX) return title;
    }
  }
  // Still too long on its own: "Topic: details" keeps the topic.
  const head = main.split(/\s*[:：]\s+|\s+[–—]\s+/)[0];
  if (head !== main && textWidth(head) >= 15) return fitTitle(head, ...extras);
  return main;
}

/** fitTitle for a ready-made "A | B | StriveFormats" string (a leading brand is moved to the end). */
export function fitTitleString(full: string): string {
  const parts = full.split(" | ").map((x) => x.trim()).filter(Boolean);
  if (parts[0] === BRAND && parts.length > 1) parts.shift();
  return fitTitle(parts[0] ?? full, ...parts.slice(1));
}

/** Metadata title (absolute, so the "%s | StriveFormats" template doesn't add the brand again). */
export function seoTitle(main: string, ...extras: (string | null | undefined)[]): { absolute: string } {
  return { absolute: fitTitle(main, ...extras) };
}

/** A description that fits search results, cut at a sentence end, or else a word, with "…". */
export function fitDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (textWidth(clean) <= max) return clean;
  // Longest prefix within the width.
  let cut = "";
  for (const ch of clean) {
    if (textWidth(cut + ch) > max - 1) break;
    cut += ch;
  }
  const sentence = cut.match(/^.*[.!?。！？](?=\s|$)/u)?.[0];
  if (sentence && textWidth(sentence) >= max * 0.45) return sentence;
  const word = cut.replace(/[\s,;:、，]+\S*$/u, "");
  // CJK text has no spaces: cut at the width.
  return (word.length >= cut.length * 0.6 ? word : cut).replace(/[\s,;:、，.]+$/u, "") + "…";
}
