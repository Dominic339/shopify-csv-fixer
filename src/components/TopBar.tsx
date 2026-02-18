// src/components/TopBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string; // "active" etc
};

type SupabaseUser = {
  email?: string | null;
};

type SupabaseSession = {
  user?: SupabaseUser | null;
};

function isActiveAdvanced(sub?: Partial<SubStatus> | null) {
  const plan = (sub?.plan ?? "free") as "free" | "basic" | "advanced";
  const status = (sub?.status ?? "").toLowerCase();
  return plan === "advanced" && status === "active";
}

export default function TopBar() {
  const { theme, toggle } = useTheme();

  const logoSrc = useMemo(() => {
    return theme === "light" ? "/StriveFormatsLight.png" : "/StriveFormatsDark.png";
  }, [theme]);

  const [sub, setSub] = useState<SubStatus>({
    signedIn: false,
    plan: "free",
    status: "none",
  });

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const session = (data?.session as SupabaseSession | null) ?? null;

        const signedIn = Boolean(session?.user?.email);

        let plan: "free" | "basic" | "advanced" = "free";
        let status = "none";

        try {
          const r = await fetch("/api/subscription/status", { cache: "no-store" });
          const j = await r.json();
          plan = (j?.plan ?? "free") as "free" | "basic" | "advanced";
          status = (j?.status ?? "none") as string;
        } catch {
          // ignore
        }

        if (!mounted) return;

        setSub({
          signedIn,
          plan,
          status,
        });
      } catch {
        // ignore
      }
    }

    void loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const showCustomFormats = isActiveAdvanced(sub);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src={logoSrc} alt="StriveFormats" width={44} height={44} priority />
          <div className="text-lg font-semibold tracking-tight text-[var(--text)]">StriveFormats</div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link className="rgb-btn" href="/app">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">CSV Fixer</span>
          </Link>

          <Link className="rgb-btn" href="/presets">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Templates</span>
          </Link>

          <Link className="rgb-btn" href="/#pricing">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">View pricing</span>
          </Link>

          {showCustomFormats ? (
            <Link className="rgb-btn" href="/formats">
              <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
            </Link>
          ) : null}

          <button
            type="button"
            className="pill-btn"
            onClick={toggle}
            aria-label="Toggle theme"
            title="Toggle light/dark mode"
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>

          <Link
            className="pill-btn"
            href={sub.signedIn ? "/profile" : "/auth"}
            title={sub.signedIn ? "Profile" : "Sign in"}
          >
            {sub.signedIn ? "Profile" : "Sign in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
