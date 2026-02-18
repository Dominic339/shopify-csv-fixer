"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

// Minimal local types to avoid depending on supabase-js exported types.
type SupabaseUser = {
  email?: string | null;
};

type SupabaseSession = {
  user?: SupabaseUser | null;
};

export function TopBar() {
  const { theme, toggle } = useTheme();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const signedIn = Boolean(session?.user);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setSession((data?.session as any) ?? null);
      } catch {
        // ignore
      }

      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" });
        const json = (await res.json()) as SubStatus;
        if (!cancelled) setSub(json);
      } catch {
        // ignore
      }
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession((nextSession as any) ?? null);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const logoSrc = theme === "light" ? "/StriveFormatsLight.png" : "/StriveFormatsDark.png";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg)]/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src={logoSrc} alt="StriveFormats" width={44} height={44} priority className="rounded-xl" />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-[var(--text)]">StriveFormats</div>
            <div className="text-xs text-[color:rgba(var(--muted-rgb),1)]">CSV fixer for ecommerce imports</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <button type="button" className="pill-btn" onClick={toggle}>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>

          <Link className="rg-btn" href="/app?preset=shopify_products">
            CSV Fixer
          </Link>
          <Link className="rg-btn" href="/presets">
            Templates
          </Link>
          <Link className="rg-btn" href="/#pricing">
            View pricing
          </Link>

          {signedIn ? (
            <Link className="pill-btn" href="/profile">
              Profile
            </Link>
          ) : (
            <Link className="pill-btn" href="/auth">
              Sign in
            </Link>
          )}

          {sub?.plan === "advanced" && sub?.status === "active" ? (
            <Link className="pill-btn" href="/formats">
              Custom formats
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
