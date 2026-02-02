// src/app/app/AppClient.tsx
"use client";

import { useEffect, useState } from "react";

type Quota = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  limit: number;
  used: number;
  remaining: number;
  month: string;
};

export default function AppClient() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function refreshQuota() {
    const r = await fetch("/api/quota", { cache: "no-store" });
    const j = (await r.json()) as Quota;
    setQuota(j);
  }

  useEffect(() => {
    refreshQuota().catch(() => setQuota(null));
  }, []);

  async function simulateExport() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/quota/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      });

      const j = await r.json();

      if (!r.ok) {
        setMsg(j?.error ?? "Export failed");
      } else {
        setMsg("Export counted successfully.");
      }

      await refreshQuota();
    } catch (e: any) {
      setMsg(e?.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">CSV Fixer</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Upload → Diagnose → Auto-fix safe issues → Export Shopify-ready CSV.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 lg:col-span-2">
          <div className="text-sm font-semibold">Export</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This button simulates a CSV export and consumes quota.
          </p>

          <button
            className="rgb-btn mt-4 bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={simulateExport}
            disabled={busy}
          >
            {busy ? "Working…" : "Export fixed CSV"}
          </button>

          {msg ? <div className="mt-3 text-sm text-[var(--muted)]">{msg}</div> : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold">Quota</div>

          {quota ? (
            <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <div>
                Plan: <span className="font-semibold text-[var(--text)]">{quota.plan}</span>
              </div>
              <div>
                Used: <span className="font-semibold text-[var(--text)]">{quota.used}</span> /{" "}
                {quota.limit}
              </div>
              <div>
                Remaining:{" "}
                <span className="font-semibold text-[var(--text)]">{quota.remaining}</span>
              </div>
              <div>Month: {quota.month}</div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-[var(--muted)]">Loading…</div>
          )}

          <button
            className="rgb-btn mt-5 border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold"
            onClick={refreshQuota}
          >
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
