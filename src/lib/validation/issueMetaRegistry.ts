import type { IssueMetaMap } from "./issueMeta";
import { SHOPIFY_ISSUE_META } from "./issueMetaShopify";

/**
 * Central registry so we can plug in metadata for 20+ presets without
 * forking UI components.
 *
 * Add a new preset by:
 * - creating `issueMeta<YourPreset>.ts`
 * - adding it here under the correct formatId
 */
export const ISSUE_META_REGISTRY: Record<string, IssueMetaMap> = {
  shopify_products: SHOPIFY_ISSUE_META,
};

export function getIssueMeta(formatId: string | undefined, code: string | undefined) {
  if (!formatId || !code) return null;
  const map = ISSUE_META_REGISTRY[formatId];
  if (!map) return null;
  return map[code] ?? null;
}
