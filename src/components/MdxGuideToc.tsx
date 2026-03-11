// src/components/MdxGuideToc.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/guides/mdxHeadings";

type Props = { items: TocItem[]; onThisPage?: string };

export default function MdxGuideToc({ items, onThisPage }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  // Track which ids are currently intersecting
  const intersectingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!items.length) return;
    const ids = items.map((i) => i.id);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersectingRef.current.add(entry.target.id);
          } else {
            intersectingRef.current.delete(entry.target.id);
          }
        }
        // Active = the first (topmost) id that is currently intersecting
        const first = ids.find((id) => intersectingRef.current.has(id));
        if (first) setActiveId(first);
      },
      // Observe a narrow band near the top of the viewport (below sticky nav)
      { rootMargin: "-80px 0% -72% 0%", threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <nav aria-label="On this page" data-testid="guide-toc">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),0.7)]">
        {onThisPage ?? "On this page"}
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id} style={{ paddingLeft: item.level === 3 ? "0.75rem" : undefined }}>
              <a
                href={`#${item.id}`}
                className={
                  "block rounded-lg px-2 py-1 text-sm transition-colors " +
                  (isActive
                    ? "font-semibold text-[var(--accent)]"
                    : "text-[color:rgba(var(--muted-rgb),1)] hover:text-[var(--text)]")
                }
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
