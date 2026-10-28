"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fmt } from "@/lib/i18n/fmt";
import type { Translations } from "@/lib/i18n/getTranslations";

interface Props {
  t: Translations["app"];
  locale: string;
  limit: number;
  /** Localised link to the pricing section. */
  pricingHref: string;
  onDismiss: () => void;
}

/** First day of next month (UTC, matching the quota month key). */
function nextResetDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function QuotaWallCapture({ t, locale, limit, pricingHref, onDismiss }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const resetDate = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(nextResetDate());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("loading");
    try {
      const r = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "quota_wall" }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-wall-title"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="quota-wall-title" className="text-xl font-semibold text-[var(--text)]">
          {t.quotaTitle}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{fmt(t.quotaBody, { limit, date: resetDate })}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{t.upsellBody}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={pricingHref} className="rg-btn" onClick={onDismiss}>
            {t.viewPlans}
          </Link>
          <Link href="/login?redirect=%2Fapp" className="pill-btn">
            {t.quotaLogIn}
          </Link>
        </div>

        <div className="mt-5 border-t border-[var(--border)] pt-5">
          {state === "done" ? (
            <p className="text-sm text-[var(--text)]">{t.quotaEmailDone}</p>
          ) : (
            <>
              <label htmlFor="quota-email" className="mb-2 block text-xs text-[var(--muted)]">
                {t.quotaEmailLabel}
              </label>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  id="quota-email"
                  type="email"
                  className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:text-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={state === "loading"} className="rg-btn shrink-0 disabled:opacity-60">
                  {state === "loading" ? "…" : t.quotaEmailSubmit}
                </button>
              </form>
              {state === "error" && <p className="mt-2 text-xs text-red-500">{t.quotaEmailError}</p>}
            </>
          )}
        </div>

        <button type="button" className="mt-4 text-xs text-[var(--muted)] hover:underline" onClick={onDismiss}>
          {t.dismiss}
        </button>
      </div>
    </div>
  );
}
