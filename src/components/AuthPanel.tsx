"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type MeResponse =
  | { ok: true; user: { id: string; email: string | null } | null }
  | { ok: false; user: null };

export function AuthPanel() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse>({ ok: true, user: null });

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
    // also refresh after auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshMe();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMagicLink() {
    setMsg(null);
    setBusy(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setMsg("Check your email for the login link.");
    } catch (e: any) {
      setMsg(e?.message ?? "Could not send login link.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMsg(null);
    try {
      await supabase.auth.signOut();
      await refreshMe();
    } finally {
      setBusy(false);
    }
  }

  // If logged in, show a small “signed in” chip instead of the big box
  if (!loading && me.ok && me.user) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Account</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Signed in as <span className="font-semibold text-[var(--text)]">{me.user.email ?? "User"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm"
            >
              Home
            </Link>

            <button
              onClick={signOut}
              disabled={busy}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If logged out, show the login UI
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-sm font-semibold">Account</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Sign in to unlock subscription features.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
        />

        <button
          onClick={sendMagicLink}
          disabled={busy || !email.trim()}
          className="rgb-btn rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Sending…" : "Email login link"}
        </button>
      </div>

      {msg ? <p className="mt-3 text-sm text-[var(--muted)]">{msg}</p> : null}
    </div>
  );
}
