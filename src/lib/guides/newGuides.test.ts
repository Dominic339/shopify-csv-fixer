// src/lib/guides/newGuides.test.ts
// Verifies the 15 new curated MDX guides are present in the registry
// and contain valid frontmatter.
import { describe, it, expect } from "vitest";
import { getAllGuides, getGuide } from "@/lib/guidesRegistry";
import type { GuidePlatform } from "@/lib/guidesRegistry";
import { readCuratedGuide } from "@/lib/guides/mdxLoader";

// ---------------------------------------------------------------------------
// Registry presence
// ---------------------------------------------------------------------------

describe("new curated guides in registry", () => {
  const expectedGuides: Array<{ platform: string; slug: string }> = [
    // General
    { platform: "general", slug: "fix-csv-encoding-errors" },
    { platform: "general", slug: "csv-import-errors-explained" },
    { platform: "general", slug: "csv-formatting-rules-for-imports" },
    { platform: "general", slug: "csv-column-mismatch-fix" },
    { platform: "general", slug: "csv-import-checklist" },
    { platform: "general", slug: "fix-extra-columns-in-csv" },
    { platform: "general", slug: "fix-blank-rows-in-csv" },
    // Shopify
    { platform: "shopify", slug: "shopify-csv-import-errors" },
    { platform: "shopify", slug: "shopify-product-csv-template-explained" },
    { platform: "shopify", slug: "shopify-csv-handle-field-guide" },
    // WooCommerce
    { platform: "woocommerce", slug: "woocommerce-product-csv-import-errors" },
    { platform: "woocommerce", slug: "woocommerce-attributes-in-csv" },
    // Etsy
    { platform: "etsy", slug: "etsy-csv-template-guide" },
    // eBay
    { platform: "ebay", slug: "ebay-file-exchange-csv-errors" },
    // Amazon
    { platform: "amazon", slug: "amazon-flat-file-import-errors" },
  ];

  it("all 15 new guides appear in getAllGuides()", () => {
    const all = getAllGuides();
    for (const { platform, slug } of expectedGuides) {
      const found = all.find((g) => g.platform === platform && g.slug === slug);
      expect(found, `Missing guide: ${platform}/${slug}`).toBeDefined();
    }
  });

  it("all 15 new guides are kind=curated", () => {
    for (const { platform, slug } of expectedGuides) {
      const guide = getGuide(platform as GuidePlatform, slug);
      expect(guide, `${platform}/${slug} not found`).not.toBeNull();
      expect(guide?.kind, `${platform}/${slug} should be curated`).toBe("curated");
    }
  });

  it("all 15 new guides have lastUpdated set", () => {
    for (const { platform, slug } of expectedGuides) {
      const guide = getGuide(platform as GuidePlatform, slug);
      expect(guide?.lastUpdated, `${platform}/${slug} missing lastUpdated`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// MDX frontmatter completeness
// ---------------------------------------------------------------------------

describe("new guide MDX frontmatter", () => {
  it("fix-csv-encoding-errors has whatYouLearn array with 5 items", () => {
    const data = readCuratedGuide("general", "fix-csv-encoding-errors");
    expect(data).not.toBeNull();
    expect(Array.isArray(data!.frontmatter.whatYouLearn)).toBe(true);
    expect(data!.frontmatter.whatYouLearn!.length).toBe(5);
  });

  it("shopify-csv-import-errors has keywords array", () => {
    const data = readCuratedGuide("shopify", "shopify-csv-import-errors");
    expect(data).not.toBeNull();
    expect(Array.isArray(data!.frontmatter.keywords)).toBe(true);
    expect(data!.frontmatter.keywords.length).toBeGreaterThan(0);
  });

  it("amazon-flat-file-import-errors has non-empty MDX content", () => {
    const data = readCuratedGuide("amazon", "amazon-flat-file-import-errors");
    expect(data).not.toBeNull();
    expect(data!.rawMdx.length).toBeGreaterThan(300);
  });

  it("all new guides contain an internal link to /app", () => {
    const guidesToCheck = [
      { platform: "general", slug: "fix-csv-encoding-errors" },
      { platform: "shopify", slug: "shopify-csv-import-errors" },
      { platform: "woocommerce", slug: "woocommerce-attributes-in-csv" },
      { platform: "ebay", slug: "ebay-file-exchange-csv-errors" },
      { platform: "amazon", slug: "amazon-flat-file-import-errors" },
    ];
    for (const { platform, slug } of guidesToCheck) {
      const data = readCuratedGuide(platform, slug);
      expect(data, `${platform}/${slug} not readable`).not.toBeNull();
      expect(data!.rawMdx, `${platform}/${slug} missing /app link`).toContain("/app");
    }
  });
});
