"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { GUIDE_PLATFORMS, PLATFORM_LABEL } from "@/lib/guidesConstants";
import type { GuidePlatform } from "@/lib/guidesConstants";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export default function GuideSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  // Detect locale prefix: /fr/guides/shopify → locale="fr", /guides/shopify → locale=null
  const parts = pathname.split("/").filter(Boolean);
  const firstSegment = parts[0] ?? "";
  const hasLocale = isValidLocale(firstSegment) && firstSegment !== DEFAULT_LOCALE;
  const locale = hasLocale ? firstSegment : null;

  // Base path for all guide links (locale-prefixed when needed)
  const guidesBase = locale ? `/${locale}/guides` : "/guides";

  // Find "guides" index in path, then derive active platform from the next segment
  const guidesIdx = parts.indexOf("guides");
  const platformCandidate = guidesIdx >= 0 ? parts[guidesIdx + 1] : undefined;
  const activePlatform: GuidePlatform | undefined =
    platformCandidate && (GUIDE_PLATFORMS as string[]).includes(platformCandidate)
      ? (platformCandidate as GuidePlatform)
      : undefined;

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.push(`${guidesBase}?${params.toString()}`);
    },
    [router, guidesBase],
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
                href={guidesBase}
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
                  href={`${guidesBase}/${p}`}
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
