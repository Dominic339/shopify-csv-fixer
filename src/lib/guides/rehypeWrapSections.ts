// src/lib/guides/rehypeWrapSections.ts
// Rehype plugin: wraps h2-led sections into <section> elements so the
// MDX component map can render each section as a card.

function nodeTextContent(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) return node.children.map(nodeTextContent).join("");
  return "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function rehypeWrapSections() {
  return (tree: any) => {
    const children: any[] = tree.children ?? [];
    const output: any[] = [];
    let current: any = null;

    for (const node of children) {
      const isH2 = node.type === "element" && node.tagName === "h2";

      if (isH2) {
        // Assign a stable slug-based id to the h2 for anchor linking + IntersectionObserver
        const text = nodeTextContent(node);
        const id = slugify(text);
        node.properties = { ...(node.properties ?? {}), id };

        // Close the previous section and start a new one
        if (current) output.push(current);
        current = {
          type: "element",
          tagName: "section",
          properties: { "data-guide-section": "" },
          children: [node],
        };
      } else if (current) {
        current.children.push(node);
      } else {
        // Content before the first h2 stays unwrapped
        output.push(node);
      }
    }

    if (current) output.push(current);
    tree.children = output;
  };
}
