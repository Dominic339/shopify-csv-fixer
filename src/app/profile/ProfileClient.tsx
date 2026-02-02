// src/app/profile/ProfileClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  current_period_end: string | null;
};

export default function ProfileClient() {
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/subscription/status", { cache: "no-store" });
    const j = (await r.json()) as SubStatus;
    setSub(j);
  }

  useEffect(() => {
    load().catch(() => setSub(null));
  }, []);

  async function openPortal() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        setMsg(j?.error ?? "Failed to create portal session");
        return;
      }
      window.location.href = j.url;
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to open portal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Verify your subscription and manage billing.
      </p>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {sub ? (
          <>
            <div className="text-sm text-[var(--muted)]">Subscription</div>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                Signed in:{" "}
                <span className="font-semibold">{sub.signedIn ? "Yes" : "No"}</span>
              </div>
              <div>
                Plan: <span className="font-semibold">{sub.plan}</span>
              </div>
              <div>
                Status: <span className="font-semibold">{sub.status}</span>
              </div>
              <div>
                Period end:{" "}
                <span className="font-semibold">
                  {sub.current_period_end ?? "—"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                onClick={openPortal}
                disabled={busy || !sub.signedIn}
              >
                {busy ? "Opening…" : "Manage in Stripe (upgrade/cancel)"}
              </button>

              <Link
                href="/app"
                className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold"
              >
                Back to app
              </Link>
            </div>

            {msg ? <div className="mt-3 text-sm text-[var(--muted)]">{msg}</div> : null}
          </>
        ) : (
          <div className="text-sm text-[var(--muted)]">Loading…</div>
        )}
      </div>
    </main>
  );
}
