// src/components/ui/PricingCards.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

async function postJson(url: string, body?: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, json: j as any };
}

export function PricingCards() {
  const router = useRouter();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  async function refresh() {
    setMsg("");
    try {
      const r = await fetch("/api/subscription/status", { cache: "no-store" });
      const j = (await r.json()) as SubStatus;
      setSub(j);
    } catch {
      setSub(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startCheckout(plan: "basic" | "advanced") {
    setMsg("");
    if (!sub?.signedIn) {
      router.push("/login");
      return;
    }

    setBusy(plan);
    const { ok, json } = await postJson("/api/stripe/checkout", { plan });
    setBusy(null);

    if (!ok) {
      setMsg(json?.error ?? "Could not start checkout.");
      return;
    }

    if (json?.url) window.location.href = json.url;
  }

  async function openPortal() {
    setMsg("");
    setBusy("portal");
    const { ok, json } = await postJson("/api/stripe/portal");
    setBusy(null);

    if (!ok) {
      setMsg(json?.error ?? "Could not open billing portal.");
      return;
    }

    if (json?.url) window.location.href = json.url;
  }

  // If subscribed, hide the pricing grid and show the plan panel
  if (sub?.signedIn && sub.status === "active") {
    const planLabel = sub.plan === "advanced" ? "Advanced" : "Basic";
    const canUpgrade = sub.plan === "basic";

    return (
      <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[var(--muted)]">Your membership</div>
            <div className="mt-1 text-2xl font-semibold text-[var(--text)]">{planLabel}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              You are subscribed. You can manage billing, cancel, or upgrade any time.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canUpgrade ? (
              <button
                className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={() => startCheckout("advanced")}
                disabled={busy !== null}
                type="button"
              >
                {busy === "advanced" ? "Starting..." : "Upgrade to Advanced"}
              </button>
            ) : null}

            <button
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
              onClick={openPortal}
              disabled={busy !== null}
              type="button"
            >
              {busy === "portal" ? "Opening..." : "Manage billing in Profile"}
            </button>

            <button
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)]"
              onClick={() => router.push("/app")}
              type="button"
            >
              Open CSV Fixer
            </button>
          </div>
        </div>

        {msg ? <div className="mt-4 text-sm text-red-400">{msg}</div> : null}
      </div>
    );
  }

  return (
    <div className="mt-10">
      {msg ? <div className="mb-4 text-sm text-red-400">{msg}</div> : null}

      <div className="grid gap-6 md:grid-cols-3" id="pricing">
        {/* Free */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-sm text-[var(--muted)]">Free</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$0</div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Fix and export CSV files</li>
            <li>3 exports per month per device</li>
            <li>Access to all built-in formats</li>
            <li>No account required</li>
          </ul>

          <button
            className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)]"
            onClick={() => router.push("/app")}
            type="button"
          >
            Start free
          </button>
        </div>

        {/* Basic */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-sm text-[var(--muted)]">Basic</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$3 / month</div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>100 exports per month</li>
            <li>Access to all built-in formats</li>
            <li>Account required</li>
            <li>Manage billing in Profile</li>
          </ul>

          <button
            className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
            onClick={() => startCheckout("basic")}
            disabled={busy !== null}
            type="button"
          >
            {busy === "basic" ? "Starting..." : sub?.signedIn ? "Subscribe" : "Sign in to subscribe"}
          </button>
        </div>

        {/* Advanced */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-sm text-[var(--muted)]">Advanced</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$10 / month</div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Unlimited exports</li>
            <li>Access to all built-in formats</li>
            <li>Custom Format Builder</li>
            <li>Save, reuse, import, and export formats</li>
          </ul>

          <button
            className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
            onClick={() => startCheckout("advanced")}
            disabled={busy !== null}
            type="button"
          >
            {busy === "advanced" ? "Starting..." : sub?.signedIn ? "Subscribe" : "Sign in to subscribe"}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-[var(--muted)]">
        Subscriptions are handled securely by Stripe. Cancel any time from your billing portal.
      </div>
    </div>
  );
}
