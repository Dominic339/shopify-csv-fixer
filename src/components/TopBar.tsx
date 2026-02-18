// src/components/TopBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";

// Minimal local types to avoid depending on supabase-js exported types.
type SupabaseUser = {
  email?: string | null;
};

type SupabaseSession =
  | {
      user?: SupabaseUser | null;
    }
  | null;

export default function TopBar() {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const { theme, toggle } = useTheme();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await supabase.auth.getUser();
        const userEmail = (res as any)?.data?.user?.email ?? (res as any)?.user?.email ?? null;
        if (!mounted) return;
        setEmail(userEmail);
      } catch {
        if (!mounted) return;
        setEmail(null);
      }
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event: unknown, session: SupabaseSession) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [supabase]);

  function goToPricing() {
    setOpen(false);
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.href = "/#pricing";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="relative h-9 w-[260px] sm:w-[320px] md:w-[420px]">
            <Image
              src="/CSV Nest Logo.png"
              alt="StriveFormats"
              fill
              priority
              className="object-contain object-left"
              sizes="(max-width: 640px) 260px, (max-width: 768px) 320px, 420px"
            />
          </div>
        </Link>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)]/80"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <Link href="/app?preset=shopify_products" className="rgb-btn" onClick={() => setOpen(false)}>
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">CSV Fixer</span>
          </Link>

          <Link href="/presets" className="rgb-btn" onClick={() => setOpen(false)}>
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Templates</span>
          </Link>

          <button type="button" onClick={goToPricing} className="rgb-btn" aria-label="View pricing">
            <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] md:h-11 md:w-11"
            aria-label="Account menu"
          >
            {email ? email[0]?.toUpperCase() : "?"}
          </button>

          {open ? (
            <div
              className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border"
              style={{ background: "var(--popover)", borderColor: "var(--popover-border)" }}
            >
              <div className="px-4 py-3">
                <div className="text-xs text-[var(--muted)]">{email ? "Signed in" : "Guest"}</div>
                <div className="truncate text-sm font-semibold text-[var(--text)]">{email ?? "Not signed in"}</div>
              </div>

              <div className="border-t" style={{ borderColor: "var(--popover-border)" }}>
                <Link href="/profile" className="menu-item" onClick={() => setOpen(false)}>
                  Profile
                </Link>
                <Link href="/login" className="menu-item" onClick={() => setOpen(false)}>
                  {email ? "Switch account" : "Sign in"}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
