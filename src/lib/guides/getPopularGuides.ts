// src/lib/guides/getPopularGuides.ts
// SERVER-ONLY: calls getAllGuides() which uses fs via mdxLoader.

import { getAllGuides } from "@/lib/guidesRegistry";
import type { Guide, GuidePlatform } from "@/lib/guidesRegistry";

/**
 * Returns up to `limit` guides for a given platform, sorted so that
 * curated guides appear before issue guides. Within each kind, guides are
 * returned in their natural registry order.
 *
 * If `platform` is null, returns popular general + cross-platform curated
 * guides, falling back to issue guides to fill the count.
 */
export function getPopularGuides(platform: GuidePlatform | null, limit = 6): Guide[] {
  const all = getAllGuides();

  let pool: Guide[];
  if (platform) {
    // Platform-specific: curated first, then issue guides for the same platform.
    // Pad with general curated guides if we don't have enough.
    const platformCurated = all.filter((g) => g.platform === platform && g.kind === "curated");
    const platformIssue = all.filter((g) => g.platform === platform && g.kind === "issue");
    const generalCurated = all.filter((g) => g.platform === "general" && g.kind === "curated");
    pool = [...platformCurated, ...generalCurated, ...platformIssue];
  } else {
    // General / no platform: curated guides first (general platform), then others.
    const curated = all.filter((g) => g.kind === "curated");
    const issue = all.filter((g) => g.kind === "issue");
    pool = [...curated, ...issue];
  }

  return pool.slice(0, limit);
}
