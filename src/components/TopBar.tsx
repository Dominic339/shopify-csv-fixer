// src/components/TopBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
} | null;

export default function TopBar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<SubStatus | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { theme, toggle } = useTheme();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await supabase.auth.getUser();
        // res shape varies by supabase-js version, so read safely
        const userEmail = (res as any)?.data?.user?.email ?? (res as any)?.user?.email ?? null;

        if (!mounted) return;
        setEmail(userEmail);
      } catch {
        if (!mounted) return;
        setEmail(null);
      }
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange(
      (_event: string, session: SupabaseSession) => {
        setEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [supabase]);

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
  }, [email]);

  const isAdvanced = useMemo(() => {
    return !!sub?.signedIn && sub.plan === "advanced" && sub.status === "active";
  }, [sub]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  function goToPricing() {
    setOpen(false);

    // If already on home, scroll to #pricing
    if (pathname === "/") {
      const el = document.getElementById("pricing");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.location.hash = "pricing";
      }
      return;
    }

    // Otherwise navigate to home + hash
    router.push("/#pricing");
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/CSV%20Nest%20Logo.png"
            alt="CSNest"
            width={28}
            height={28}
            priority
            className="rounded-md"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--text)]">CSNest</div>
            <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
          </div>
        </Link>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)]/80"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>

          <Link href="/app" className="rgb-btn">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">CSV Fixer</span>
          </Link>

          <button type="button" onClick={goToPricing} className="rgb-btn" aria-label="View pricing">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </button>

          {canAccessCustomFormats ? (
            <Link href="/formats" className="rgb-btn">
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">
                Custom Formats
              </span>
            </Link>
          ) : (
            <button
              type="button"
              className="rgb-btn opacity-60"
              onClick={() => setUpgradeOpen(true)}
              aria-label="Custom Formats (Advanced)"
            >
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">
                Custom Formats
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)]"
            aria-label="Account menu"
          >
            {email ? email[0]?.toUpperCase() : "?"}
          </button>

          {open ? (
            <div
              className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border"
              style={{
                background: "var(--popover)",
                borderColor: "var(--popover-border)",
              }}
            >
              <div className="px-4 py-3">
                <div className="text-xs text-[var(--muted)]">{email ? "Signed in" : "Guest"}</div>
                <div className="truncate text-sm font-semibold text-[var(--text)]">
                  {email ?? "Not signed in"}
                </div>
              </div>

              <div className="border-t" style={{ borderColor: "var(--popover-border)" }} />

              <div className="p-2">
                {email ? (
                  <Link
                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-black/10 hover:dark:bg-white/10"
                    href="/profile"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>
                ) : null}

                <Link
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-black/10 hover:dark:bg-white/10"
                  href="/"
                  onClick={() => setOpen(false)}
                >
                  Home
                </Link>

                <button
                  type="button"
                  className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text)] hover:bg-black/10 hover:dark:bg-white/10"
                  onClick={goToPricing}
                >
                  View pricing
                </button>

                <div className="mt-2 border-t" style={{ borderColor: "var(--popover-border)" }} />

                {email ? (
                  <button
                    className="mt-2 w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    onClick={signOut}
                    type="button"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    className="mt-2 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)]/80"
                    href="/login"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        title="Advanced only"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        signedIn={Boolean(sub?.signedIn)}
        upgradePlan="advanced"
        onClose={() => setUpgradeOpen(false)}
      />
    </header>
  );
}
