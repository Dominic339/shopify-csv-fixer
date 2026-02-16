// src/lib/validation/issueMeta.ts

/**
 * Validation categories are used for:
 * - scoring buckets
 * - UI grouping (Readiness + "What this preset checks")
 *
 * NOTE:
 * Shopify has a few Shopify-specific buckets (required/handle/publishing/status/other).
 * We keep them as first-class categories, but give them 0 weight in scoring so overall
 * score behavior stays stable.
 */
export type ValidationCategory =
  | "structure"
  | "variant"
  | "pricing"
  | "inventory"
  | "images"
  | "seo"
  | "required"
  | "handle"
  | "publishing"
  | "status"
  | "other";

export type IssueMeta = {
  /** Stable id used by scoring + tooltip system (ex: "shopify/missing_handle"). */
  code: string;

  /** Short label shown in tooltips. */
  title: string;

  /** Plain-English explanation (what it means). */
  explanation: string;

  /** Why the platform rejects it / why it matters. */
  whyPlatformCares: string;

  /** Clear next step instruction. */
  howToFix: string;

  /** Category used by scoring + UI grouping. */
  category: ValidationCategory;

  /**
   * If true, issue blocks “ready for import”.
   * (In UI this shows as a blocker.)
   */
  blocking: boolean;

  /**
   * If true, our “Fix all blockers” button is allowed to automatically fix it.
   * IMPORTANT: Only use for deterministic, non-guessy fixes.
   */
  autoFixable?: boolean;
};

export type IssueMetaMap = Record<string, IssueMeta>;
