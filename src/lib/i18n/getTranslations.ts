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
    tools: string;
    formatConverter: string;
    csvMerger: string;
    csvInspector: string;
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
  toc: {
    onThisPage: string;
  };
  pricing: {
    free: string;
    basic: string;
    advanced: string;
    perMonth: string;
    yourPlan: string;
    startFree: string;
    subscribe: string;
    signInToSubscribe: string;
    upgradeToAdvanced: string;
    manageBilling: string;
    openFixer: string;
    yourMembership: string;
    subscribedDesc: string;
    stripeNote: string;
    billingUnavailable: string;
    starting: string;
    freeBullet1: string;
    freeBullet2: string;
    freeBullet3: string;
    freeBullet4: string;
    basicBullet1: string;
    basicBullet2: string;
    basicBullet3: string;
    basicBullet4: string;
    advancedBullet1: string;
    advancedBullet2: string;
    advancedBullet3: string;
    advancedBullet4: string;
    viewPricing: string;
    goToAccount: string;
    signInToUpgrade: string;
    close: string;
  };
  home: {
    title: string;
    description: string;
    headline: string;
    heroSubtitle: string;
    openEcommerceFixer: string;
    browseTemplates: string;
    customFormatsAdvanced: string;
    openCustomFormats: string;
    filesLocally: string;
    noSignup: string;
    cancelAnytime: string;
    whatItDoes: string;
    whatItDoesBullet1: string;
    whatItDoesBullet2: string;
    whatItDoesBullet3: string;
    csvFixerLabel: string;
    fixInSeconds: string;
    fixInSecondsDesc: string;
    customFormatsLabel: string;
    saveReuse: string;
    saveReuseDesc: string;
    upgradeToAdvanced: string;
    advancedRequired: string;
    faqLabel: string;
    faqTitle: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
    faq4Q: string;
    faq4A: string;
    upgradeModalTitle: string;
    upgradeModalMessage: string;
  };
  presets: {
    title: string;
    description: string;
    expectedColumns: string;
    exampleRow: string;
    noColumns: string;
    showingColumns: string;
    aboutFormat: string;
    howItWorks: string;
    examplesOfFixes: string;
    faq: string;
    presetFormats: string;
  };
  convert: {
    title: string;
    description: string;
    uploadStep: string;
    uploadDesc: string;
    chooseFile: string;
    noFileChosen: string;
    selectFormats: string;
    sourceFormat: string;
    targetFormat: string;
    convert: string;
    converting: string;
    conversionSummary: string;
    rowsProcessed: string;
    totalRows: string;
    outputColumns: string;
    warnings: string;
    allMapped: string;
    convertedWithWarnings: string;
    droppedColumns: string;
    downloadConverted: string;
    upgradeForLarger: string;
    yourPlan: string;
    upTo: string;
    rowsPerConversion: string;
    planUnlimited: string;
  };
  merge: {
    title: string;
    description: string;
    fileA: string;
    fileB: string;
    chooseFile: string;
    noFile: string;
    mergeOptions: string;
    mode: string;
    appendMode: string;
    dedupeMode: string;
    dedupeKey: string;
    chooseColumn: string;
    noSharedColumns: string;
    whenDuplicate: string;
    keepFirst: string;
    keepSecond: string;
    preferNonEmpty: string;
    mergeFiles: string;
    merging: string;
    mergeSummary: string;
    rowsFromA: string;
    rowsFromB: string;
    duplicatesFound: string;
    outputRows: string;
    downloadMerged: string;
    upgradeForLarger: string;
    yourPlan: string;
    upTo: string;
    combinedRows: string;
    planUnlimited: string;
  };
  app: {
    monthlyExports: string;
    unlimited: string;
    used: string;
    left: string;
  };
  profile: {
    verifySubscription: string;
    billingUnavailable: string;
    subscription: string;
    signedIn: string;
    yes: string;
    no: string;
    status: string;
    periodEnd: string;
    opening: string;
    manageStripe: string;
    backToEcommerce: string;
    upgradeToBasic: string;
    upgradeToAdvanced: string;
    youreSignedIn: string;
    loading: string;
    language: string;
    languageDesc: string;
    current: string;
  };
  inspector: {
    title: string;
    description: string;
    chooseFile: string;
    noFileChosen: string;
    inspecting: string;
    summary: string;
    rows: string;
    columns: string;
    blankRows: string;
    duplicateHeaders: string;
    emptyColumns: string;
    inconsistentColumns: string;
    encoding: string;
    delimiter: string;
    issues: string;
    noIssues: string;
    downloadReport: string;
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
