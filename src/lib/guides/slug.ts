// src/lib/guides/slug.ts
// Shared slug utilities used by both mdxHeadings.ts (server-side extraction)
// and rehypeWrapSections.ts (rehype plugin) to guarantee id consistency.

/**
 * Convert a heading text to a URL-safe id.
 * Identical input always produces identical output across all consumers.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Return a unique slug by appending -2, -3, … when base has been seen before.
 *
 * @param base  Already-slugified heading text.
 * @param used  Mutable map that tracks how many times each base has been used.
 *              Callers must share this map across all headings in a document.
 *
 * Examples (fresh `used` map each time):
 *   dedupeSlug("overview", used) → "overview"   (used["overview"] = 1)
 *   dedupeSlug("overview", used) → "overview-2" (used["overview"] = 2)
 *   dedupeSlug("overview", used) → "overview-3" (used["overview"] = 3)
 *   dedupeSlug("details",  used) → "details"    (used["details"] = 1)
 */
export function dedupeSlug(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}
