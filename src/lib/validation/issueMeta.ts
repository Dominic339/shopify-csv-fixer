// src/lib/validation/issueMeta.ts

// Shared issue metadata contract used across all formats.

export type ValidationCategory =
  | "structure"
  | "variant"
  | "pricing"
  | "inventory"
  | "seo"
  | "images"
  // Platform-authentic drivers (used by Woo/Etsy and any future formats)
  | "sku"
  | "attributes"
  | "media"
  | "compliance"
  | "tags"
  | "shipping";

export type IssueMeta = {
  code: string;
  title: string;
  category: ValidationCategory;
  // Whether this issue should be treated as an import blocker.
  blocking: boolean;
  // Whether we have a deterministic, safe fix.
  autoFixable: boolean;
  explanation: string;
  whyPlatformCares: string;
  howToFix: string;
};

export type IssueMetaMap = Record<string, IssueMeta>;

// Small helper for building IssueMeta objects without repeating the code.
export function meta(m: Omit<IssueMeta, "code"> & { code: string }): IssueMeta {
  return m;
}
