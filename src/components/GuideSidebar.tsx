"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { GUIDE_PLATFORMS, PLATFORM_LABEL } from "@/lib/guidesConstants";
import type { GuidePlatform } from "@/lib/guidesConstants";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

type Props = {
  searchPlaceholder?: string;
  allGuides?: string;
  platformsLabel?: string;
};

export default function GuideSidebar({ searchPlaceholder, allGuides, platformsLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // Read ?q after mount instead of useSearchParams, so the sidebar is part of the
  // statically rendered HTML rather than rendered only on the client.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && inputRef.current) inputRef.current.value = q;
  }, [pathname]);

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

  const linkClass = (active: boolean) =>
    `block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
      active
        ? "bg-[var(--surface)] font-semibold text-[var(--text)]"
        : "text-[color:rgba(var(--muted-rgb),1)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
    }`;

  // Mobile: search + a horizontally scrolling row of platforms above the content.
  // Desktop: a sticky sidebar.
  return (
    <aside className="w-full md:w-52 md:shrink-0">
      <div className="md:sticky md:top-24">
        <input
          type="search"
          aria-label={searchPlaceholder ?? "Search guides"}
          placeholder={searchPlaceholder ?? "Search guides…"}
          ref={inputRef}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text)] placeholder:text-[color:rgba(var(--muted-rgb),0.6)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] md:mb-5 md:text-sm"
        />
        <nav aria-label={platformsLabel ?? "Platforms"}>
          <div className="mb-1 hidden text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),1)] md:block">
            {platformsLabel ?? "Platforms"}
          </div>
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:block md:space-y-0.5 md:overflow-visible md:px-0 md:pb-0">
            <li>
              <Link href={guidesBase} className={linkClass(!activePlatform)}>
                {allGuides ?? "All guides"}
              </Link>
            </li>
            {GUIDE_PLATFORMS.map((p) => (
              <li key={p}>
                <Link href={`${guidesBase}/${p}`} className={linkClass(activePlatform === p)}>
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
