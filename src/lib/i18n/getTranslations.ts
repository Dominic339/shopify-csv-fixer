// src/lib/i18n/getTranslations.ts
// Server-side translation loader. Reads locale JSON files at build time.
// Falls back to English for any missing locale.

import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";

export type Translations = {
  nav: {
    csvFixer: string;
    templates: string;
    guides: string;
    customFormats: string;
    darkMode: string;
    lightMode: string;
    signIn: string;
    signOut: string;
    pricing: string;
    home: string;
    profile: string;
    upgrade: string;
    notSignedIn: string;
    plan: string;
    active: string;
  };
  guide: {
    whatYouLearn: string;
    bestFor: string;
    timeToComplete: string;
    lastUpdated: string;
    openCsvFixer: string;
    viewTemplates: string;
    needHelp: string;
    uploadDescription: string;
    relatedGuides: string;
    autoFix: string;
    importBlocker: string;
    importBlockerNote: string;
    autoFixable: string;
    updated: string;
  };
  guides: {
    title: string;
    description: string;
    browseByPlatform: string;
    featuredGuides: string;
    searchResults: string;
    noResults: string;
    results: string;
    result: string;
    guideLabel: string;
    includesFixer: string;
    guidesCount: string;
    guideCount: string;
    needHelp: string;
    needHelpDesc: string;
    browseTemplates: string;
    searchPlaceholder: string;
  };
  common: {
    openWithPreset: string;
    viewInformation: string;
    downloadSample: string;
    browseAllGuides: string;
    popularGuides: string;
    popularGuidesDesc: string;
    platformFixers: string;
    platformFixersDesc: string;
  };
  home: {
    title: string;
    description: string;
  };
};

// Cache translations in memory across requests (module-level, server only)
const cache = new Map<string, Translations>();

export async function getTranslations(locale: Locale): Promise<Translations> {
  if (cache.has(locale)) return cache.get(locale)!;
  try {
    // Dynamic import — bundled at build time since locales are known
    const mod = await import(`@/i18n/${locale}.json`);
    const t = mod.default as Translations;
    cache.set(locale, t);
    return t;
  } catch {
    if (locale !== DEFAULT_LOCALE) {
      const fallback = await getTranslations(DEFAULT_LOCALE);
      cache.set(locale, fallback);
      return fallback;
    }
    throw new Error(`[i18n] Failed to load translations for default locale "${DEFAULT_LOCALE}"`);
  }
}
