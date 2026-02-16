// src/lib/validation/issueMeta.ts

/**
 * Shared IssueMeta types used across the app.
 *
 * IMPORTANT DESIGN NOTE:
 * Different formats (Shopify, WooCommerce, etc.) may have different category sets.
 * So category must be flexible enough to accept format-specific labels.
 *
 * This file must remain compatible with ShopifyIssueCategory values like:
 * "required" | "handle" | "variant" | "pricing" | "inventory" | "images" | "seo" | "publishing" | "status" | "other"
 */

export type ValidationCategory = string;

export type IssueMeta = {
  code: string;
  title: string;
  explanation: string;
  whyPlatformCares: string;
  howToFix: string;

  /**
   * Category is intentionally flexible to allow format-specific groupings.
   * The UI can still group/sort by known categories (Shopify ones, etc.).
   */
  category: ValidationCategory;

  /**
   * blocking means "treat as import-stopping error" for readiness summary.
   */
  blocking: boolean;

  /**
   * autoFixable means the app can apply an automated fix for this issue.
   */
  autoFixable: boolean;
};

export type IssueMetaMap = Record<string, IssueMeta>;
