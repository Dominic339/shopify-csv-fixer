// src/lib/validation/scoreNotes.ts
import type { CsvIssue } from "@/lib/formats/types";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

export type ScoreNoteKey =
  | "structure"
  | "variant"
  | "pricing"
  | "inventory"
  | "seo"
  | "images"
  | "sku"
  | "attributes"
  | "media"
  | "compliance"
  | "tags"
  | "shipping";

/** Score for one category, with the counts behind it; the UI turns it into (translated) text. */
export type ScoreNote = {
  key: ScoreNoteKey;
  score: number;
  blocking: number;
  errors: number;
  warnings: number;
  hint: ScoreHintId | null;
};

function keysForFormat(formatId?: string): ScoreNoteKey[] {
  if (formatId === "woocommerce_products" || formatId === "woocommerce_variable_products") {
    return ["structure", "variant", "sku", "attributes", "pricing", "inventory", "media"];
  }
  if (formatId === "etsy_listings") {
    return ["compliance", "tags", "pricing", "variant", "seo", "shipping", "images"];
  }
  // Default (Shopify + anything unknown)
  return ["structure", "variant", "pricing", "inventory", "seo", "images"];
}

/** Why a low score in this category matters, for this platform. Text lives in the app translations as scoreHint_<id>. */
export type ScoreHintId =
  | "shopify_variant" | "shopify_seo"
  | "woo_variant" | "woo_sku" | "woo_attributes" | "woo_media"
  | "etsy_compliance" | "etsy_tags" | "etsy_shipping" | "etsy_seo";

function lowScoreHint(formatId: string | undefined, key: ScoreNoteKey): ScoreHintId | null {
  const platform = formatId?.startsWith("shopify") ? "shopify" : formatId?.startsWith("woocommerce") ? "woo" : formatId === "etsy_listings" ? "etsy" : null;
  const id = platform ? `${platform}_${key}` : "";
  const known: ScoreHintId[] = ["shopify_variant", "shopify_seo", "woo_variant", "woo_sku", "woo_attributes", "woo_media", "etsy_compliance", "etsy_tags", "etsy_shipping", "etsy_seo"];
  return (known as string[]).includes(id) ? (id as ScoreHintId) : null;
}

export function buildScoreNotes(validation: any, issues: CsvIssue[], formatId?: string): ScoreNote[] {
  const keys = keysForFormat(formatId);

  const counts: Record<string, { blocking: number; errors: number; warnings: number }> = {};
  for (const k of keys) counts[k] = { blocking: 0, errors: 0, warnings: 0 };

  for (const issue of issues) {
    const meta = getIssueMeta(formatId, issue.code);
    const rawCat = String(meta?.category ?? "structure") as ScoreNoteKey;
    const cat: ScoreNoteKey = rawCat in counts ? rawCat : (keys.includes("structure") ? "structure" : keys[0]);

    if (issue.severity === "error") {
      counts[cat].errors += 1;
      if ((meta?.blocking ?? true) === true) counts[cat].blocking += 1;
    } else if (issue.severity === "warning") {
      counts[cat].warnings += 1;
    }
  }

  return keys.map((k) => {
    const s = Number(validation?.categories?.[k] ?? 0);
    const score = Number.isFinite(s) ? s : 100;
    const c = counts[k] ?? { blocking: 0, errors: 0, warnings: 0 };
    const hasIssues = c.blocking + c.errors + c.warnings > 0;
    // Only explain a low score, so the hint reads as intentional.
    const hint = score < 70 && hasIssues ? lowScoreHint(formatId, k) : null;
    return { key: k, score, blocking: c.blocking, errors: c.blocking ? 0 : c.errors, warnings: c.warnings, hint };
  });
}
