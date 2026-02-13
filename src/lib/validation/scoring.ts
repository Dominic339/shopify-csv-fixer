import type { CsvIssue } from "@/lib/formats/types";
import type { ValidationCategory } from "./issueMeta";
import { getIssueMeta } from "./issueMetaRegistry";

export type ValidationBreakdown = {
  score: number; // 0-100 overall
  categories: Record<ValidationCategory, number>; // each 0-100
  counts: {
    errors: number;
    warnings: number;
    infos: number;
    blockingErrors: number;
  };
  readyForShopifyImport: boolean;
  label: string;
};

const CATEGORY_WEIGHTS: Record<ValidationCategory, number> = {
  structure: 25,
  variant: 25,
  pricing: 20,
  inventory: 20,
  seo: 10,
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function severityPenalty(sev: "error" | "warning" | "info") {
  if (sev === "error") return 6;
  if (sev === "warning") return 2;
  return 0.5;
}

/**
 * Fallback category guess when a preset does not have issue meta for the code.
 * This keeps scoring working for all presets today while allowing richer meta later.
 */
function inferCategory(issue: CsvIssue): ValidationCategory {
  const col = (issue.column ?? "").toLowerCase();

  if (
    col.includes("price") ||
    col.includes("compare") ||
    col.includes("cost") ||
    col.includes("tax") ||
    col.includes("currency")
  ) {
    return "pricing";
  }

  if (col.includes("inventory") || col.includes("qty") || col.includes("quantity") || col.includes("policy")) {
    return "inventory";
  }

  if (col.includes("option") || col.includes("variant") || col.includes("sku") || col.includes("handle")) {
    return "variant";
  }

  if (col.includes("seo") || col.includes("title") || col.includes("body") || col.includes("description")) {
    return "seo";
  }

  return "structure";
}

/**
 * Weighted scoring system:
 * - Each category starts at 100
 * - Penalties applied per issue based on severity
 * - Overall score is weighted average by CATEGORY_WEIGHTS
 *
 * "Ready for Shopify Import":
 * - score >= 90 and NO blocking errors
 */
export function computeValidationBreakdown(
  issues: CsvIssue[],
  opts: { formatId?: string } = {}
): ValidationBreakdown {
  const byCategory: Record<ValidationCategory, CsvIssue[]> = {
    structure: [],
    variant: [],
    pricing: [],
    inventory: [],
    seo: [],
  };

  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let blockingErrors = 0;

  for (const issue of issues) {
    if (issue.severity === "error") errors++;
    else if (issue.severity === "warning") warnings++;
    else infos++;

    const meta = getIssueMeta(opts.formatId, issue.code);
    const category = meta?.category ?? inferCategory(issue);
    byCategory[category].push(issue);

    // Blocking logic:
    // - Prefer explicit metadata
    // - If missing metadata: treat errors as blocking (conservative)
    if (issue.severity === "error") {
      const isBlocking = meta?.blocking ?? true;
      if (isBlocking) blockingErrors++;
    }
  }

  const categoryScores: Record<ValidationCategory, number> = {
    structure: 100,
    variant: 100,
    pricing: 100,
    inventory: 100,
    seo: 100,
  };

  for (const cat of Object.keys(categoryScores) as ValidationCategory[]) {
    let score = 100;
    for (const issue of byCategory[cat]) score -= severityPenalty(issue.severity);
    categoryScores[cat] = clamp(Math.round(score), 0, 100);
  }

  let weighted = 0;
  for (const cat of Object.keys(CATEGORY_WEIGHTS) as ValidationCategory[]) {
    weighted += categoryScores[cat] * CATEGORY_WEIGHTS[cat];
  }
  const overall = clamp(Math.round(weighted / 100), 0, 100);

  const readyForShopifyImport = overall >= 90 && blockingErrors === 0;

  return {
    score: overall,
    categories: categoryScores,
    counts: { errors, warnings, infos, blockingErrors },
    readyForShopifyImport,
    label: readyForShopifyImport ? "🟢 Ready for Shopify Import" : "Not ready yet",
  };
}
