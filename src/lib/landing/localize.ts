// Platform landing pages in other languages: the text fields of PLATFORM_LANDINGS from
// src/i18n/landing/<locale>.json, one chunk per language. Missing fields fall back to English.

import type { Locale } from "@/lib/i18n/locales";
import { PLATFORM_LANDINGS, type LandingSlug, type PlatformLanding } from "@/lib/landing/platforms";

export type LandingTextFields = "metaTitle" | "metaDescription" | "kicker" | "title" | "intro" | "exportTip" | "gotchas" | "faq";
export type LandingText = Partial<Pick<PlatformLanding, LandingTextFields>>;
export type LandingDict = Partial<Record<LandingSlug, LandingText>>;

const LANDING_LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: LandingDict }>> = {
  es: () => import("@/i18n/landing/es.json"),
  de: () => import("@/i18n/landing/de.json"),
  fr: () => import("@/i18n/landing/fr.json"),
  pt: () => import("@/i18n/landing/pt.json"),
  it: () => import("@/i18n/landing/it.json"),
  nl: () => import("@/i18n/landing/nl.json"),
  pl: () => import("@/i18n/landing/pl.json"),
  tr: () => import("@/i18n/landing/tr.json"),
  ru: () => import("@/i18n/landing/ru.json"),
  ja: () => import("@/i18n/landing/ja.json"),
  ko: () => import("@/i18n/landing/ko.json"),
  zh: () => import("@/i18n/landing/zh.json"),
};

/** Every landing page in one language (English text where a translation is missing). */
export async function localizedLandings(locale: Locale): Promise<Record<LandingSlug, PlatformLanding>> {
  if (locale === "en") return PLATFORM_LANDINGS;
  const dict = (await LANDING_LOADERS[locale]()).default;
  const out = {} as Record<LandingSlug, PlatformLanding>;
  for (const [slug, p] of Object.entries(PLATFORM_LANDINGS) as [LandingSlug, PlatformLanding][]) {
    const t = dict[slug] ?? {};
    out[slug] = {
      ...p,
      ...Object.fromEntries(Object.entries(t).filter(([, v]) => (Array.isArray(v) ? v.length : v))),
    };
  }
  return out;
}
