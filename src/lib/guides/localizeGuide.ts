// Guides in the page's language: issue guides take their text from the translated issue
// rules (src/i18n/issues) and the sentences of their generated body from src/i18n/guideText;
// curated guides take their card title/description from src/i18n/content and their article
// from src/content/guides-i18n/<locale>/ (see readCuratedGuide).

import type { Guide } from "@/lib/guidesRegistry";
import { fillTemplate, type Tr } from "@/lib/guides/issueGuideExpander";
import type { Locale } from "@/lib/i18n/locales";
import { loadValidationDicts, validationText } from "@/lib/i18n/validationText";

type CardDict = Record<string, { title?: string; description?: string }>;

/** Preset write-ups (CsvFormat.seo) in another language. */
export type PresetSeoDict = Record<
  string,
  { longDescription?: string[]; howItWorks?: string[]; commonFixes?: string[]; faq?: { q: string; a: string }[] }
>;

export type ContentDict = { guides: CardDict; presets: PresetSeoDict };

const CONTENT_LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: ContentDict }>> = {
  es: () => import("@/i18n/content/es.json"),
  de: () => import("@/i18n/content/de.json"),
  fr: () => import("@/i18n/content/fr.json"),
  pt: () => import("@/i18n/content/pt.json"),
  it: () => import("@/i18n/content/it.json"),
  nl: () => import("@/i18n/content/nl.json"),
  pl: () => import("@/i18n/content/pl.json"),
  tr: () => import("@/i18n/content/tr.json"),
  ru: () => import("@/i18n/content/ru.json"),
  ja: () => import("@/i18n/content/ja.json"),
  ko: () => import("@/i18n/content/ko.json"),
  zh: () => import("@/i18n/content/zh.json"),
};

export async function loadContent(locale: Locale): Promise<ContentDict> {
  if (locale === "en") return { guides: {}, presets: {} };
  const c = (await CONTENT_LOADERS[locale]()).default;
  return { guides: c.guides ?? {}, presets: c.presets ?? {} };
}

export type GuideLocalizer = <G extends Guide | null | undefined>(g: G) => G;

export async function guideLocalizer(locale: Locale): Promise<GuideLocalizer> {
  if (locale === "en") return (g) => g;
  const [dicts, cards] = await Promise.all([loadValidationDicts(locale), loadContent(locale).then((c) => c.guides)]);
  const vt = validationText(dicts);
  return ((g: Guide | null | undefined) => {
    if (!g) return g;
    if (g.kind === "issue" && g.issueCode) {
      const code = g.issueCode;
      return {
        ...g,
        title: vt.issue(code, "title", g.title)!,
        description: vt.issue(code, "explanation", g.description)!,
        explanation: vt.issue(code, "explanation", g.explanation),
        whyPlatformCares: vt.issue(code, "whyPlatformCares", g.whyPlatformCares),
        howToFix: vt.issue(code, "howToFix", g.howToFix),
      };
    }
    const card = cards[`${g.platform}/${g.slug}`];
    return card ? { ...g, title: card.title || g.title, description: card.description || g.description } : g;
  }) as GuideLocalizer;
}

/** English sentence template -> translated template (same {placeholders}). */
export type GuideTextDict = Record<string, string>;

const GUIDE_TEXT_LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: GuideTextDict }>> = {
  es: () => import("@/i18n/guideText/es.json"),
  de: () => import("@/i18n/guideText/de.json"),
  fr: () => import("@/i18n/guideText/fr.json"),
  pt: () => import("@/i18n/guideText/pt.json"),
  it: () => import("@/i18n/guideText/it.json"),
  nl: () => import("@/i18n/guideText/nl.json"),
  pl: () => import("@/i18n/guideText/pl.json"),
  tr: () => import("@/i18n/guideText/tr.json"),
  ru: () => import("@/i18n/guideText/ru.json"),
  ja: () => import("@/i18n/guideText/ja.json"),
  ko: () => import("@/i18n/guideText/ko.json"),
  zh: () => import("@/i18n/guideText/zh.json"),
};

/**
 * The sentence translator for issue guide bodies (expandIssueContent), and whether this
 * language has those sentences at all. Untranslated sentences stay English.
 */
export async function guideTextTranslator(locale: Locale): Promise<{ tr: Tr; translated: boolean }> {
  if (locale === "en") return { tr: fillTemplate, translated: true };
  const dict = (await GUIDE_TEXT_LOADERS[locale]()).default;
  return { tr: (t, v) => fillTemplate(dict[t] ?? t, v), translated: Object.keys(dict).length > 0 };
}
