"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckoutClient() {
  const sp = useSearchParams();
  const status = sp.get("status"); // success/canceled
  const plan = sp.get("plan");     // basic/advanced

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {status ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Status: <span className="font-semibold text-[var(--text)]">{status}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">Preparing your checkout…</p>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
          href="/app"
        >
          Back to app
        </Link>
      </div>
    </main>
  );
}
