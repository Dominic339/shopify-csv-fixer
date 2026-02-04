"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function TopBar() {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const { theme, toggle } = useTheme();

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

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/CSV%20Nest%20Logo.png"
            alt="CSV Nest"
            width={28}
            height={28}
            priority
            className="rounded-md"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--text)]">CSV Nest</div>
            <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
          </div>
        </Link>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)]/80"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Dark" : "Light"}
          </button>

          {/* IMPORTANT: don’t force white text; keep it readable in light mode */}
          <Link href="/app" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open app</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)]"
            aria-label="Account menu"
          >
            {email ? email[0]?.toUpperCase() : "?"}
          </button>

          {open ? (
            <div
              className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border"
              style={{
                background: "var(--popover)",
                borderColor: "var(--popover-border)",
              }}
            >
              <div className="px-4 py-3">
                <div className="text-xs text-[var(--muted)]">{email ? "Signed in" : "Guest"}</div>
                <div className="truncate text-sm font-semibold text-[var(--text)]">
                  {email ?? "Not signed in"}
                </div>
              </div>

              <div className="border-t" style={{ borderColor: "var(--popover-border)" }} />

              <div className="p-2">
                <Link
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-black/10 hover:dark:bg-white/10"
                  href="/profile"
                  onClick={() => setOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-black/10 hover:dark:bg-white/10"
                  href="/"
                  onClick={() => setOpen(false)}
                >
                  Home
                </Link>
                <Link
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-black/10 hover:dark:bg-white/10"
                  href="/app"
                  onClick={() => setOpen(false)}
                >
                  App
                </Link>

                <div className="mt-2 border-t" style={{ borderColor: "var(--popover-border)" }} />

                {email ? (
                  <button
                    className="mt-2 w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    onClick={signOut}
                    type="button"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    className="mt-2 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)]/80"
                    href="/login"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
