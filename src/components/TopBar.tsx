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

// Minimal safe typing to satisfy strict mode
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
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session as SupabaseSession;
        const userEmail = session?.user?.email ?? null;

        if (!cancelled) setEmail(userEmail);

        const r = await fetch("/api/subscription/status", { cache: "no-store" });
        const j = (await r.json()) as SubStatus;
        if (!cancelled) setSub(j);
      } catch {
        if (!cancelled) setSub(null);
      }
    })();

    const { data: subListener } = supabase.auth.onAuthStateChange(
      (_event: unknown, session: SupabaseSession) => {
        setEmail(session?.user?.email ?? null);

        void fetch("/api/subscription/status", { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => setSub(j))
          .catch(() => {});
      }
    );

    return () => {
      cancelled = true;
      subListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const signedIn = Boolean(email);
  const plan = sub?.plan ?? "free";
  const status = (sub?.status ?? "").toLowerCase();

  const isAdvanced = useMemo(() => {
    return signedIn && plan === "advanced" && status === "active";
  }, [signedIn, plan, status]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  async function signOut() {
    try {
      await supabase.auth.signOut();
      router.refresh();
    } catch {
      // ignore
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10">
              <Image src="/icon.png" alt="CSNest" width={40} height={40} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">CSNest</div>
              <div className="text-xs text-white/60">Fix imports fast</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button type="button" className="pill-btn" onClick={toggle}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>

            <Link
              href="/app"
              className={`rgb-btn ${pathname === "/app" ? "is-active" : ""}`}
            >
              <span className="px-6 py-3 text-sm font-semibold text-white">
                CSV Fixer
              </span>
            </Link>

            <Link
              href="/presets"
              className={`rgb-btn ${
                pathname?.startsWith("/presets") ? "is-active" : ""
              }`}
            >
              <span className="px-6 py-3 text-sm font-semibold text-white">
                Preset Formats
              </span>
            </Link>

            <Link href="/#pricing" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-white">
                View pricing
              </span>
            </Link>

            {canAccessCustomFormats ? (
              <Link href="/formats" className="rgb-btn">
                <span className="px-6 py-3 text-sm font-semibold text-white">
                  Custom Formats
                </span>
              </Link>
            ) : (
              <button
                type="button"
                className="rgb-btn"
                onClick={() => setUpgradeOpen(true)}
              >
                <span className="px-6 py-3 text-sm font-semibold text-white">
                  Custom Formats
                </span>
              </button>
            )}

            <button
              type="button"
              className="pill-btn"
              onClick={() => setOpen((v) => !v)}
              aria-label="Account"
              title="Account"
            >
              ?
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-white/10">
            <div className="mx-auto max-w-6xl px-6 py-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <div className="font-semibold text-white">Account</div>

                <div className="mt-2 text-white/70">
                  {signedIn ? (
                    <>
                      <div>Signed in as: {email}</div>
                      <div className="mt-1">
                        Plan: {plan} ({sub?.status ?? "unknown"})
                      </div>
                    </>
                  ) : (
                    <div>Not signed in</div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/profile" className="rg-btn">
                    Profile
                  </Link>

                  {!signedIn ? (
                    <Link href="/auth" className="rg-btn">
                      Sign in
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="rg-btn"
                      onClick={() => void signOut()}
                    >
                      Sign out
                    </button>
                  )}
                </div>

                <div className="mt-4 text-xs text-white/50">
                  Tip: Use Preset Formats to open the fixer already configured
                  for your platform.
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <UpgradeModal
        open={upgradeOpen}
        title="Advanced only"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        signedIn={Boolean(sub?.signedIn)}
        upgradePlan="advanced"
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
