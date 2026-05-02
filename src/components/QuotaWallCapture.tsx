"use client";

import React, { useState } from "react";
import Link from "next/link";

interface Props {
  onDismiss: () => void;
}

export function QuotaWallCapture({ onDismiss }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("loading");
    try {
      await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "quota_wall" }),
      });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onDismiss}>
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {state === "done" ? (
          <div className="text-center">
            <div className="text-3xl mb-3">&#10003;</div>
            <h2 className="text-xl font-semibold text-[var(--text)]">You&apos;re on the list!</h2>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              We&apos;ll send you a heads-up. In the meantime, create a free account to get more exports.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="rg-btn">
                Create free account
              </Link>
              <button type="button" className="pill-btn" onClick={onDismiss}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-[var(--text)]">You&apos;ve hit the free limit</h2>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Free accounts get 3 exports per month. Create an account to keep going — or leave your email and we&apos;ll remind you when your limit resets.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="rg-btn">
                Create free account
              </Link>
              <Link href="/pricing" className="pill-btn">
                View plans
              </Link>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),0.7)]">
                Or just drop your email
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[color:rgba(var(--muted-rgb),0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="rg-btn shrink-0 disabled:opacity-60"
                >
                  {state === "loading" ? "..." : "Notify me"}
                </button>
              </form>
              {state === "error" && (
                <p className="mt-2 text-xs text-red-500">Something went wrong — try again.</p>
              )}
            </div>

            <button
              type="button"
              className="mt-4 text-xs text-[color:rgba(var(--muted-rgb),0.6)] hover:underline"
              onClick={onDismiss}
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
