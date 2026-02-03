"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function TopBar() {
  const supabase = createClient();

  const { theme, toggle } = useTheme();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }: any) => {
        if (!mounted) return;
        setEmail(data?.user?.email ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setEmail(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg)]" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">CSV Nest</div>
            <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Theme toggle (working with your ThemeProvider) */}
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:opacity-90"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>

          <Link href="/app" className="rgb-btn bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
            Open app
          </Link>

          <div className="relative">
            <button
              className="rgb-btn flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold"
              onClick={() => setOpen((v) => !v)}
              aria-label="Account menu"
              type="button"
            >
              {email ? email[0]?.toUpperCase() : "?"}
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-xs text-[var(--muted)]">Signed in</div>
                  <div className="mt-1 text-sm font-semibold">{email ?? "Guest"}</div>
                </div>

                <div className="mt-3 grid gap-1 text-sm">
                  <Link className="rounded-xl px-3 py-2 hover:bg-[var(--bg)]" href="/account" onClick={() => setOpen(false)}>
                    Profile
                  </Link>

                  <Link className="rounded-xl px-3 py-2 hover:bg-[var(--bg)]" href="/" onClick={() => setOpen(false)}>
                    Home
                  </Link>

                  <Link className="rounded-xl px-3 py-2 hover:bg-[var(--bg)]" href="/app" onClick={() => setOpen(false)}>
                    App
                  </Link>
                </div>

                <button
                  className="rgb-btn mt-3 w-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={signOut}
                  disabled={!email}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
