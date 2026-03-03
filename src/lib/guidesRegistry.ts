// src/lib/guidesRegistry.ts
// SERVER-ONLY: imports fs via mdxLoader. Do not import in Client Components.
// Client Components should import shared constants from ./guidesConstants instead.

import { listCuratedGuides } from "./guides/mdxLoader";
import { SHOPIFY_ISSUE_META } from "./validation/issueMetaShopify";
import { WOOCOMMERCE_ISSUE_META } from "./validation/issueMetaWooCommerce";
import { ETSY_ISSUE_META } from "./validation/issueMetaEtsy";
import { EBAY_ISSUE_META } from "./validation/issueMetaEbay";
import { AMAZON_ISSUE_META } from "./validation/issueMetaAmazon";
import type { IssueMetaMap } from "./validation/issueMeta";

// Re-export all shared constants so pages only need one import.
export type { GuidePlatform } from "./guidesConstants";
export { GUIDE_PLATFORMS, PLATFORM_LABEL, PLATFORM_PRESET_ID, PLATFORM_FIXER_HREF } from "./guidesConstants";
import type { GuidePlatform } from "./guidesConstants";
import { GUIDE_PLATFORMS } from "./guidesConstants";

const PLATFORM_ISSUE_META: Partial<Record<GuidePlatform, IssueMetaMap>> = {
  shopify: SHOPIFY_ISSUE_META,
  woocommerce: WOOCOMMERCE_ISSUE_META,
  etsy: ETSY_ISSUE_META,
  ebay: EBAY_ISSUE_META,
  amazon: AMAZON_ISSUE_META,
};

export type Guide = {
  platform: GuidePlatform;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  kind: "curated" | "issue";
  category: string;
  // curated only
  lastUpdated?: string;
  // issue only
  issueCode?: string;
  blocking?: boolean;
  autoFixable?: boolean;
  howToFix?: string;
  explanation?: string;
  whyPlatformCares?: string;
};

export function issueCodeToSlug(code: string): string {
  // "shopify/missing_required_header" → "missing-required-header"
  const afterSlash = code.includes("/") ? code.split("/").slice(1).join("-") : code;
  return afterSlash.replace(/_/g, "-");
}

function issueMetaToGuides(platform: GuidePlatform, metaMap: IssueMetaMap): Guide[] {
  return Object.values(metaMap).map((m) => ({
    platform,
    slug: issueCodeToSlug(m.code),
    title: m.title,
    description: m.explanation,
    keywords: [m.code.replace("/", "-"), platform, m.category],
    kind: "issue" as const,
    category: m.category,
    issueCode: m.code,
    blocking: m.blocking,
    autoFixable: m.autoFixable,
    howToFix: m.howToFix,
    explanation: m.explanation,
    whyPlatformCares: m.whyPlatformCares,
  }));
}

// Module-level cache (reset on cold starts / Vitest reimports)
let _cache: Guide[] | null = null;

export function getAllGuides(): Guide[] {
  if (_cache) return _cache;

  const curated: Guide[] = listCuratedGuides().map((entry) => ({
    platform: entry.platform as GuidePlatform,
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords ?? [],
    kind: "curated",
    category: "general",
    lastUpdated: entry.lastUpdated,
  }));

  const issue: Guide[] = [];
  for (const platform of GUIDE_PLATFORMS) {
    const metaMap = PLATFORM_ISSUE_META[platform];
    if (metaMap) issue.push(...issueMetaToGuides(platform, metaMap));
  }

  _cache = [...curated, ...issue];
  return _cache;
}

export function getGuidesByPlatform(platform: GuidePlatform): Guide[] {
  return getAllGuides().filter((g) => g.platform === platform);
}

export function getGuide(platform: GuidePlatform, slug: string): Guide | null {
  return getAllGuides().find((g) => g.platform === platform && g.slug === slug) ?? null;
}
