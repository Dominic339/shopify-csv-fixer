"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UpgradeModal } from "@/components/UpgradeModal";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

// Minimal local types to avoid depending on supabase-js exported types.
type SupabaseUser = { email?: string | null };
type SupabaseSession = { user?: SupabaseUser };

export default function TopBar() {
  const { theme, toggle } = useTheme();

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const logoSrc = useMemo(() => {
    // ThemeProvider uses "light"/"dark"
    return theme === "light" ? "/StriveFormatsLight.png" : "/StriveFormatsDark.png";
  }, [theme]);

  useEffect(() => {
    const supabase = createClient();

    let unsub: { data?: { subscription?: { unsubscribe: () => void } } } | null = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession((data?.session as any) ?? null);
      } catch {
        // ignore
      }
    })();

    unsub = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession((nextSession as any) ?? null);
    });

    return () => {
      try {
        unsub?.data?.subscription?.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        setSub({
          signedIn: Boolean(json?.signedIn),
          plan: (json?.plan ?? "free") as any,
          status: (json?.status ?? "none") as any,
        });
      } catch {
        if (!alive) return;
        setSub({ signedIn: Boolean(session?.user?.email), plan: "free", status: "none" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [session?.user?.email]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      setMenuOpen(false);
      window.location.href = "/";
    }
  }

  const signedIn = Boolean(session?.user?.email);
  const plan = sub?.plan ?? "free";
  const status = (sub?.status ?? "none").toLowerCase();
  const isActive = status === "active";

  const profileLabel = useMemo(() => {
    const email = session?.user?.email ?? "";
    if (!email) return "?";
    return email.slice(0, 1).toUpperCase();
  }, [session?.user?.email]);

  const upgradeTitle = plan === "advanced" ? "Advanced" : "Upgrade";
  const upgradeMessage = signedIn
    ? "Upgrade to unlock higher export limits and advanced Shopify tools."
    : "Sign in to upgrade and unlock higher export limits and advanced Shopify tools.";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={logoSrc}
            alt="StriveFormats"
            width={180}
            height={36}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-3">
          <button
            type="button"
            className="pill-btn"
            onClick={() => toggle()}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>

          <Link className="rgb-btn" href="/app">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">CSV Fixer</span>
          </Link>

          <Link className="rgb-btn" href="/ecommerce-csv-fixer">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Templates</span>
          </Link>

          <button
            type="button"
            className="rgb-btn"
            onClick={() => (window.location.href = "/#pricing")}
          >
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-base font-semibold text-[var(--text)]"
              onClick={() => setMenuOpen((v) => !v)}
              title={signedIn ? "Account" : "Sign in"}
              aria-label="Account menu"
            >
              {signedIn ? profileLabel : "?"}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <div className="px-4 py-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                  {signedIn ? (
                    <div>
                      <div className="font-semibold text-[var(--text)]">{session?.user?.email}</div>
                      <div className="mt-1">
                        Plan: <span className="font-semibold text-[var(--text)]">{plan}</span>{" "}
                        {isActive ? (
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">(active)</span>
                        ) : (
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">({status})</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="font-semibold text-[var(--text)]">Not signed in</div>
                  )}
                </div>

                <div className="border-t border-[var(--border)]" />

                <div className="p-2">
                  <Link
                    href="/"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Home
                  </Link>

                  <Link
                    href="/profile"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>

                  <Link
                    href="/app"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    CSV Fixer
                  </Link>

                  <Link
                    href="/formats"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Custom Formats
                  </Link>

                  <button
                    type="button"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setUpgradeOpen(true);
                    }}
                  >
                    {upgradeTitle}
                  </button>

                  <div className="mt-2 border-t border-[var(--border)]" />

                  {signedIn ? (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                      onClick={signOut}
                    >
                      Sign out
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="mt-2 block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        title={upgradeTitle}
        message={upgradeMessage}
        signedIn={signedIn}
        onClose={() => setUpgradeOpen(false)}
      />
    </header>
  );
}
