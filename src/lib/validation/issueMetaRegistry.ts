// src/lib/validation/issueMetaRegistry.ts
import type { IssueMeta, IssueMetaMap } from "./issueMeta";
import { SHOPIFY_ISSUE_META } from "./issueMetaShopify";
import { getGenericMetaForCode } from "./issueMetaGeneric";

// Keyed by formatId (must match your preset formatId like "shopify_products")
export const ISSUE_META_REGISTRY: Record<string, IssueMetaMap> = {
  shopify_products: SHOPIFY_ISSUE_META,
};

export function getIssueMeta(formatId: string | undefined, code: string | undefined): IssueMeta | null {
  if (!code) return null;

  // 1) Format-specific metadata (Shopify, future eBay/Amazon/etc.)
  const fmt = (formatId ?? "").trim();
  if (fmt && ISSUE_META_REGISTRY[fmt]?.[code]) {
    return ISSUE_META_REGISTRY[fmt][code];
  }

  // 2) Generic metadata (covers generic codes across presets)
  const generic = getGenericMetaForCode(code);
  if (generic) return generic;

  return null;
}
