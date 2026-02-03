"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function TopBar() {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  // Init theme
  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  function toggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") window.localStorage.setItem("theme", next);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const el = target.closest("[data-topbar-root='true']");
      if (el) return;

      setOpen(false);
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
            <Image
              src="/CSV Nest Logo.png"
              alt="CSV Nest"
              fill
              sizes="40px"
              className="object-contain p-1"
              priority
            />
          </div>

          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--text)]">CSV Nest</div>
            <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
          </div>
        </Link>

        <div className="flex items-center gap-3" data-topbar-root="true">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:opacity-90"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>

          <Link
            href="/app"
            className="rgb-btn bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Open app
          </Link>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-sm font-semibold text-[var(--text)]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
          >
            {email ? email.slice(0, 1).toUpperCase() : "?"}
          </button>

          {open ? (
            <div className="absolute right-6 top-[72px] z-50 w-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <div className="text-xs text-[var(--muted)]">
                  {email ? "Signed in" : "Guest"}
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {email ?? "Not signed in"}
                </div>
              </div>

              <nav className="p-2">
                <Link
                  href="/profile"
                  className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  onClick={() => setOpen(false)}
                >
                  Profile
                </Link>

                <Link
                  href="/"
                  className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  onClick={() => setOpen(false)}
                >
                  Home
                </Link>

                <Link
                  href="/app"
                  className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  onClick={() => setOpen(false)}
                >
                  App
                </Link>

                <div className="my-2 border-t border-[var(--border)]" />

                {email ? (
                  <button
                    type="button"
                    className="w-full rounded-xl bg-red-600 px-3 py-2 text-left text-sm font-semibold text-white hover:opacity-90"
                    onClick={signOut}
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block w-full rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
