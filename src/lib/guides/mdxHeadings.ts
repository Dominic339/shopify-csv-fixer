// src/lib/guides/mdxHeadings.ts
// Server-side extraction of h2/h3 headings from raw MDX text for TOC generation.

export type TocItem = {
  level: 2 | 3;
  text: string;
  /** Stable slug ID — must match the id added by rehypeWrapSections / custom h3 component. */
  id: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractTocFromMdx(rawMdx: string): TocItem[] {
  const items: TocItem[] = [];
  for (const line of rawMdx.split("\n")) {
    // h3 check must come before h2 since "###" also contains "##"
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      items.push({ level: 3, text, id: slugify(text) });
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const text = h2[1].trim();
      items.push({ level: 2, text, id: slugify(text) });
    }
  }
  return items;
}
