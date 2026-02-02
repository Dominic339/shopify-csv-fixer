// src/components/TopBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

export default function TopBar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<SubStatus | null>(null);

  async function refreshSubscription() {
    try {
      const r = await fetch("/api/subscription/status", { cache: "no-store" });
      const j = (await r.json()) as SubStatus;
      setSub(j);
    } catch {
      setSub(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      await refreshSubscription();
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      refreshSubscription();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  async function openPortal() {
    setOpen(false);
    const r = await fetch("/api/stripe/portal", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.url) window.location.href = j.url;
  }

  const planLabel =
    sub?.signedIn && sub.status === "active"
      ? sub.plan === "advanced"
        ? "Advanced"
        : "Basic"
      : sub?.signedIn
        ? "Free"
        : null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--bg)]" />
          <div>
            <div className="text-sm font-semibold leading-tight">CSV Nest</div>
            <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
            onClick={toggle}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>

          {/* Primary action */}
          <Link
            href="/app"
            className="rgb-btn rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Open app
          </Link>

          {/* Profile/menu */}
          <div className="relative">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-sm font-semibold"
              onClick={() => setOpen((v) => !v)}
              aria-label="Open menu"
            >
              {email ? email[0]?.toUpperCase() : "?"}
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <div className="text-xs text-[var(--muted)]">{email ? "Signed in" : "Guest"}</div>
                  <div className="mt-1 truncate text-sm font-semibold">{email ?? "Not signed in"}</div>
                  {planLabel ? (
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Plan: <span className="font-semibold">{planLabel}</span>
                      {sub?.status ? ` • ${sub.status}` : ""}
                    </div>
                  ) : null}
                </div>

                <nav className="p-2 text-sm">
                  <Link
                    href="/profile"
                    className={`block rounded-xl px-3 py-2 hover:bg-[var(--surface-2)] ${isActive("/profile") ? "bg-[var(--surface-2)]" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>

                  <Link
                    href="/"
                    className={`block rounded-xl px-3 py-2 hover:bg-[var(--surface-2)] ${isActive("/") ? "bg-[var(--surface-2)]" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    Home
                  </Link>

                  <Link
                    href="/app"
                    className={`block rounded-xl px-3 py-2 hover:bg-[var(--surface-2)] ${isActive("/app") ? "bg-[var(--surface-2)]" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    App
                  </Link>

                  {sub?.signedIn && sub.status === "active" ? (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                      onClick={openPortal}
                    >
                      Manage billing / cancel
                    </button>
                  ) : null}

                  {!email ? (
                    <Link
                      href="/login"
                      className="mt-2 block rounded-xl px-3 py-2 hover:bg-[var(--surface-2)]"
                      onClick={() => setOpen(false)}
                    >
                      Sign in
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-xl bg-red-600/80 px-3 py-2 text-left text-white hover:bg-red-600"
                      onClick={signOut}
                    >
                      Sign out
                    </button>
                  )}
                </nav>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
