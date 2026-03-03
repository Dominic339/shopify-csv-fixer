"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { GUIDE_PLATFORMS, PLATFORM_LABEL } from "@/lib/guidesConstants";
import type { GuidePlatform } from "@/lib/guidesConstants";

export default function GuideSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  // Derive active platform from pathname: /guides/shopify/... → "shopify"
  const parts = pathname.split("/").filter(Boolean);
  const maybePlatform = parts.length >= 2 ? parts[1] : undefined;
  const activePlatform: GuidePlatform | undefined =
    maybePlatform && (GUIDE_PLATFORMS as string[]).includes(maybePlatform)
      ? (maybePlatform as GuidePlatform)
      : undefined;

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.push(`/guides?${params.toString()}`);
    },
    [router],
  );

  return (
    <aside className="w-52 shrink-0">
      <div className="sticky top-24">
        <input
          type="search"
          placeholder="Search guides…"
          defaultValue={q}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[color:rgba(var(--muted-rgb),0.6)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        />
        <nav>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),1)]">
            Platforms
          </div>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/guides"
                className={`block rounded-lg px-3 py-1.5 text-sm ${
                  !activePlatform
                    ? "bg-[var(--surface)] font-semibold text-[var(--text)]"
                    : "text-[color:rgba(var(--muted-rgb),1)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                }`}
              >
                All guides
              </Link>
            </li>
            {GUIDE_PLATFORMS.map((p) => (
              <li key={p}>
                <Link
                  href={`/guides/${p}`}
                  className={`block rounded-lg px-3 py-1.5 text-sm ${
                    activePlatform === p
                      ? "bg-[var(--surface)] font-semibold text-[var(--text)]"
                      : "text-[color:rgba(var(--muted-rgb),1)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                  }`}
                >
                  {PLATFORM_LABEL[p]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
