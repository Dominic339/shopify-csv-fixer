// src/lib/validation/scoring.ts
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
  // Kept for backwards compatibility with the UI text; interpreted as "ready for import".
  readyForShopifyImport: boolean;
  label: string;
};

const ALL_CATEGORIES: ValidationCategory[] = [
  "structure",
  "variant",
  "pricing",
  "inventory",
  "seo",
  "images",
  "sku",
  "attributes",
  "media",
  "compliance",
  "tags",
  "shipping",
];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeWeights(weights: Partial<Record<ValidationCategory, number>>): Record<ValidationCategory, number> {
  const out: Record<ValidationCategory, number> = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as any;
  for (const [k, v] of Object.entries(weights)) {
    out[k as ValidationCategory] = Math.max(0, Number(v ?? 0));
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of ALL_CATEGORIES) out[k] = out[k] / sum;
  return out;
}

function weightsForFormat(formatId: string): Record<ValidationCategory, number> {
  if (formatId === "woocommerce_products" || formatId === "woocommerce_variable_products") {
    return normalizeWeights({
      structure: 0.14,
      variant: 0.16,
      sku: 0.18,
      attributes: 0.14,
      pricing: 0.14,
      inventory: 0.10,
      media: 0.10,
      seo: 0.04,
    });
  }

  if (formatId === "etsy_listings") {
    return normalizeWeights({
      compliance: 0.22,
      tags: 0.16,
      pricing: 0.18,
      variant: 0.12,
      seo: 0.12,
      shipping: 0.12,
      images: 0.08,
    });
  }

  // Default: Shopify-like profile
  return normalizeWeights({
    structure: 0.18,
    variant: 0.24,
    pricing: 0.18,
    inventory: 0.14,
    seo: 0.14,
    images: 0.12,
  });
}

/**
 * Category penalty with diminishing returns.
 *
 * - Errors move the needle a lot.
 * - Warnings less.
 * - Infos are mostly cosmetic.
 * - Blocking errors represent import failure risk.
 */
function penaltyFromCounts(counts: { errors: number; warnings: number; infos: number; blockingErrors: number }) {
  const { errors, warnings, infos, blockingErrors } = counts;

  const base = errors * 10 + warnings * 4 + infos * 1;
  const diminishing = 6 * Math.log1p(errors) + 2.5 * Math.log1p(warnings) + 1.25 * Math.log1p(infos);
  const blocking = blockingErrors * 12;

  return base + diminishing + blocking;
}

function inferCategory(issue: CsvIssue): ValidationCategory {
  const col = (issue.column ?? "").toLowerCase();
  const msg = (issue.message ?? "").toLowerCase();

  if (col.includes("shipping") || msg.includes("shipping")) return "shipping";
  if (col.includes("tag") || msg.includes("tag")) return "tags";
  if (col.includes("title") || msg.includes("compliance") || msg.includes("required field")) return "compliance";
  if (col.includes("attribute") || msg.includes("attribute")) return "attributes";
  if (col.includes("sku") || msg.includes("sku")) return "sku";
  if (col.includes("price") || msg.includes("price") || msg.includes("compare")) return "pricing";
  if (col.includes("inventory") || col.includes("qty") || msg.includes("inventory")) return "inventory";
  if (col.includes("image") || msg.includes("image")) return "images";
  if (col.includes("seo") || msg.includes("seo") || msg.includes("search")) return "seo";
  if (col.includes("option") || col.includes("variant") || msg.includes("variant")) return "variant";
  if (col.includes("media") || msg.includes("media")) return "media";
  return "structure";
}

export function computeValidationBreakdown(issues: CsvIssue[], opts: { formatId: string }): ValidationBreakdown {
  const formatId = opts.formatId;
  const weights = weightsForFormat(formatId);

  const categories: Record<ValidationCategory, number> = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 100])) as any;

  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let blockingErrors = 0;

  const catCounts: Record<ValidationCategory, { errors: number; warnings: number; infos: number; blockingErrors: number }> =
    Object.fromEntries(ALL_CATEGORIES.map((c) => [c, { errors: 0, warnings: 0, infos: 0, blockingErrors: 0 }])) as any;

  for (const issue of issues ?? []) {
    const sev = issue.severity ?? "error";
    if (sev === "error") errors++;
    else if (sev === "warning") warnings++;
    else infos++;

    const meta = getIssueMeta(formatId, issue.code);
    const cat = (meta?.category ?? inferCategory(issue)) as ValidationCategory;

    if (sev === "error") catCounts[cat].errors += 1;
    else if (sev === "warning") catCounts[cat].warnings += 1;
    else catCounts[cat].infos += 1;

    const isBlocking = Boolean(meta?.blocking && sev === "error");
    if (isBlocking) {
      blockingErrors++;
      catCounts[cat].blockingErrors += 1;
    }
  }

  for (const cat of ALL_CATEGORIES) {
    const p = penaltyFromCounts(catCounts[cat]);
    categories[cat] = clamp(Math.round(100 - p), 0, 100);
  }

  // Weighted overall score. Categories not relevant for this format are weight ~0.
  let score = 0;
  for (const cat of ALL_CATEGORIES) {
    score += categories[cat] * (weights[cat] ?? 0);
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
