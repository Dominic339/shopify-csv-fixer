// src/lib/guides/mdxHeadings.ts
// Server-side extraction of h2/h3 headings from raw MDX text for TOC generation.

import { slugifyHeading, dedupeSlug } from "./slug";

export type TocItem = {
  level: 2 | 3;
  text: string;
  /** Stable slug ID — guaranteed to match the id set by rehypeWrapSections. */
  id: string;
};

// Re-export for consumers that import slugifyHeading via this module.
export { slugifyHeading } from "./slug";

export function extractTocFromMdx(rawMdx: string): TocItem[] {
  const items: TocItem[] = [];
  // Shared dedup map — processed in document order, mirrors rehypeWrapSections.
  const used = new Map<string, number>();

  for (const line of rawMdx.split("\n")) {
    // h3 check must come before h2 since "###" also contains "##"
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      const id = dedupeSlug(slugifyHeading(text), used);
      items.push({ level: 3, text, id });
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const text = h2[1].trim();
      const id = dedupeSlug(slugifyHeading(text), used);
      items.push({ level: 2, text, id });
    }
  }
  return items;
}
