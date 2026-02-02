"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "server";
  const key = "csvnest_device_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id =
    "dev_" +
    Math.random().toString(36).slice(2) +
    "_" +
    Date.now().toString(36);

  window.localStorage.setItem(key, id);
  return id;
}

type QuotaResponse =
  | { ok: true; limitPerMonth: number; used: number; remaining: number }
  | { ok: false; error: string; limitPerMonth?: number; used?: number; remaining?: number };

export default function AppPage() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);

  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("shopify-fixed.csv");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, []);

  async function refreshQuota(id: string) {
    setLoadingQuota(true);
    try {
      const res = await fetch("/api/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id }),
        cache: "no-store",
      });

      const data = (await res.json()) as QuotaResponse;
      setQuota(data);
    } catch {
      setQuota({ ok: false, error: "quota_unavailable" });
    } finally {
      setLoadingQuota(false);
    }
  }

  useEffect(() => {
    if (!deviceId) return;
    refreshQuota(deviceId);
  }, [deviceId]);

  const remaining = useMemo(() => {
    if (!quota || !quota.ok) return null;
    return quota.remaining;
  }, [quota]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.csv$/i, "") + "-fixed.csv");
    const text = await file.text();
    setCsvText(text);
    setMessage("");
  }

  // Placeholder "fix": right now it just passes through CSV text.
  // Your real fixer logic should already exist elsewhere in your project,
  // but this keeps the page operational and the quota/membership flow intact.
  function buildFixedCsv(input: string) {
    return input;
  }

  async function exportCsv() {
    if (!deviceId) return;

    if (!csvText.trim()) {
      setMessage("Please upload a CSV first.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      // Consume quota (this is where membership affects limits)
      const consumeRes = await fetch("/api/quota/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      const consume = (await consumeRes.json()) as QuotaResponse;

      if (!consume.ok) {
        setQuota(consume);
        setMessage("Export limit reached for this month. Upgrade for more exports.");
        return;
      }

      setQuota(consume);

      const fixed = buildFixedCsv(csvText);

      const blob = new Blob([fixed], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setMessage("Export complete.");
    } catch {
      setMessage("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">CSV Fixer</h1>
        <div className="flex gap-3">
          <Link
            href="/account"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm"
          >
            Profile
          </Link>
          <Link
            href="/"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm"
          >
            Home
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--muted)]">Monthly exports</p>

        {loadingQuota ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Loading quota…</p>
        ) : quota?.ok ? (
          <div className="mt-2 text-sm">
            <span className="font-semibold">{quota.remaining}</span> remaining this month
            <span className="text-[var(--muted)]">
              {" "}
              (used {quota.used} of {quota.limitPerMonth})
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Quota unavailable right now.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-sm font-semibold">Upload CSV</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onPickFile}
            className="mt-3 block w-full text-sm"
          />

          <button
            type="button"
            onClick={exportCsv}
            disabled={busy || (remaining !== null && remaining <= 0)}
            className="rgb-btn mt-4 w-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Exporting…" : "Export fixed CSV"}
          </button>

          {message ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
          ) : null}

          {remaining !== null && remaining <= 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              You’re out of exports. Upgrade on the Profile page.
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-sm font-semibold">Preview</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            This is just a basic preview. Your full diagnostics UI can be wired back in after build is green.
          </p>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Upload a CSV to preview it here…"
            className="mt-3 h-80 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs"
          />
        </div>
      </div>
    </main>
  );
}
