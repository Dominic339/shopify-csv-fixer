/**
 * Guides Registry + Expander -- Unit Tests
 *
 * Covers:
 *   1. issueCodeToSlug() stable slug generation
 *   2. getAllGuides() returns curated + issue guides with required fields
 *   3. getGuidesByPlatform() and getGuide() filtering
 *   4. classifyIssue() classifier stability
 *   5. expandIssueContent() produces all expected sections
 *   6. MDX guide files do not contain mojibake sequences (encoding check)
 */

import { describe, it, expect } from "vitest";
import {
  getAllGuides,
  getGuidesByPlatform,
  getGuide,
  issueCodeToSlug,
  GUIDE_PLATFORMS,
} from "@/lib/guidesRegistry";
import { classifyIssue, expandIssueContent } from "@/lib/guides/issueGuideExpander";
import { readCuratedGuide } from "@/lib/guides/mdxLoader";

// ---------------------------------------------------------------------------
// issueCodeToSlug
// ---------------------------------------------------------------------------

describe("issueCodeToSlug", () => {
  it("strips platform prefix and converts underscores to hyphens", () => {
    expect(issueCodeToSlug("shopify/missing_required_header")).toBe("missing-required-header");
  });

  it("handles codes without a platform prefix", () => {
    expect(issueCodeToSlug("blank_title")).toBe("blank-title");
  });

  it("handles woocommerce prefix", () => {
    expect(issueCodeToSlug("woocommerce/duplicate_sku")).toBe("duplicate-sku");
  });

  it("handles amazon prefix", () => {
    expect(issueCodeToSlug("amazon/missing_required_header")).toBe("missing-required-header");
  });
});

// ---------------------------------------------------------------------------
// getAllGuides
// ---------------------------------------------------------------------------

describe("getAllGuides", () => {
  it("returns at least one curated guide", () => {
    const curated = getAllGuides().filter((g) => g.kind === "curated");
    expect(curated.length).toBeGreaterThan(0);
  });

  it("returns at least one issue guide", () => {
    const issue = getAllGuides().filter((g) => g.kind === "issue");
    expect(issue.length).toBeGreaterThan(0);
  });

  it("returns guides for all non-general platforms", () => {
    const platforms = new Set(getAllGuides().map((g) => g.platform));
    for (const p of GUIDE_PLATFORMS) {
      if (p === "general") continue;
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

  it("issue guides include expanded keywords", () => {
    const shopifyGuides = getAllGuides().filter((g) => g.platform === "shopify" && g.kind === "issue");
    expect(shopifyGuides.length).toBeGreaterThan(0);
    // Keywords should now include platform label strings
    const firstGuide = shopifyGuides[0];
    const combined = firstGuide.keywords.join(" ").toLowerCase();
    expect(combined).toContain("shopify");
    expect(combined).toContain("csv");
  });
});

// ---------------------------------------------------------------------------
// getGuidesByPlatform / getGuide
// ---------------------------------------------------------------------------

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
    expect(getGuide("shopify", "this-does-not-exist")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyIssue -- classifier stability
// ---------------------------------------------------------------------------

describe("classifyIssue", () => {
  const base = {
    explanation: "",
    whyPlatformCares: "",
    howToFix: "",
    autoFixable: false,
    blocking: true,
    platform: "shopify",
  };

  it("classifies missing_required_header as required_header", () => {
    expect(
      classifyIssue({ ...base, issueCode: "shopify/missing_required_header", title: "Missing required column", category: "structure" }),
    ).toBe("required_header");
  });

  it("classifies invalid_boolean_published as boolean", () => {
    expect(
      classifyIssue({
        ...base,
        issueCode: "shopify/invalid_boolean_published",
        title: "Invalid Published value",
        category: "compliance",
        explanation: "Published expects TRUE or FALSE.",
      }),
    ).toBe("boolean");
  });

  it("classifies missing_price (pricing category) as money", () => {
    expect(
      classifyIssue({
        ...base,
        issueCode: "ebay/missing_price",
        title: "Missing StartPrice",
        category: "pricing",
        explanation: "StartPrice is required.",
        platform: "ebay",
      }),
    ).toBe("money");
  });

  it("classifies duplicate_sku as duplicate", () => {
    expect(
      classifyIssue({ ...base, issueCode: "amazon/duplicate_sku", title: "Duplicate SKU", category: "sku" }),
    ).toBe("duplicate");
  });

  it("classifies title_too_long as length_limit", () => {
    expect(
      classifyIssue({
        ...base,
        issueCode: "ebay/title_too_long",
        title: "Title exceeds 80 characters",
        category: "compliance",
        explanation: "eBay enforces a hard 80-character limit.",
      }),
    ).toBe("length_limit");
  });

  it("classifies invalid_action as enum", () => {
    expect(
      classifyIssue({
        ...base,
        issueCode: "ebay/invalid_action",
        title: "Invalid Action value",
        category: "structure",
        platform: "ebay",
      }),
    ).toBe("enum");
  });

  it("classifies blank_quantity (inventory) as inventory", () => {
    expect(
      classifyIssue({
        ...base,
        issueCode: "amazon/missing_quantity",
        title: "Missing quantity",
        category: "inventory",
        explanation: "Quantity must be a whole number.",
      }),
    ).toBe("inventory");
  });
});

// ---------------------------------------------------------------------------
// expandIssueContent -- section presence
// ---------------------------------------------------------------------------

describe("expandIssueContent", () => {
  const booleanInput = {
    issueCode: "shopify/invalid_boolean_published",
    title: "Invalid Published value",
    explanation: "Published on online store has a non-boolean value.",
    whyPlatformCares: "Shopify expects TRUE/FALSE.",
    howToFix: "Use TRUE, FALSE, or leave blank.",
    category: "compliance",
    autoFixable: true,
    blocking: true,
    platform: "shopify",
  };

  it("returns all required top-level fields", () => {
    const result = expandIssueContent(booleanInput);
    expect(result.issueType).toBe("boolean");
    expect(result.whereItAppears).toBeTruthy();
    expect(result.excelSteps.length).toBeGreaterThan(0);
    expect(result.sheetsSteps.length).toBeGreaterThan(0);
    expect(result.preventTips.length).toBeGreaterThan(0);
    expect(result.striveNote).toBeTruthy();
  });

  it("provides valid values for boolean issues", () => {
    const result = expandIssueContent(booleanInput);
    expect(result.validValues).not.toBeNull();
    expect(result.validValues?.join(" ")).toContain("TRUE");
  });

  it("provides examples for boolean issues", () => {
    const result = expandIssueContent(booleanInput);
    expect(result.examples.length).toBeGreaterThan(0);
    const bads = result.examples.map((e) => e.bad.toLowerCase());
    expect(bads).toContain("yes");
  });

  it("includes Shopify-specific platform note for booleans", () => {
    const result = expandIssueContent(booleanInput);
    expect(result.platformNote).not.toBeNull();
    expect(result.platformNote?.toLowerCase()).toContain("shopify");
  });

  it("Amazon boolean uses y/n not TRUE/FALSE", () => {
    const result = expandIssueContent({ ...booleanInput, platform: "amazon", issueCode: "amazon/invalid_boolean_field" });
    expect(result.validValues?.join(" ")).toContain("y");
    expect(result.examples[0].good).toBe("y");
  });

  it("money issue has Excel steps mentioning currency symbols", () => {
    const result = expandIssueContent({
      issueCode: "ebay/invalid_price",
      title: "Invalid StartPrice",
      explanation: "StartPrice must be a decimal number.",
      whyPlatformCares: "Invalid prices cause upload failures.",
      howToFix: "Use a plain decimal like 19.99.",
      category: "pricing",
      autoFixable: false,
      blocking: true,
      platform: "ebay",
    });
    expect(result.issueType).toBe("money");
    const excelText = result.excelSteps.join(" ").toLowerCase();
    expect(excelText).toContain("currency");
    expect(result.examples.length).toBeGreaterThan(0);
  });

  it("required_header issue lists steps for downloading template", () => {
    const result = expandIssueContent({
      issueCode: "shopify/missing_required_header",
      title: "Missing required column",
      explanation: "Your CSV is missing a required column.",
      whyPlatformCares: "Shopify validates headers.",
      howToFix: "Add the missing header.",
      category: "structure",
      autoFixable: true,
      blocking: true,
      platform: "shopify",
    });
    expect(result.issueType).toBe("required_header");
    const combined = [...result.excelSteps, ...result.sheetsSteps].join(" ").toLowerCase();
    expect(combined).toContain("template");
  });
});

// ---------------------------------------------------------------------------
// MDX encoding check
// ---------------------------------------------------------------------------

describe("MDX file encoding", () => {
  // Common mojibake sequences expressed as Unicode escape sequences to avoid
  // source-file encoding issues in the test runner itself:
  //   \u00e2\u20ac\u2122 = "a^euro-TM" = Windows-1252 misread of curly apostrophe
  //   \u00e2\u20ac\u201d = "a^euro-rdquo" = Windows-1252 misread of em dash
  //   \uFEFF            = raw BOM character (U+FEFF)
  //   \u00c3\u00a9      = "A-tilde-c-acute" = Windows-1252 misread of e-acute
  const MOJIBAKE_ESCAPES = [
    "\u00e2\u20ac\u2122",
    "\u00e2\u20ac\u201d",
    "\uFEFF",
    "\u00c3\u00a9",
    "\u00c3\u00bc",
  ];

  it("csv-basics-for-imports.mdx contains no mojibake sequences and no BOM", () => {
    const guide = readCuratedGuide("general", "csv-basics-for-imports");
    expect(guide).not.toBeNull();
    const all = guide!.rawMdx + JSON.stringify(guide!.frontmatter);
    expect(guide!.rawMdx.charCodeAt(0)).not.toBe(0xfeff);
    for (const seq of MOJIBAKE_ESCAPES) {
      expect(all).not.toContain(seq);
    }
  });

  it("merge-two-csv-files.mdx contains no mojibake sequences and no BOM", () => {
    const guide = readCuratedGuide("general", "merge-two-csv-files");
    expect(guide).not.toBeNull();
    const all = guide!.rawMdx + JSON.stringify(guide!.frontmatter);
    expect(guide!.rawMdx.charCodeAt(0)).not.toBe(0xfeff);
    for (const seq of MOJIBAKE_ESCAPES) {
      expect(all).not.toContain(seq);
    }
  });

  it("MDX files load without error, have non-empty content, and contain expected text", () => {
    const basics = readCuratedGuide("general", "csv-basics-for-imports");
    const merge = readCuratedGuide("general", "merge-two-csv-files");
    expect(basics?.rawMdx.length).toBeGreaterThan(500);
    expect(merge?.rawMdx.length).toBeGreaterThan(500);
    // Spot-check expected readable English text is present (garbled files fail this)
    expect(basics?.rawMdx).toContain("UTF-8");
    expect(merge?.rawMdx).toContain("CSV");
  });
});
