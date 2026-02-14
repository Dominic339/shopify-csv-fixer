// src/lib/validation/issueMetaRegistry.ts
import type { IssueMeta, IssueMetaMap } from "./issueMeta";
import { SHOPIFY_ISSUE_META } from "./issueMetaShopify";
import { getGenericMetaForCode } from "./issueMetaGeneric";

export const ISSUE_META_REGISTRY: Record<string, IssueMetaMap> = {
  shopify_products: SHOPIFY_ISSUE_META,
};

export function getIssueMeta(formatId: string | undefined, code: string | undefined): IssueMeta | null {
  if (!code) return null;

  // 1) Preset-specific metadata (Shopify, future eBay/Amazon/etc.)
  if (formatId && ISSUE_META_REGISTRY[formatId]?.[code]) {
    return ISSUE_META_REGISTRY[formatId][code];
  }

  // 2) Generic metadata for buildSimpleFormat codes (supports all 20 presets immediately)
  const generic = getGenericMetaForCode(code);
  if (generic) return generic;

  return null;
}
