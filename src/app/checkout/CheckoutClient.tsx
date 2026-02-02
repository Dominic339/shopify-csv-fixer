"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CheckoutClient() {
  const sp = useSearchParams();
  const status = sp.get("status"); // success/canceled
  const plan = sp.get("plan"); // basic/advanced

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // After Stripe redirects back, the webhook might take a moment.
    // Poll quota status a couple times so the UI "catches up" quickly.
    let cancelled = false;

    async function poll() {
      for (let i = 0; i < 6; i++) {
        const res = await fetch("/api/quota/status", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (data?.status === "active") {
          setSynced(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      setSynced(true);
    }

    if (status === "success") poll();
    else setSynced(true);

    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {status ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Status: <span className="font-semibold text-[var(--text)]">{status}</span>
          {plan ? (
            <>
              {" "}
              • Plan: <span className="font-semibold text-[var(--text)]">{plan}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">Preparing your checkout…</p>
      )}

      {status === "success" && !synced ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Syncing subscription status… (this can take a few seconds)
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Link
          className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
          href="/app"
        >
          Back to app
        </Link>

        <Link
          className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold hover:bg-[var(--surface-2)]"
          href="/profile"
        >
          View profile
        </Link>
      </div>
    </main>
  );
}
