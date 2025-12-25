"use client";

import { useEffect, useState } from "react";

type MeResponse =
  | { ok: true; user: { id: string; email: string | null } | null }
  | { ok: false; user: null };

export default function AccountPage() {
  const [me, setMe] = useState<MeResponse>({ ok: true, user: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
  }, []);

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        alert("Could not open billing portal yet.");
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }

  const email = me.ok && me.user ? me.user.email : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Manage your login and subscription.
      </p>

      <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : (
          <>
            <p className="text-sm text-[var(--muted)]">Signed in as</p>
            <p className="mt-1 text-lg font-semibold">{email ?? "Not signed in"}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={openPortal}
                disabled={!email || busy}
                type="button"
              >
                {busy ? "Opening…" : "Manage billing"}
              </button>

              {!email ? (
                <a
                  className="rgb-btn bg-[var(--surface)] px-5 py-3 text-sm"
                  href="/login"
                >
                  Sign in
                </a>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-[var(--muted)]">
              Billing opens a secure Stripe-hosted portal.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
