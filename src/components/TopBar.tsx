// src/components/TopBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

// Minimal local types to avoid depending on supabase-js exported types.
// These are enough for what TopBar uses.
type SupabaseUser = {
  email?: string | null;
};

type SupabaseSession = {
  user?: SupabaseUser | null;
};

export function TopBar() {
  const supabase = useMemo(() => createClient(), []);

  // ✅ FIX: ThemeProvider exposes "toggle", not "toggleTheme"
  const { theme, toggle } = useTheme();

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session as SupabaseSession | null;

        if (!session?.user) {
          if (!cancelled) setSub({ signedIn: false, plan: "free", status: "signed_out" });
          return;
        }

        const res = await fetch("/api/subscription", { cache: "no-store" }).catch(() => null);
        if (!res || !res.ok) {
          if (!cancelled) setSub({ signedIn: true, plan: "free", status: "unknown" });
          return;
        }

        const json = (await res.json()) as Partial<SubStatus>;
        if (!cancelled) {
          setSub({
            signedIn: Boolean(json?.signedIn ?? true),
            plan: (json?.plan as SubStatus["plan"]) ?? "free",
            status: (json?.status as string) ?? "ok",
          });
        }
      } catch {
        if (!cancelled) setSub({ signedIn: false, plan: "free", status: "error" });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const canAccessCustomFormats = useMemo(() => {
    if (ALLOW_CUSTOM_FORMATS_FOR_ALL) return true;
    return sub?.plan === "advanced";
  }, [sub]);

  function goToPricing() {
    const el = document.getElementById("pricing");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#pricing";
    }
    setOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/CSV Nest Logo.png" alt="StriveFormats" width={36} height={36} priority />
          <div className="flex flex-col leading-tight">
            <div className="text-sm font-semibold text-white">StriveFormats</div>
            <div className="text-xs text-white/70">CSV validation and safe auto-fixes</div>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/ecommerce-csv-fixer" className="rgb-btn">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Ecommerce CSV Fixer</span>
          </Link>

          <Link href="/app" className="rgb-btn">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Open Fixer</span>
          </Link>

          <Link href="/presets" className="rgb-btn">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Preset Formats</span>
          </Link>

          <button type="button" onClick={goToPricing} className="rgb-btn" aria-label="View pricing">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </button>

          {canAccessCustomFormats ? (
            <Link href="/formats" className="rgb-btn">
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
            </Link>
          ) : (
            <button
              type="button"
              className="rgb-btn"
              onClick={() => setUpgradeOpen(true)}
              aria-label="Custom Formats require upgrade"
            >
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
            </button>
          )}

          <button type="button" className="rgb-btn" onClick={toggle} aria-label="Toggle theme">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          {sub?.signedIn ? (
            <>
              <Link href="/profile" className="rgb-btn">
                <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Profile</span>
              </Link>
              <button type="button" className="rgb-btn" onClick={signOut}>
                <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Sign out</span>
              </button>
            </>
          ) : (
            <Link href="/login" className="rgb-btn">
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Sign in</span>
            </Link>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <button type="button" className="rgb-btn" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">{open ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-black/60 backdrop-blur md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3">
            <Link href="/ecommerce-csv-fixer" className="rgb-btn" onClick={() => setOpen(false)}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Ecommerce CSV Fixer</span>
            </Link>

            <Link href="/app" className="rgb-btn" onClick={() => setOpen(false)}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Open Fixer</span>
            </Link>

            <Link href="/presets" className="rgb-btn" onClick={() => setOpen(false)}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Preset Formats</span>
            </Link>

            <button type="button" onClick={goToPricing} className="rgb-btn" aria-label="View pricing">
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">View pricing</span>
            </button>

            {canAccessCustomFormats ? (
              <Link href="/formats" className="rgb-btn" onClick={() => setOpen(false)}>
                <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setUpgradeOpen(true);
                }}
                className="rgb-btn"
                aria-label="Custom Formats require upgrade"
              >
                <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
              </button>
            )}

            <button
              type="button"
              className="rgb-btn"
              onClick={() => {
                toggle();
                setOpen(false);
              }}
              aria-label="Toggle theme"
            >
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </button>

            {sub?.signedIn ? (
              <>
                <Link href="/profile" className="rgb-btn" onClick={() => setOpen(false)}>
                  <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Profile</span>
                </Link>
                <button type="button" className="rgb-btn" onClick={signOut}>
                  <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Sign out</span>
                </button>
              </>
            ) : (
              <Link href="/login" className="rgb-btn" onClick={() => setOpen(false)}>
                <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      ) : null}

      <UpgradeModal
        open={upgradeOpen}
        title="Upgrade required"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        signedIn={Boolean(sub?.signedIn)}
        onClose={() => setUpgradeOpen(false)}
      />
    </header>
  );
}

export default TopBar;
