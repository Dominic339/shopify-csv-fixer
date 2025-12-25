"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutPage() {
  const sp = useSearchParams();
  const plan = (sp.get("plan") || "basic") as "basic" | "advanced";
  const [msg, setMsg] = useState<string>("Starting checkout…");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        setMsg("Please sign in first…");
        window.location.href = `/login?next=/checkout?plan=${plan}`;
        return;
      }

      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        setMsg("Checkout failed. Try again.");
        return;
      }

      window.location.href = data.url;
    })();
  }, [plan]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-xl font-semibold">Redirecting to Stripe…</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{msg}</p>
      </div>
    </main>
  );
}
