"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme/ThemeProvider";

type MeResponse =
  | { ok: true; user: { id: string; email: string | null } | null }
  | { ok: false; user: null };

export function TopBar() {
  const supabase = createSupabaseBrowserClient();
  const { theme, toggle } = useTheme();

  const [me, setMe] = useState<MeResponse>({ ok: true, user: null });
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function refreshMe() {
    try {
      setLoading(true);
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = (await res.json()) as MeResponse;
      setMe(data);
    } catch {
      setMe({ ok: false, user: null });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshMe();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    await refreshMe();
  }

  const email = me.ok && me.user ? me.user.email : null;
  const initial = email ? email.slice(0, 1).toUpperCase() : "👤";

  return (
    <header className="sticky top-0 z-40">
      <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-sky-500 to-fuchsia-500" />

      <div className="border-b border-[var(--border)] bg-[color:rgba(0,0,0,0.35)] backdrop-blur">
        {/* FULL WIDTH (this fixes the cutoff) */}
        <div className="w-full flex items-center justify-between px-6 py-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <Image
                src="/CSV Nest Logo.png"
                alt="CSV Nest"
                fill
                className="object-contain p-1"
                priority
              />
            </div>

            <div className="leading-tight">
              <p className="text-base font-semibold">CSV Nest</p>
              <p className="text-sm text-[var(--muted)]">Fix imports fast</p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="rgb-btn rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
            >
              Open app
            </Link>

            <button
              className="rgb-btn rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm"
              type="button"
              onClick={toggle}
              title="Toggle theme"
            >
              {theme === "dark" ? "Dark" : "Light"}
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold"
                aria-haspopup="menu"
                aria-expanded={open}
                title={email ?? "Account"}
              >
                {loading ? "…" : initial}
              </button>

              {open ? (
                <div
                  className="absolute right-0 mt-2 w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg"
                  role="menu"
                >
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-xs text-[var(--muted)]">Signed in</p>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {email ?? (me.ok ? "Not signed in" : "Unavailable")}
                    </p>
                  </div>

                  <div className="mt-3 space-y-1">
                    <Link
                      href="/"
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                      onClick={() => setOpen(false)}
                    >
                      Home
                    </Link>

                    <Link
                      href="/app"
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                      onClick={() => setOpen(false)}
                    >
                      App
                    </Link>
                  </div>

                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    {email ? (
                      <button
                        onClick={signOut}
                        className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Sign out
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="block w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-sm font-semibold text-white"
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
        </div>
      </div>
    </header>
  );
}
