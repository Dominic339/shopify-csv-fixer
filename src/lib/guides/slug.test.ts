// src/lib/guides/slug.test.ts
import { describe, it, expect } from "vitest";
import { slugifyHeading, dedupeSlug } from "./slug";
import { extractTocFromMdx } from "./mdxHeadings";

// ---------------------------------------------------------------------------
// slugifyHeading
// ---------------------------------------------------------------------------

describe("slugifyHeading", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyHeading("What Is a CSV File?")).toBe("what-is-a-csv-file");
  });

  it("collapses multiple non-alphanum chars into one hyphen", () => {
    expect(slugifyHeading("Hello   World!!!")).toBe("hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyHeading("  -- Leading / Trailing --  ")).toBe("leading-trailing");
  });

  it("handles apostrophes (curly and straight) identically", () => {
    // Both the curly apostrophe (U+2019) and straight apostrophe are non-alphanumeric
    // and should produce the same slug.
    const straight = slugifyHeading("What's New");
    const curly = slugifyHeading("What\u2019s New");
    expect(straight).toBe("what-s-new");
    expect(curly).toBe("what-s-new");
    expect(straight).toBe(curly);
  });

  it("produces same slug for headings that differ only in punctuation", () => {
    expect(slugifyHeading("What's New?")).toBe(slugifyHeading("What\u2019s New?"));
  });
});

// ---------------------------------------------------------------------------
// dedupeSlug
// ---------------------------------------------------------------------------

describe("dedupeSlug", () => {
  it("returns base for the first occurrence", () => {
    const used = new Map<string, number>();
    expect(dedupeSlug("overview", used)).toBe("overview");
  });

  it("returns base-2 for the second occurrence", () => {
    const used = new Map<string, number>();
    dedupeSlug("overview", used);
    expect(dedupeSlug("overview", used)).toBe("overview-2");
  });

  it("returns base-3 for the third occurrence", () => {
    const used = new Map<string, number>();
    dedupeSlug("overview", used);
    dedupeSlug("overview", used);
    expect(dedupeSlug("overview", used)).toBe("overview-3");
  });

  it("different bases are tracked independently", () => {
    const used = new Map<string, number>();
    expect(dedupeSlug("overview", used)).toBe("overview");
    expect(dedupeSlug("details", used)).toBe("details");
    expect(dedupeSlug("overview", used)).toBe("overview-2");
    expect(dedupeSlug("details", used)).toBe("details-2");
  });
});

// ---------------------------------------------------------------------------
// extractTocFromMdx — consistency and dedup
// ---------------------------------------------------------------------------

describe("extractTocFromMdx", () => {
  it("extracts H2 ids matching slugifyHeading output", () => {
    const mdx = `## What Is a CSV File?\n\nContent.\n\n## How to Fix It\n\nMore content.`;
    const items = extractTocFromMdx(mdx);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ level: 2, text: "What Is a CSV File?", id: "what-is-a-csv-file" });
    expect(items[1]).toMatchObject({ level: 2, text: "How to Fix It", id: "how-to-fix-it" });
    // Verify ids match direct slugifyHeading output
    expect(items[0].id).toBe(slugifyHeading(items[0].text));
    expect(items[1].id).toBe(slugifyHeading(items[1].text));
  });

  it("extracts H3 ids within H2 sections", () => {
    const mdx = `## Section One\n\n### Subsection A\n\nContent.\n\n### Subsection B\n\nContent.`;
    const items = extractTocFromMdx(mdx);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ level: 2, id: "section-one" });
    expect(items[1]).toMatchObject({ level: 3, id: "subsection-a" });
    expect(items[2]).toMatchObject({ level: 3, id: "subsection-b" });
  });

  it("deduplicates repeated H2 headings with -2, -3 suffixes", () => {
    const mdx = `## Overview\n\nFirst.\n\n## Overview\n\nSecond.\n\n## Overview\n\nThird.`;
    const items = extractTocFromMdx(mdx);
    expect(items.map((i) => i.id)).toEqual(["overview", "overview-2", "overview-3"]);
  });

  it("deduplicates repeated H3 headings across the document", () => {
    const mdx = `## Section\n\n### Step 1\n\n### Step 1\n\n## Another\n\n### Step 1`;
    const items = extractTocFromMdx(mdx);
    const ids = items.map((i) => i.id);
    expect(ids[0]).toBe("section");
    expect(ids[1]).toBe("step-1");
    expect(ids[2]).toBe("step-1-2");
    expect(ids[3]).toBe("another");
    expect(ids[4]).toBe("step-1-3");
  });

  it("deduplication shared between H2 and H3 within one document", () => {
    // If an H3 has the same base slug as an H2, they get different ids.
    const mdx = `## Details\n\n### Details\n`;
    const items = extractTocFromMdx(mdx);
    expect(items[0].id).toBe("details");
    expect(items[1].id).toBe("details-2");
  });

  it("handles punctuation-heavy headings consistently", () => {
    const mdx = `## What's New?\n\nContent.`;
    const items = extractTocFromMdx(mdx);
    expect(items[0].id).toBe("what-s-new");
  });

  it("returns empty array for MDX with no headings", () => {
    expect(extractTocFromMdx("Just a paragraph.\n\nAnother one.")).toEqual([]);
  });
});
