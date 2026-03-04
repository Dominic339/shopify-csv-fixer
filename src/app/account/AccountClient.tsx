"use client";

import { useEffect, useState } from "react";

type MeResponse =
  | { ok: true; user: { id: string; email: string | null } | null }
  | { ok: false; user: null };

export default function AccountClient() {
  const [me, setMe] = useState<MeResponse>({ ok: true, user: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null);

  async function refreshMe() {
    try {
      setLoading(true);
      const [meRes, statusRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/stripe/status", { cache: "no-store" }),
      ]);
      setMe((await meRes.json()) as MeResponse);
      setStripeEnabled(((await statusRes.json()) as { enabled: boolean }).enabled);
    } catch {
      setMe({ ok: false, user: null });
      setStripeEnabled(true); // fail open
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  const billingUnavailable = stripeEnabled === false;

  async function openPortal() {
    if (billingUnavailable) return;
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok && data.error === "stripe_not_configured") { setStripeEnabled(false); return; }
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
      <p className="mt-2 text-sm text-[var(--muted)]">Manage your login and subscription.</p>

      {billingUnavailable ? (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Billing is temporarily unavailable. Please try again later.
        </div>
      ) : null}

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
                disabled={!email || busy || billingUnavailable}
                type="button"
              >
                {busy ? "Opening…" : "Manage billing"}
              </button>

              {!email ? (
                <a className="rgb-btn bg-[var(--surface)] px-5 py-3 text-sm" href="/login">
                  Sign in
                </a>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-[var(--muted)]">Billing opens a secure Stripe-hosted portal.</p>
          </>
        )}
      </div>
    </main>
  );
}
