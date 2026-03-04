// src/lib/validation/issueMetaRegistry.ts
import type { IssueMeta, IssueMetaMap } from "./issueMeta";
import { SHOPIFY_ISSUE_META } from "./issueMetaShopify";
import { getGenericMetaForCode } from "./issueMetaGeneric";
import { WOOCOMMERCE_ISSUE_META } from "./issueMetaWooCommerce";
import { ETSY_ISSUE_META } from "./issueMetaEtsy";
import { EBAY_ISSUE_META } from "./issueMetaEbay";
import { AMAZON_ISSUE_META } from "./issueMetaAmazon";

// Keyed by formatId (must match preset formatId like "shopify_products")
export const ISSUE_META_REGISTRY: Record<string, IssueMetaMap> = {
  shopify_products: SHOPIFY_ISSUE_META,
  woocommerce_products: WOOCOMMERCE_ISSUE_META,
  woocommerce_variable_products: WOOCOMMERCE_ISSUE_META,
  etsy_listings: ETSY_ISSUE_META,
  ebay_listings: EBAY_ISSUE_META,
  ebay_variations: EBAY_ISSUE_META,
  amazon_inventory_loader: AMAZON_ISSUE_META,
};

export function getIssueMeta(formatId: string | undefined, code: string | undefined): IssueMeta | null {
  if (!code) return null;

  const fmt = (formatId ?? "").trim();
  if (fmt && ISSUE_META_REGISTRY[fmt]?.[code]) return ISSUE_META_REGISTRY[fmt][code];

  const generic = getGenericMetaForCode(code);
  if (generic) return generic;

  return null;
}
