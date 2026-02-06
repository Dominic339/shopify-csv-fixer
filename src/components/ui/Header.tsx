"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

export function Header() {
  const { theme, toggle } = useTheme();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/subscription/status", { cache: "no-store" });
        const j = (await r.json()) as SubStatus;
        if (!cancelled) setSub(j);
      } catch {
        if (!cancelled) setSub(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdvanced = useMemo(() => {
    return !!sub?.signedIn && sub.plan === "advanced" && sub.status === "active";
  }, [sub]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] shadow-sm">
            🧾
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">CSNest</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/app"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
          >
            CSV Fixer
          </Link>

          {canAccessCustomFormats ? (
            <Link
              href="/formats"
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
            >
              Custom Formats
            </Link>
          ) : (
            <button
              type="button"
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] opacity-60"
              onClick={() => setUpgradeOpen(true)}
            >
              Custom Formats
            </button>
          )}

          <button
            onClick={toggle}
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
            aria-label="Toggle theme"
            type="button"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </nav>
      </div>

      <div
        className="h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3), var(--accent-4), var(--accent-5))",
        }}
      />

      <UpgradeModal
        open={upgradeOpen}
        title="Advanced only"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        onClose={() => setUpgradeOpen(false)}
      />
    </header>
  );
}
