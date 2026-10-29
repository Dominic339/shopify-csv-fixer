// src/views/mdxGuideComponents.tsx
// MDX element styling for curated guides: each H2 section (wrapped by rehypeWrapSections)
// renders as a card.

import { isValidElement, type ReactNode } from "react";
import { CsvSheet, parseCsvBlock } from "@/components/guides/CsvSheet";
import { slugifyHeading } from "@/lib/guides/slug";
import { localeHref, type Locale } from "@/lib/i18n/locales";
import { isLocalisedPath } from "@/lib/i18n/paths";

type C = { children?: ReactNode };

export const mdxGuideComponents = {
  section: ({ children, ...props }: C & Record<string, unknown>) => (
    <section {...props} className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      {children}
    </section>
  ),
  h2: ({ children, id }: C & { id?: string }) => (
    <h2 id={id} className="scroll-mt-24 text-xl font-semibold text-[var(--text)]">
      {children}
    </h2>
  ),
  h3: ({ children }: C) => (
    <h3 id={slugifyHeading(typeof children === "string" ? children : "")} className="mt-4 scroll-mt-24 text-base font-semibold text-[var(--text)]">
      {children}
    </h3>
  ),
  p: ({ children }: C) => <p className="text-base leading-relaxed text-[color:rgba(var(--muted-rgb),1)]">{children}</p>,
  ul: ({ children }: C) => <ul className="list-disc space-y-1.5 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">{children}</ul>,
  ol: ({ children }: C) => <ol className="list-decimal space-y-1.5 pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">{children}</ol>,
  li: ({ children }: C) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }: C & { className?: string }) =>
    className ? (
      <code className={`${className} text-sm text-[var(--code-text)]`}>{children}</code>
    ) : (
      <code className="break-words rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-sm text-[var(--text)]">
        {children}
      </code>
    ),
  pre: ({ children }: C) => (
    <pre className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--code-bg)] p-4 font-mono text-sm leading-relaxed text-[var(--code-text)]">
      {children}
    </pre>
  ),
  table: ({ children }: C) => (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: C) => <thead className="bg-[var(--surface-2)]">{children}</thead>,
  tr: ({ children }: C) => <tr className="border-b border-[var(--border)] last:border-b-0">{children}</tr>,
  th: ({ children }: C) => <th className="px-3 py-2 text-left font-semibold text-[var(--text)]">{children}</th>,
  td: ({ children }: C) => <td className="px-3 py-2 align-top text-[color:rgba(var(--muted-rgb),1)]">{children}</td>,
  hr: () => <div className="my-1 border-t border-[color:rgba(var(--border-rgb),0.35)]" />,
  a: ({ children, href }: C & { href?: string }) => (
    <a
      href={href}
      className="text-[var(--accent)] underline decoration-[color:rgba(var(--accent-rgb),0.4)] hover:opacity-80"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }: C) => <strong className="font-semibold text-[var(--text)]">{children}</strong>,
  blockquote: ({ children }: C) => (
    <blockquote className="border-l-4 border-[var(--border)] pl-4 italic text-[color:rgba(var(--muted-rgb),0.8)]">{children}</blockquote>
  ),
};

/** A plain CSV example reads better as a spreadsheet than as a wall of commas. */
function preAsSheet({ children }: C) {
  const code = isValidElement<{ children?: unknown; className?: string }>(children) ? children.props : null;
  const rows = code && typeof code.children === "string" && !code.className ? parseCsvBlock(code.children) : null;
  return rows ? <CsvSheet rows={rows} label="CSV" /> : mdxGuideComponents.pre({ children });
}

/**
 * The components for a guide in `locale`: site links ("/app?preset=...") point at that
 * locale's pages, and with `csvSheets` CSV examples render as spreadsheets. (The general
 * guides teach CSV syntax itself, so they keep the raw text.)
 */
export function mdxGuideComponentsFor(locale: Locale, { csvSheets = false }: { csvSheets?: boolean } = {}) {
  const base = csvSheets ? { ...mdxGuideComponents, pre: preAsSheet } : mdxGuideComponents;
  if (locale === "en") return base;
  const localize = (href?: string) => {
    if (!href?.startsWith("/") || href.startsWith("//")) return href;
    const path = href.split(/[?#]/)[0];
    return isLocalisedPath(path) ? localeHref(locale, path) + href.slice(path.length) : href;
  };
  return {
    ...base,
    a: ({ children, href }: C & { href?: string }) => mdxGuideComponents.a({ children, href: localize(href) }),
  };
}
