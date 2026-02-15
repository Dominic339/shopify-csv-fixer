export type ValidationCategory =
  | "structure"
  | "variant"
  | "pricing"
  | "inventory"
  | "seo"
  | "images";

export type IssueMeta = {
  /** Stable id used by scoring + tooltip system (ex: "shopify/missing_handle"). */
  code: string;

  /** Short label shown in tooltips. */
  title: string;

  /** Plain-English explanation (what it means). */
  explanation: string;

  /** Why the platform rejects it / why it matters. */
  whyPlatformCares: string;

  /** How a user can fix it manually, if needed. */
  howToFix: string;

  /** Category used by the weighted scoring system. */
  category: ValidationCategory;

  /** Whether this is blocking for "Ready for Shopify import" */
  blocking: boolean;

  /** Whether this issue is safe + deterministic to auto-fix in "Fix All Blocking Issues" */
  autoFixable?: boolean;
};

export type IssueMetaMap = Record<string, IssueMeta>;
