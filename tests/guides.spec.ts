/**
 * Guides Registry – Unit Tests
 *
 * Covers:
 *   1. getAllGuides() returns both curated and issue guides
 *   2. issueCodeToSlug() produces stable, correct slugs
 *   3. getGuidesByPlatform() filters correctly
 *   4. getGuide() finds a specific guide by platform + slug
 */

import { describe, it, expect } from "vitest";
import {
  getAllGuides,
  getGuidesByPlatform,
  getGuide,
  issueCodeToSlug,
  GUIDE_PLATFORMS,
} from "@/lib/guidesRegistry";

describe("issueCodeToSlug", () => {
  it("strips platform prefix and converts underscores to hyphens", () => {
    expect(issueCodeToSlug("shopify/missing_required_header")).toBe("missing-required-header");
  });

  it("handles codes without a platform prefix", () => {
    expect(issueCodeToSlug("blank_title")).toBe("blank-title");
  });

  it("handles multi-segment platform prefixes", () => {
    expect(issueCodeToSlug("woocommerce/duplicate_sku")).toBe("duplicate-sku");
  });
});

describe("getAllGuides", () => {
  it("returns at least one curated guide", () => {
    const guides = getAllGuides();
    const curated = guides.filter((g) => g.kind === "curated");
    expect(curated.length).toBeGreaterThan(0);
  });

  it("returns at least one issue guide", () => {
    const guides = getAllGuides();
    const issue = guides.filter((g) => g.kind === "issue");
    expect(issue.length).toBeGreaterThan(0);
  });

  it("returns guides for all non-general platforms", () => {
    const guides = getAllGuides();
    const platforms = new Set(guides.map((g) => g.platform));
    for (const p of GUIDE_PLATFORMS) {
      if (p === "general") continue; // general is curated-only
      expect(platforms.has(p)).toBe(true);
    }
  });

  it("every guide has required fields", () => {
    for (const g of getAllGuides()) {
      expect(g.platform).toBeTruthy();
      expect(g.slug).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(g.kind).toMatch(/^(curated|issue)$/);
    }
  });
});

describe("getGuidesByPlatform", () => {
  it("returns only guides for the requested platform", () => {
    const shopifyGuides = getGuidesByPlatform("shopify");
    expect(shopifyGuides.length).toBeGreaterThan(0);
    for (const g of shopifyGuides) {
      expect(g.platform).toBe("shopify");
    }
  });
});

describe("getGuide", () => {
  it("finds a known Shopify issue guide by slug", () => {
    const guide = getGuide("shopify", "missing-required-header");
    expect(guide).not.toBeNull();
    expect(guide?.kind).toBe("issue");
    expect(guide?.issueCode).toBe("shopify/missing_required_header");
  });

  it("returns null for a non-existent guide", () => {
    const guide = getGuide("shopify", "this-does-not-exist");
    expect(guide).toBeNull();
  });
});
