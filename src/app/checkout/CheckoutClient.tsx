// src/app/checkout/CheckoutClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "idle" | "creating" | "redirecting" | "error";

export default function CheckoutClient() {
  const sp = useSearchParams();
  const statusParam = sp.get("status"); // success | canceled
  const planParam = sp.get("plan"); // basic | advanced

  const plan = useMemo(() => {
    if (planParam === "basic" || planParam === "advanced") return planParam;
    return null;
  }, [planParam]);

  const [state, setState] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If Stripe sent us back with a status, don't create another session.
    if (statusParam === "success" || statusParam === "canceled") return;

    // If user didn't supply a plan, nothing to do.
    if (!plan) return;

    let cancelled = false;

    async function go() {
      try {
        setState("creating");
        setError(null);

        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const data = (await res.json()) as { url?: string; error?: string };

        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Failed to create Stripe Checkout session");
        }

        if (cancelled) return;
        setState("redirecting");
        window.location.href = data.url;
      } catch (e: any) {
        if (cancelled) return;
        setState("error");
        setError(e?.message ?? "Checkout failed");
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [plan, statusParam]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {/* Returned from Stripe */}
      {statusParam === "success" ? (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Subscription started successfully.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
              href="/app"
            >
              Back to app
            </Link>
          </div>
        </>
      ) : statusParam === "canceled" ? (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">Checkout canceled.</p>
          <div className="mt-6 flex gap-3">
            <Link
              className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
              href="/"
            >
              Back home
            </Link>
            <Link
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm"
              href="/app"
            >
              Open app
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* Creating session */}
          <p className="mt-3 text-sm text-[var(--muted)]">
            {state === "creating"
              ? "Creating secure Stripe checkout…"
              : state === "redirecting"
              ? "Redirecting to Stripe…"
              : plan
              ? "Preparing your checkout…"
              : "Missing plan. Go back and choose Basic or Advanced."}
          </p>

          {state === "error" && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
              <p className="font-semibold text-red-600">Checkout error</p>
              <p className="mt-1 text-[var(--muted)]">{error}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Link
              className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
              href="/app"
            >
              Back to app
            </Link>
            <Link
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm"
              href="/"
            >
              Home
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
