// src/components/Breadcrumbs.tsx
// Renders a visible breadcrumb nav and emits a BreadcrumbList JSON-LD script.

import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string; // omit href for the current (last) page
};

type Props = {
  items: BreadcrumbItem[];
  /** Base URL used in JSON-LD; defaults to https://striveformats.com */
  baseUrl?: string;
};

export default function Breadcrumbs({ items, baseUrl = "https://striveformats.com" }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && <span aria-hidden="true">/</span>}
                {item.href && !isLast ? (
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-[var(--text)]" : ""}>{item.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
