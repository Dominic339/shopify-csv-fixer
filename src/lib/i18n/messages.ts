// Translates the English messages the validators produce ("Row 3: Title is blank.")
// without changing the validators: each message is matched against the English
// templates extracted from their source (src/i18n/messages/templates.json, see
// scripts/i18n-messages.ts) and the captured values are filled into the translation.
// Messages with no matching template, or no translation yet, stay in English.

import templates from "@/i18n/messages/templates.json";

/** English template -> translated template, both using {0}, {1}, ... */
export type MessageDict = Record<string, string>;

type Compiled = { template: string; re: RegExp; literal: number };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(template: string): Compiled {
  const parts = template.split(/\{\d+\}/);
  // Placeholders are numbered in order, so a translation can reorder them freely.
  const body = parts.map(escape).join("(.*?)");
  return { template, re: new RegExp(`^${body}$`, "s"), literal: parts.join("").length };
}

let compiled: Compiled[] | null = null;
function allTemplates(): Compiled[] {
  // Most specific (most literal text) first, so "Normalized Price to ..." beats "Normalized {0} to ...".
  compiled ??= (templates as string[]).map(compile).sort((a, b) => b.literal - a.literal);
  return compiled;
}

/** The template an English message was built from, and the values that filled it. */
export function matchTemplate(message: string): { template: string; values: string[] } | null {
  for (const c of allTemplates()) {
    const m = c.re.exec(message);
    if (m) return { template: c.template, values: m.slice(1) };
  }
  return null;
}

function fill(template: string, values: string[]): string {
  return template.replace(/\{(\d+)\}/g, (all, i) => values[Number(i)] ?? all);
}

const cache = new WeakMap<MessageDict, Map<string, string>>();

/** Translate one message; returns it unchanged when no translation applies. */
export function translateMessage(message: string | undefined, dict: MessageDict | null | undefined): string {
  if (!message || !dict) return message ?? "";
  let memo = cache.get(dict);
  if (!memo) cache.set(dict, (memo = new Map()));
  const hit = memo.get(message);
  if (hit !== undefined) return hit;

  let out = message;
  const m = matchTemplate(message);
  if (m && dict[m.template]) out = fill(dict[m.template], m.values);
  memo.set(message, out);
  return out;
}
