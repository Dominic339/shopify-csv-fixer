"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

export function Header() {
  const { theme, toggle } = useTheme();
  const [sub, setSub] = useState<SubStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subscription/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const plan = (j?.plan ?? "free") as SubStatus["plan"];
        const status = String(j?.status ?? "unknown");
        const signedIn = Boolean(j?.signedIn);
        setSub({ plan, status, signedIn });
      })
      .catch(() => {
        if (cancelled) return;
        setSub({ plan: "free", status: "unknown", signedIn: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canAccessCustomFormats = useMemo(() => {
    if (ALLOW_CUSTOM_FORMATS_FOR_ALL) return true;
    return sub?.plan === "advanced" && sub?.status === "active";
  }, [sub]);

  const customFormatsHref = useMemo(() => {
    if (canAccessCustomFormats) return "/formats";
    return sub?.signedIn ? "/profile" : "/login";
  }, [canAccessCustomFormats, sub?.signedIn]);

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[var(--surface-2)]" />
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              CSNest
            </div>
            <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="pill-btn"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "Dark" : "Light"}
        </button>

        <Link href="/app" className="nav-pill is-active">
          CSV Fixer
        </Link>

        <Link
          href={customFormatsHref}
          className={`nav-pill ${!canAccessCustomFormats ? "opacity-60" : ""}`}
          title={
            canAccessCustomFormats
              ? "Open Custom Formats"
              : sub?.signedIn
              ? "Manage your plan in Profile"
              : "Sign in to manage your plan"
          }
        >
          Custom Formats
        </Link>

        <Link
          href={sub?.signedIn ? "/profile" : "/login"}
          className="avatar"
          aria-label="Account"
        >
          <span className="avatar-initial">D</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
