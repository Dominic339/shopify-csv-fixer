"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Logo } from "@/components/brand/Logo";
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

type NavStrings = Translations["nav"];

type Props = {
  /** Nav strings for every locale; the active one is picked from the URL. */
  navByLocale: Record<Locale, NavStrings>;
};

export default function TopBar({ navByLocale }: Props) {
  const { theme, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();

  // Derive the active locale from the URL path (e.g. /es/guides/... → "es")
  const currentLocale: Locale = useMemo(() => {
    const segment = pathname?.split("/")?.[1] ?? "";
    return isValidLocale(segment) ? segment : DEFAULT_LOCALE;
  }, [pathname]);
  const navT = navByLocale[currentLocale] ?? navByLocale[DEFAULT_LOCALE];
  const href = (path: string) => localeHref(currentLocale, path);

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toolsRef = useRef<HTMLDivElement | null>(null);


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

  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

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

  const upgradeTitle = plan === "advanced" ? navT.advanced : navT.upgrade;
  const upgradeMessage = signedIn ? navT.upgradeMessage : navT.upgradeMessageSignedOut;
  const customFormatsUpgradeMessage = signedIn ? navT.customFormatsUpgrade : navT.customFormatsUpgradeSignedOut;

  const tools = [
    { path: "/convert", label: navT.formatConverter },
    { path: "/merge", label: navT.csvMerger },
    { path: "/csv-inspector", label: navT.csvInspector },
  ];
  const openCustomFormats = () => {
    setMenuOpen(false);
    setMobileOpen(false);
    setUpgradeOpen(true);
  };
  const betaBadge = (
    <span className="ml-2 rounded-full bg-[var(--secondary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--secondary-text)]">
      {navT.beta}
    </span>
  );

  const accountMenu = (
    <>
      <div className="px-4 py-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        {signedIn ? (
          <div>
            <div className="truncate font-semibold text-[var(--text)]">{session?.user?.email}</div>
            <div className="mt-1">
              {navT.plan}: <span className="font-semibold text-[var(--text)]">{plan}</span>{" "}
              <span>({isActive ? navT.active : status})</span>
            </div>
          </div>
        ) : (
          <div className="font-semibold text-[var(--text)]">{navT.notSignedIn}</div>
        )}
      </div>
      <div className="border-t border-[var(--border)]" />
      <div className="p-2">
        {[
          { path: "/#pricing", label: navT.pricing },
          { path: "/profile", label: navT.profile },
        ].map((l) => (
          <Link
            key={l.path}
            href={l.path === "/#pricing" ? `${href("/")}#pricing` : href(l.path)}
            className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
          onClick={() => {
            setMenuOpen(false);
            setMobileOpen(false);
            setUpgradeOpen(true);
          }}
        >
          {upgradeTitle}
        </button>
        <div className="my-2 border-t border-[var(--border)]" />
        {signedIn ? (
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
            onClick={signOut}
          >
            {navT.signOut}
          </button>
        ) : (
          <Link
            href="/login"
            className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
            onClick={() => setMenuOpen(false)}
          >
            {navT.signIn}
          </Link>
        )}
      </div>
    </>
  );

  const themeLabel = theme === "dark" ? navT.themeLight : navT.themeDark;
  const themeButton = (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
      onClick={toggleTheme}
      aria-label={themeLabel}
      title={themeLabel}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:py-4">
        <Link href={href("/")} className="flex shrink-0 items-center gap-3">
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link className="nav-link" href={href("/presets")}>
            {navT.templates}
          </Link>
          <Link className="nav-link" href={href("/guides")}>
            {navT.guides}
          </Link>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className="nav-link"
              onClick={() => setToolsOpen((v) => !v)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
            >
              {navT.tools}
            </button>
            {toolsOpen && (
              <div className="popover-surface absolute left-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl shadow-xl">
                <div className="p-2">
                  {tools.map((tool) => (
                    <Link
                      key={tool.path}
                      href={href(tool.path)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                      onClick={() => setToolsOpen(false)}
                    >
                      {tool.label}
                      {betaBadge}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canAccessCustomFormats ? (
            <Link className="nav-link" href="/formats">
              {navT.customFormats}
            </Link>
          ) : (
            <button type="button" className="nav-link" onClick={openCustomFormats} title={navT.advancedRequired}>
              {navT.customFormats}
            </button>
          )}

          <span className="ml-1">{themeButton}</span>

          <Link href={href("/app")} className="btn-primary ml-2 whitespace-nowrap px-5 py-2.5">
            {navT.csvFixer}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-base font-semibold text-[var(--text)]"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={navT.account}
              aria-expanded={menuOpen}
            >
              {signedIn ? profileLabel : "?"}
            </button>
            {menuOpen ? (
              <div className="popover-surface absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl shadow-xl">{accountMenu}</div>
            ) : null}
          </div>
        </nav>

        {/* Mobile: primary action + menu button */}
        <div className="flex items-center gap-2 md:hidden">
          {themeButton}
          <Link href={href("/app")} className="btn-primary whitespace-nowrap px-4 py-2 text-sm">
            {navT.csvFixer}
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? navT.closeMenu : navT.menu}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-[var(--border)] bg-[var(--bg)] md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {[
              { path: "/presets", label: navT.templates },
              { path: "/guides", label: navT.guides },
            ].map((l) => (
              <Link key={l.path} href={href(l.path)} className="rounded-xl px-3 py-3 text-base text-[var(--text)] hover:bg-[var(--surface-2)]">
                {l.label}
              </Link>
            ))}
            <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),0.8)]">
              {navT.tools}
            </div>
            {tools.map((tool) => (
              <Link
                key={tool.path}
                href={href(tool.path)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-base text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                {tool.label}
                {betaBadge}
              </Link>
            ))}
            {canAccessCustomFormats ? (
              <Link href="/formats" className="rounded-xl px-3 py-3 text-base text-[var(--text)] hover:bg-[var(--surface-2)]">
                {navT.customFormats}
              </Link>
            ) : (
              <button
                type="button"
                className="rounded-xl px-3 py-3 text-left text-base text-[var(--text)] hover:bg-[var(--surface-2)]"
                onClick={openCustomFormats}
              >
                {navT.customFormats}
              </button>
            )}
            <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">{accountMenu}</div>
          </nav>
        </div>
      )}

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
