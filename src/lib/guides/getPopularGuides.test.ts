// src/lib/guides/getPopularGuides.test.ts
import { describe, it, expect } from "vitest";
import { getPopularGuides } from "./getPopularGuides";

describe("getPopularGuides", () => {
  it("returns at most 6 guides by default", () => {
    const guides = getPopularGuides(null);
    expect(guides.length).toBeLessThanOrEqual(6);
  });

  it("returns curated guides before issue guides for a specific platform", () => {
    // Shopify has both curated guides (from new MDX files) and issue guides.
    const guides = getPopularGuides("shopify", 6);
    const firstIssueIndex = guides.findIndex((g) => g.kind === "issue");
    const lastCuratedIndex = guides.map((g) => g.kind).lastIndexOf("curated");
    if (firstIssueIndex !== -1 && lastCuratedIndex !== -1) {
      // All curated guides must appear before the first issue guide
      expect(lastCuratedIndex).toBeLessThan(firstIssueIndex);
    }
  });

  it("returns curated guides first for general platform", () => {
    const guides = getPopularGuides("general", 6);
    const firstIssueIndex = guides.findIndex((g) => g.kind === "issue");
    const lastCuratedIndex = guides.map((g) => g.kind).lastIndexOf("curated");
    if (firstIssueIndex !== -1 && lastCuratedIndex !== -1) {
      expect(lastCuratedIndex).toBeLessThan(firstIssueIndex);
    }
  });

  it("returns curated guides first when platform is null", () => {
    const guides = getPopularGuides(null, 6);
    const firstIssueIndex = guides.findIndex((g) => g.kind === "issue");
    const lastCuratedIndex = guides.map((g) => g.kind).lastIndexOf("curated");
    if (firstIssueIndex !== -1 && lastCuratedIndex !== -1) {
      expect(lastCuratedIndex).toBeLessThan(firstIssueIndex);
    }
  });

  it("respects the limit parameter", () => {
    const three = getPopularGuides(null, 3);
    expect(three.length).toBeLessThanOrEqual(3);
    const ten = getPopularGuides(null, 10);
    expect(ten.length).toBeLessThanOrEqual(10);
  });

  it("every returned guide has required fields", () => {
    const guides = getPopularGuides("shopify", 6);
    for (const g of guides) {
      expect(g.platform).toBeTruthy();
      expect(g.slug).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(g.kind).toMatch(/^(curated|issue)$/);
    }
  });
});
