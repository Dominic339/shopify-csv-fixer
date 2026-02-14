// src/lib/validation/scoreNotes.ts
import type { CsvIssue } from "@/lib/formats/types";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

export type ScoreNote = {
  key: "structure" | "variant" | "pricing" | "inventory" | "seo";
  label: string;
  score: number;
  note: string;
};

export function buildScoreNotes(
  validation: any,
  issues: CsvIssue[],
  formatId?: string
): ScoreNote[] {
  const counts: Record<ScoreNote["key"], { blocking: number; errors: number; warnings: number }> = {
    structure: { blocking: 0, errors: 0, warnings: 0 },
    variant: { blocking: 0, errors: 0, warnings: 0 },
    pricing: { blocking: 0, errors: 0, warnings: 0 },
    inventory: { blocking: 0, errors: 0, warnings: 0 },
    seo: { blocking: 0, errors: 0, warnings: 0 },
  };

  for (const issue of issues) {
    const meta = getIssueMeta(formatId, issue.code);
    const cat = (meta?.category ?? "structure") as ScoreNote["key"];

    if (issue.severity === "error") {
      counts[cat].errors += 1;
      if ((meta?.blocking ?? true) === true) counts[cat].blocking += 1;
    } else if (issue.severity === "warning") {
      counts[cat].warnings += 1;
    }
  }

  const labels: Record<ScoreNote["key"], string> = {
    structure: "Structure",
    variant: "Variants",
    pricing: "Pricing",
    inventory: "Inventory",
    seo: "SEO",
  };

  const keys: ScoreNote["key"][] = ["structure", "variant", "pricing", "inventory", "seo"];

  return keys.map((k) => {
    const s = Number(validation?.categories?.[k] ?? 0);
    const c = counts[k];
    const parts: string[] = [];
    if (c.blocking) parts.push(`${c.blocking} blocking`);
    if (c.errors && !c.blocking) parts.push(`${c.errors} errors`);
    if (c.warnings) parts.push(`${c.warnings} warnings`);
    const note = parts.length ? parts.join(", ") : "No issues detected";
    return { key: k, label: labels[k], score: s, note };
  });
}
