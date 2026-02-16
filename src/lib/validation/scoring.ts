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
  images: 0, // keep overall scoring behavior unchanged; blocking still handled separately

  // Shopify-specific buckets (kept for grouping + tooltips; no scoring weight)
  required: 0,
  handle: 0,
  publishing: 0,
  status: 0,
  other: 0,
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
  const msg = (issue.message ?? "").toLowerCase();

  if (col.includes("price") || msg.includes("price") || msg.includes("compare")) return "pricing";
  if (col.includes("inventory") || col.includes("qty") || msg.includes("inventory")) return "inventory";
  if (col.includes("image") || msg.includes("image")) return "images";
  if (col.includes("seo") || msg.includes("seo") || msg.includes("search")) return "seo";
  if (col.includes("option") || col.includes("variant") || msg.includes("variant") || msg.includes("sku")) return "variant";
  return "structure";
}

export function computeValidationBreakdown(
  issues: CsvIssue[],
  opts: { formatId: string }
): ValidationBreakdown {
  const formatId = opts.formatId;

  const categories: Record<ValidationCategory, number> = Object.keys(CATEGORY_WEIGHTS).reduce((acc, k) => {
    acc[k as ValidationCategory] = 100;
    return acc;
  }, {} as Record<ValidationCategory, number>);

  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let blockingErrors = 0;

  // Penalty per category
  const penalty: Record<ValidationCategory, number> = Object.keys(CATEGORY_WEIGHTS).reduce((acc, k) => {
    acc[k as ValidationCategory] = 0;
    return acc;
  }, {} as Record<ValidationCategory, number>);

  for (const issue of issues ?? []) {
    const sev = issue.severity ?? "error";
    if (sev === "error") errors++;
    else if (sev === "warning") warnings++;
    else infos++;

    const meta = getIssueMeta(formatId, issue.code);
    const cat = (meta?.category ?? inferCategory(issue)) as ValidationCategory;

    penalty[cat] += severityPenalty(sev);

    // Blocking = “errors that matter for import”
    const isBlocking = Boolean(meta?.blocking && sev === "error");
    if (isBlocking) blockingErrors++;
  }

  for (const k of Object.keys(categories) as ValidationCategory[]) {
    categories[k] = clamp(100 - penalty[k], 0, 100);
  }

  // Overall weighted score (keeps existing behavior: only weighted buckets affect overall)
  const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0) || 1;
  let score = 0;
  for (const k of Object.keys(CATEGORY_WEIGHTS) as ValidationCategory[]) {
    score += (categories[k] * CATEGORY_WEIGHTS[k]) / totalWeight;
  }
  score = Math.round(clamp(score, 0, 100));

  const readyForShopifyImport = blockingErrors === 0;

  const label =
    score >= 90 && readyForShopifyImport
      ? "Excellent"
      : score >= 80 && readyForShopifyImport
        ? "Good"
        : score >= 70
          ? "Needs work"
          : "High risk";

  return {
    score,
    categories,
    counts: { errors, warnings, infos, blockingErrors },
    readyForShopifyImport,
    label,
  };
}
