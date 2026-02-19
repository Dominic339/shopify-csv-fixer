// src/lib/validation/scoreNotes.ts
import type { CsvIssue } from "@/lib/formats/types";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

export type ScoreNoteKey = "structure" | "variant" | "pricing" | "inventory" | "seo" | "images";

export type ScoreNote = {
  key: ScoreNoteKey;
  label: string;
  score: number;
  note: string;
};

const LABELS: Record<ScoreNoteKey, string> = {
  structure: "Structure",
  variant: "Variants",
  pricing: "Pricing",
  inventory: "Inventory",
  seo: "SEO",
  images: "Images",
};

const KEYS: ScoreNoteKey[] = ["structure", "variant", "pricing", "inventory", "seo", "images"];

export function buildScoreNotes(validation: any, issues: CsvIssue[], formatId?: string): ScoreNote[] {
  const counts: Record<ScoreNoteKey, { blocking: number; errors: number; warnings: number }> = {
    structure: { blocking: 0, errors: 0, warnings: 0 },
    variant: { blocking: 0, errors: 0, warnings: 0 },
    pricing: { blocking: 0, errors: 0, warnings: 0 },
    inventory: { blocking: 0, errors: 0, warnings: 0 },
    seo: { blocking: 0, errors: 0, warnings: 0 },
    images: { blocking: 0, errors: 0, warnings: 0 },
  };

  for (const issue of issues) {
    const meta = getIssueMeta(formatId, issue.code);

    // meta.category can be something new later; never crash.
    const rawCat = String(meta?.category ?? "structure") as ScoreNoteKey;
    const cat: ScoreNoteKey = rawCat in counts ? rawCat : "structure";

    if (issue.severity === "error") {
      counts[cat].errors += 1;
      if ((meta?.blocking ?? true) === true) counts[cat].blocking += 1;
    } else if (issue.severity === "warning") {
      counts[cat].warnings += 1;
    }
  }

  return KEYS.map((k) => {
    const s = Number(validation?.categories?.[k] ?? 0);
    const c = counts[k];
    const parts: string[] = [];
    if (c.blocking) parts.push(`${c.blocking} blocking ${c.blocking === 1 ? "issue" : "issues"}`);
    if (c.errors && !c.blocking) parts.push(`${c.errors} ${c.errors === 1 ? "error" : "errors"}`);
    if (c.warnings) parts.push(`${c.warnings} ${c.warnings === 1 ? "warning" : "warnings"}`);

    let note = parts.length ? parts.join(", ") : "No issues detected";

    // Extra context for the variants driver so a low number feels intentional, not broken.
    if (k === "variant" && s < 70 && parts.length) {
      note += " · Variant issues often come from missing option values or duplicate option combinations.";
    }
    return { key: k, label: LABELS[k], score: s, note };
  });
}
