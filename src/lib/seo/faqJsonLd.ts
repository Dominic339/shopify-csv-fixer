// src/lib/seo/faqJsonLd.ts
// Generates a schema.org FAQPage JSON-LD object from an array of Q&A pairs.
// Pass the result to <JsonLd data={...} /> or embed in a @graph array.

export type FaqEntry = {
  q: string;
  a: string;
};

export function buildFaqJsonLd(items: FaqEntry[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
