// Translations for what the validators say: run-time messages (src/i18n/messages/<locale>.json)
// and the issue rules' text (src/i18n/issues/<locale>.json). Both load on demand, one chunk
// per language, so English pages load nothing extra. Missing entries fall back to English.

import type { Locale } from "@/lib/i18n/locales";
import { translateMessage, type MessageDict } from "@/lib/i18n/messages";
import type { IssueMeta } from "@/lib/validation/issueMeta";

export type IssueTextField = "title" | "explanation" | "whyPlatformCares" | "howToFix";
export type IssueTextDict = Record<string, Partial<Record<IssueTextField, string>>>;

type Json<T> = Promise<{ default: T }>;

// Explicit imports so every locale gets its own chunk.
const MESSAGE_LOADERS: Record<Exclude<Locale, "en">, () => Json<MessageDict>> = {
  es: () => import("@/i18n/messages/es.json"),
  de: () => import("@/i18n/messages/de.json"),
  fr: () => import("@/i18n/messages/fr.json"),
  pt: () => import("@/i18n/messages/pt.json"),
  it: () => import("@/i18n/messages/it.json"),
  nl: () => import("@/i18n/messages/nl.json"),
  pl: () => import("@/i18n/messages/pl.json"),
  tr: () => import("@/i18n/messages/tr.json"),
  ru: () => import("@/i18n/messages/ru.json"),
  ja: () => import("@/i18n/messages/ja.json"),
  ko: () => import("@/i18n/messages/ko.json"),
  zh: () => import("@/i18n/messages/zh.json"),
};

const ISSUE_LOADERS: Record<Exclude<Locale, "en">, () => Json<IssueTextDict>> = {
  es: () => import("@/i18n/issues/es.json"),
  de: () => import("@/i18n/issues/de.json"),
  fr: () => import("@/i18n/issues/fr.json"),
  pt: () => import("@/i18n/issues/pt.json"),
  it: () => import("@/i18n/issues/it.json"),
  nl: () => import("@/i18n/issues/nl.json"),
  pl: () => import("@/i18n/issues/pl.json"),
  tr: () => import("@/i18n/issues/tr.json"),
  ru: () => import("@/i18n/issues/ru.json"),
  ja: () => import("@/i18n/issues/ja.json"),
  ko: () => import("@/i18n/issues/ko.json"),
  zh: () => import("@/i18n/issues/zh.json"),
};

export type ValidationDicts = { messages: MessageDict | null; issues: IssueTextDict | null };

export async function loadValidationDicts(locale: Locale): Promise<ValidationDicts> {
  if (locale === "en") return { messages: null, issues: null };
  const [m, i] = await Promise.all([MESSAGE_LOADERS[locale](), ISSUE_LOADERS[locale]()]);
  return { messages: m.default, issues: i.default };
}

/** Translate helpers bound to one language's dictionaries. */
export type ValidationText = {
  msg: (message: string | undefined) => string;
  issue: (code: string | undefined, field: IssueTextField, english?: string) => string | undefined;
  /** An IssueMeta with its text fields translated. */
  meta: <M extends IssueMeta | null | undefined>(m: M) => M;
};

export function validationText(d: ValidationDicts): ValidationText {
  const issue: ValidationText["issue"] = (code, field, english) => (code && d.issues?.[code]?.[field]) || english;
  return {
    msg: (message) => translateMessage(message, d.messages),
    issue,
    meta: (m) =>
      (m
        ? {
            ...m,
            title: issue(m.code, "title", m.title)!,
            explanation: issue(m.code, "explanation", m.explanation)!,
            whyPlatformCares: issue(m.code, "whyPlatformCares", m.whyPlatformCares)!,
            howToFix: issue(m.code, "howToFix", m.howToFix)!,
          }
        : m) as typeof m,
  };
}

export const ENGLISH_VALIDATION_TEXT = validationText({ messages: null, issues: null });
