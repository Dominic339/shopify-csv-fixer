// src/lib/guides/rehypeWrapSections.ts
// Rehype plugin: wraps h2-led sections into <section> elements so the
// MDX component map can render each section as a card.

import type { Element, Root, RootContent } from "hast";
import { slugifyHeading, dedupeSlug } from "./slug";

function nodeTextContent(node: Root | RootContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if ("children" in node && Array.isArray(node.children)) return node.children.map((c) => nodeTextContent(c)).join("");
  return "";
}

export function rehypeWrapSections() {
  return (tree: Root) => {
    const children: RootContent[] = tree.children ?? [];
    const output: RootContent[] = [];
    let current: Element | null = null;

    // Shared dedup map — processed in document order, mirrors extractTocFromMdx.
    const used = new Map<string, number>();

    for (const node of children) {
      const isH2 = node.type === "element" && node.tagName === "h2";
      const isH3 = node.type === "element" && node.tagName === "h3";

      if (isH2) {
        // Assign a deduped, slug-based id to the h2 node.
        const text = nodeTextContent(node);
        const id = dedupeSlug(slugifyHeading(text), used);
        node.properties = { ...(node.properties ?? {}), id };

        // Close the previous section and start a new one.
        if (current) output.push(current);
        current = {
          type: "element",
          tagName: "section",
          properties: { "data-guide-section": "" },
          children: [node as Element],
        };
      } else if (isH3 && current) {
        // Assign matching deduped id to h3 nodes that appear inside a section.
        const text = nodeTextContent(node);
        const id = dedupeSlug(slugifyHeading(text), used);
        node.properties = { ...(node.properties ?? {}), id };
        current.children.push(node as Element);
      } else if (current) {
        current.children.push(node as Element);
      } else {
        // Content before the first h2 stays unwrapped.
        output.push(node);
      }
    }

    if (current) output.push(current);
    tree.children = output;
  };
}
