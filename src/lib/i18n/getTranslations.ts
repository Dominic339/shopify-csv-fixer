// src/lib/i18n/getTranslations.ts
// Server-side translation loader. Reads locale JSON files at build time.
// Falls back to English for any missing locale.

import type en from "@/i18n/en.json";
import type { Locale } from "./locales";
import { DEFAULT_LOCALE, LOCALES } from "./locales";
import { PLATFORM_LABEL, type GuidePlatform } from "@/lib/guidesConstants";

/** Shape of every locale file; en.json is the source of truth (other locales fall back to it). */
export type Translations = typeof en;

/** Optional per-preset localized names/descriptions: presets.name_<id> / presets.desc_<id>. */
export function presetText(t: Translations, presetId: string, field: "name" | "desc"): string | undefined {
  const value = (t.presets as Record<string, string>)[`${field}_${presetId}`];
  return typeof value === "string" && value ? value : undefined;
}

/** Platform names are brands, except "general", which is translated. */
export function platformLabel(t: Translations, platform: GuidePlatform): string;
export function platformLabel(t: Translations, platform: GuidePlatform | undefined): string | undefined;
export function platformLabel(t: Translations, platform: GuidePlatform | undefined): string | undefined {
  if (!platform) return undefined;
  return platform === "general" ? t.guides.categories.general : PLATFORM_LABEL[platform];
}

// Cache translations in memory across requests (module-level, server only)
const cache = new Map<string, Translations>();

async function load(locale: Locale): Promise<Translations | null> {
  try {
    const mod = await import(`@/i18n/${locale}.json`);
    return mod.default as Translations;
  } catch {
    return null;
  }
}

/** Fill any key missing from `partial` with the English value, at every depth. */
function withFallback<T>(partial: unknown, english: T): T {
  if (typeof english !== "object" || english === null) {
    return (typeof partial === typeof english ? partial : english) as T;
  }
  const src = (typeof partial === "object" && partial !== null ? partial : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  for (const [k, v] of Object.entries(english as Record<string, unknown>)) out[k] = withFallback(src[k], v);
  return out as T;
}

export async function getTranslations(locale: Locale): Promise<Translations> {
  const hit = cache.get(locale);
  if (hit) return hit;

  const english = await load(DEFAULT_LOCALE);
  if (!english) throw new Error(`[i18n] Failed to load translations for default locale "${DEFAULT_LOCALE}"`);

  const t = locale === DEFAULT_LOCALE ? english : withFallback(await load(locale), english);
  cache.set(locale, t);
  return t;
}

/** One section in every language, for client components on pages that pick the language at runtime. */
export async function sectionByLocale<K extends keyof Translations>(key: K): Promise<Record<Locale, Translations[K]>> {
  const entries = await Promise.all(LOCALES.map(async (l) => [l, (await getTranslations(l))[key]] as const));
  return Object.fromEntries(entries) as Record<Locale, Translations[K]>;
}

export { fmt } from "./fmt";
