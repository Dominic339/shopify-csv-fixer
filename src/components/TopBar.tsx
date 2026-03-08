"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import { isValidLocale, DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";
import type { Translations } from "@/lib/i18n/getTranslations";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

// Minimal local types to avoid depending on supabase-js exported types.
type SupabaseUser = { email?: string | null };
type SupabaseSession = { user?: SupabaseUser };

type Props = {
  navT?: Translations["nav"];
};

export default function TopBar({ navT }: Props) {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  // Derive the active locale from the URL path (e.g. /es/guides/... → "es")
  const currentLocale: Locale = useMemo(() => {
    const segment = pathname?.split("/")?.[1] ?? "";
    return isValidLocale(segment) ? segment : DEFAULT_LOCALE;
  }, [pathname]);

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toolsRef = useRef<HTMLDivElement | null>(null);

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
        const supabase = createClient();
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!alive) return;
        if (!s?.user) {
          setSub({ signedIn: false, plan: "free", status: "none" });
          return;
        }
        const { data } = await supabase
          .from("user_subscriptions")
          .select("plan,status")
          .eq("user_id", s.user.id)
          .maybeSingle();
        if (!alive) return;
        const activePlan = data?.status === "active" ? data.plan : "free";
        setSub({
          signedIn: true,
          plan: (activePlan ?? "free") as SubStatus["plan"],
          status: data?.status ?? "none",
        });
      } catch {
        if (!alive) return;
        setSub({ signedIn: Boolean(session?.user?.email), plan: "free", status: "none" });
      }
    })();
    return () => { alive = false; };
  }, [session?.user?.email]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(target)) setToolsOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen, toolsOpen]);

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
  const isAdvancedActive = plan === "advanced" && isActive;
  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvancedActive;

  const profileLabel = useMemo(() => {
    const email = session?.user?.email ?? "";
    if (!email) return "?";
    return email.slice(0, 1).toUpperCase();
  }, [session?.user?.email]);

  const upgradeTitle = plan === "advanced" ? "Advanced" : "Upgrade";
  const upgradeMessage = signedIn
    ? "Upgrade to unlock higher export limits and advanced Shopify tools."
    : "Sign in to upgrade and unlock higher export limits and advanced Shopify tools.";

  const customFormatsUpgradeMessage = signedIn
    ? "Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
    : "Sign in to upgrade to Advanced and unlock Custom Formats.";

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
            {theme === "light" ? (navT?.darkMode ?? "Dark mode") : (navT?.lightMode ?? "Light mode")}
          </button>

          <Link className="rgb-btn" href="/app">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">{navT?.csvFixer ?? "CSV Fixer"}</span>
          </Link>

          <Link className="rgb-btn" href="/presets">
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">{navT?.templates ?? "Templates"}</span>
          </Link>

          <Link className="rgb-btn" href={localeHref(currentLocale, "/guides")}>
            <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">{navT?.guides ?? "Guides"}</span>
          </Link>

          {/* Tools dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className="rgb-btn"
              onClick={() => setToolsOpen((v) => !v)}
              aria-label="Tools menu"
            >
              <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Tools</span>
            </button>
            {toolsOpen && (
              <div className="popover-surface absolute left-0 mt-2 w-52 overflow-hidden rounded-2xl shadow-xl z-50">
                <div className="p-2">
                  <Link
                    href="/convert"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setToolsOpen(false)}
                  >
                    Format Converter
                  </Link>
                  <Link
                    href="/merge"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setToolsOpen(false)}
                  >
                    CSV Merger
                  </Link>
                  <Link
                    href="/csv-inspector"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setToolsOpen(false)}
                  >
                    CSV Inspector
                  </Link>
                </div>
              </div>
            )}
          </div>

          {canAccessCustomFormats ? (
            <Link className="rgb-btn" href="/formats" title="Open Custom Formats builder">
              <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">{navT?.customFormats ?? "Custom formats"}</span>
            </Link>
          ) : (
            <button
              type="button"
              className="rgb-btn"
              onClick={() => {
                setMenuOpen(false);
                setUpgradeOpen(true);
              }}
              title="Advanced plan required"
            >
              <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">{navT?.customFormats ?? "Custom formats"}</span>
            </button>
          )}

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
              <div className="popover-surface absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl shadow-xl">
                <div className="px-4 py-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                  {signedIn ? (
                    <div>
                      <div className="font-semibold text-[var(--text)]">{session?.user?.email}</div>
                      <div className="mt-1">
                        {navT?.plan ?? "Plan"}: <span className="font-semibold text-[var(--text)]">{plan}</span>{" "}
                        {isActive ? (
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">({navT?.active ?? "active"})</span>
                        ) : (
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">({status})</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="font-semibold text-[var(--text)]">{navT?.notSignedIn ?? "Not signed in"}</div>
                  )}
                </div>

                <div className="border-t border-[var(--border)]" />

                <div className="p-2">
                  <Link
                    href="/#pricing"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {navT?.pricing ?? "Pricing"}
                  </Link>

                  <Link
                    href="/"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {navT?.home ?? "Home"}
                  </Link>

                  <Link
                    href="/profile"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {navT?.profile ?? "Profile"}
                  </Link>

                  <Link
                    href="/app"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {navT?.csvFixer ?? "CSV Fixer"}
                  </Link>

                  <Link
                    href="/formats"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {navT?.customFormats ?? "Custom Formats"}
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
                      {navT?.signOut ?? "Sign out"}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="mt-2 block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                      onClick={() => setMenuOpen(false)}
                    >
                      {navT?.signIn ?? "Sign in"}
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
        message={canAccessCustomFormats ? upgradeMessage : customFormatsUpgradeMessage}
        signedIn={signedIn}
        onClose={() => setUpgradeOpen(false)}
      />
    </header>
  );
}
