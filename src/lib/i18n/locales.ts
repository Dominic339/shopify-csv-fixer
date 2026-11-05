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
/**
 * Pages that exist only in English for now (no /<locale>/ copy): links to them from a
 * translated page go to the English page, and the language switcher and the proxy's
 * language redirect leave them alone.
 */
export const ENGLISH_ONLY_PATHS = ["/tiktok-catalog-feed-checker", "/guides/tiktok"];

/** True for an English-only page (the path may carry a query string or hash). */
export function isEnglishOnlyPath(path: string): boolean {
  const bare = path.split(/[?#]/)[0];
  return ENGLISH_ONLY_PATHS.some((p) => bare === p || bare.startsWith(p + "/"));
}

export function localeHref(locale: Locale, path = ""): string {
  const norm = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE || isEnglishOnlyPath(norm)) return norm || "/";
  return norm === "/" ? `/${locale}` : `/${locale}${norm}`;
}

/**
 * The best supported locale for a browser's language preferences: an Accept-Language
 * header ("ru-RU,ru;q=0.9,en;q=0.8") or a list like navigator.languages. Regional
 * variants match their base language (pt-BR → pt, zh-TW → zh). Null if none match.
 */
export function pickLocale(preferences: string | readonly string[] | null | undefined): Locale | null {
  if (!preferences) return null;
  const entries =
    typeof preferences === "string"
      ? preferences.split(",").map((part, i) => {
          const [tag, ...params] = part.trim().split(";");
          const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
          return { tag, q: q ? Number(q.slice(2)) : 1, i };
        })
      : preferences.map((tag, i) => ({ tag, q: 1, i }));
  const ranked = entries.filter((e) => e.tag && e.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const base = tag.toLowerCase().split("-")[0];
    if (isValidLocale(base)) return base;
  }
  return null;
}
