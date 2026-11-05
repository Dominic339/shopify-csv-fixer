"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { getSupabase } from "@/lib/supabase/browser";
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

/** 24px stroke icons for the tools menu. */
const TOOL_ICONS: Record<string, React.ReactNode> = {
  fixer: <path d="M9 12l2 2 4-4M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />,
  convert: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  merge: <path d="M6 4v5a4 4 0 004 4h4a4 4 0 014 4v3M18 4v5a4 4 0 01-4 4M6 20v-3" />,
  inspect: <path d="M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4" />,
  tools: <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />,
  migrate: <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7M7 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
};

function ToolIcon({ name, tone }: { name: string; tone: "teal" | "indigo" }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        tone === "teal" ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "bg-[var(--secondary-soft)] text-[var(--secondary-text)]"
      }`}
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {TOOL_ICONS[name]}
      </svg>
    </span>
  );
}

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
    let unsub: { data?: { subscription?: { unsubscribe: () => void } } } | null = null;
    let alive = true;

    (async () => {
      try {
        const supabase = await getSupabase();
        if (!alive) return;
        unsub = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession ?? null);
        });
        const { data } = await supabase.auth.getSession();
        if (alive) setSession(data?.session ?? null);
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
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
        const supabase = await getSupabase();
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
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } finally {
      setMenuOpen(false);
      // A full reload on purpose: it clears every signed-in state held in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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
    { path: "/convert", label: navT.formatConverter, desc: navT.descConverter, icon: "convert", tone: "indigo" as const },
    { path: "/merge", label: navT.csvMerger, desc: navT.descMerger, icon: "merge", tone: "indigo" as const },
    { path: "/csv-inspector", label: navT.csvInspector, desc: navT.descInspector, icon: "inspect", tone: "teal" as const },
    { path: "/tools", label: navT.freeTools, desc: navT.descFreeTools, icon: "tools", tone: "teal" as const },
    // English-only pages, so not prefixed with the reader's locale.
    { path: "/migrate", label: navT.storeMigrations, desc: navT.descMigrations, icon: "migrate", tone: "indigo" as const, englishOnly: true },
  ];
  // The page you're on, for aria-current (which also styles the link).
  const bare = currentLocale === DEFAULT_LOCALE ? pathname ?? "/" : (pathname ?? "/").replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const current = (path: string) => (bare === path || bare.startsWith(path + "/") ? ("page" as const) : undefined);
  const toolsActive = tools.some((tool) => current(tool.path));
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
  const themeIcon = theme === "dark" ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
  const themeButton = (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
      onClick={toggleTheme}
      aria-label={themeLabel}
      title={themeLabel}
    >
      {themeIcon}
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
          <Link className="nav-link" href={href("/presets")} aria-current={current("/presets")}>
            {navT.templates}
          </Link>
          <Link className="nav-link" href={href("/guides")} aria-current={current("/guides")}>
            {navT.guides}
          </Link>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className={`nav-link gap-1 ${toolsActive ? "text-[var(--accent-text)]" : ""}`}
              onClick={() => setToolsOpen((v) => !v)}
              aria-expanded={toolsOpen}
              aria-haspopup="true"
            >
              {navT.tools}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`transition-transform ${toolsOpen ? "rotate-180" : ""}`} aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {toolsOpen && (
              <div className="popover-surface menu-in absolute left-1/2 z-50 mt-3 w-[600px] -translate-x-1/2 overflow-hidden rounded-3xl shadow-2xl">
                <div className="grid grid-cols-[1fr_1.35fr]">
                  {/* The main tool, featured */}
                  <Link
                    href={href("/app")}
                    className="group relative flex flex-col justify-between gap-6 overflow-hidden bg-[var(--accent-soft)] p-5"
                    onClick={() => setToolsOpen(false)}
                  >
                    <ToolIcon name="fixer" tone="teal" />
                    {/* A tiny sheet: one cell fixed (teal), one flagged (amber). */}
                    <div aria-hidden="true" className="space-y-1.5 rounded-xl border border-[rgba(var(--accent-rgb),0.25)] bg-[var(--surface)] p-2.5">
                      {[["w-10", "w-8", "bg-[rgba(var(--accent-rgb),0.35)] w-6"], ["w-8", "w-10", "w-7"], ["w-9", "bg-amber-400/60 w-8", "w-6"], ["w-10", "w-7", "w-8"]].map((row, r) => (
                        <div key={r} className="flex gap-1.5">
                          {row.map((c, k) => (
                            <span key={k} className={`h-2 rounded-full ${c.includes("bg-") ? c : `bg-[var(--surface-2)] ${c}`}`} />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-base font-semibold text-[var(--text)]">
                        {navT.csvFixer}
                        <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{navT.descFixer}</p>
                    </div>
                  </Link>
                  <div className="p-2">
                    {tools.map((tool) => (
                      <Link
                        key={tool.path}
                        href={tool.englishOnly ? tool.path : href(tool.path)}
                        aria-current={current(tool.path)}
                        className="flex items-start gap-3 rounded-2xl px-3 py-2.5 text-[var(--text)] hover:bg-[var(--surface-2)] aria-[current=page]:bg-[var(--surface-2)]"
                        onClick={() => setToolsOpen(false)}
                      >
                        <ToolIcon name={tool.icon} tone={tool.tone} />
                        <span className="min-w-0">
                          <span className="flex items-center text-sm font-semibold">
                            {tool.label}
                            {tool.path === "/merge" ? betaBadge : null}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{tool.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {canAccessCustomFormats ? (
            <Link className="nav-link" href="/formats" aria-current={current("/formats")}>
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
            <div className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {navT.tools}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => (
                <Link
                  key={tool.path}
                  href={tool.englishOnly ? tool.path : href(tool.path)}
                  aria-current={current(tool.path)}
                  className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-semibold text-[var(--text)] last:odd:col-span-2 aria-[current=page]:border-[var(--accent)]"
                >
                  <ToolIcon name={tool.icon} tone={tool.tone} />
                  {tool.label}
                </Link>
              ))}
            </div>
            <div className="h-2" />
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
            <button
              type="button"
              className="flex items-center justify-between rounded-xl px-3 py-3 text-left text-base text-[var(--text)] hover:bg-[var(--surface-2)]"
              onClick={toggleTheme}
            >
              {themeLabel}
              <span className="pointer-events-none text-[var(--muted)]" aria-hidden="true">
                {themeIcon}
              </span>
            </button>
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
