// src/components/ui/PricingCards.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { Translations } from "@/lib/i18n/getTranslations";
import { createClient } from "@/lib/supabase/browser";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  stripeCustomerId?: string | null;
};

type Props = {
  sub?: SubStatus | null;
  tPricing?: Translations["pricing"];
  onBillingUnavailable?: () => void;
};

async function postJson(url: string, body?: unknown, token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, json: j as any };
}

export function PricingCards({ sub, tPricing: t, onBillingUnavailable }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const billingUnavailable = stripeEnabled === false;

  // Subscription state helpers
  const isActive = !!(sub?.signedIn && sub.status === "active");
  const activePlan = isActive ? sub!.plan : null; // "basic" | "advanced" | null
  // Only offer billing portal when stripe_customer_id is confirmed present.
  // After checkout the webhook may take a few seconds; until then show "Syncing…".
  const hasStripeCustomer = !!(sub?.stripeCustomerId);

  async function startCheckout(plan: "basic" | "advanced") {
    if (billingUnavailable) return;
    setMsg("");
    if (!sub?.signedIn) {
      router.push("/login");
      return;
    }
    setBusy(plan);
    const { ok, json } = await postJson("/api/stripe/checkout", { plan }, accessToken);
    setBusy(null);
    if (!ok) {
      if (json?.error === "stripe_not_configured") { setStripeEnabled(false); return; }
      setMsg(json?.error ?? "Could not start checkout.");
      return;
    }
    if (json?.url) window.location.href = json.url;
  }

  async function openPortal() {
    if (billingUnavailable) return;
    setMsg("");
    setBusy("portal");
    const { ok, json } = await postJson("/api/stripe/portal", undefined, accessToken);
    setBusy(null);
    if (!ok) {
      if (json?.error === "stripe_not_configured") { setStripeEnabled(false); return; }
      setMsg(json?.error ?? "Could not open billing portal.");
      return;
    }
    if (json?.url) window.location.href = json.url;
  }

  // Which tiers to show:
  // Free: show only when not on a paid plan
  // Basic: show when not on Advanced
  // Advanced: always show
  const showFree = !activePlan;
  const showBasic = activePlan !== "advanced";

  return (
    <div className="mt-10">
      {billingUnavailable && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t?.billingUnavailable ?? "Billing is temporarily unavailable. Please try again later."}
        </div>
      )}
      {msg && <div className="mb-4 text-sm text-red-400">{msg}</div>}

      <div className="grid gap-6 md:grid-cols-3" id="pricing">
        {/* Free */}
        {showFree && (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="text-sm text-[var(--muted)]">{t?.free ?? "Free"}</div>
            <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$0</div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>{t?.freeBullet1 ?? "Fix and export CSV files"}</li>
              <li>{t?.freeBullet2 ?? "3 exports per month per device"}</li>
              <li>{t?.freeBullet3 ?? "Access to all built-in formats"}</li>
              <li>{t?.freeBullet4 ?? "No account required"}</li>
            </ul>
            <button
              className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)]"
              onClick={() => router.push("/app")}
              type="button"
            >
              {t?.startFree ?? "Start free"}
            </button>
          </div>
        )}

        {/* Basic */}
        {showBasic && (
          <div className={`rounded-3xl border p-6 shadow-sm ${activePlan === "basic" ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">{t?.basic ?? "Basic"}</div>
              {activePlan === "basic" && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {t?.yourPlan ?? "Your plan"}
                </span>
              )}
            </div>
            <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$5 <span className="text-base font-normal text-[var(--muted)]">{t?.perMonth ?? "/ month"}</span></div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>{t?.basicBullet1 ?? "100 exports per month"}</li>
              <li>{t?.basicBullet2 ?? "Access to all built-in formats"}</li>
              <li>{t?.basicBullet3 ?? "Account required"}</li>
              <li>{t?.basicBullet4 ?? "Manage billing in Profile"}</li>
            </ul>
            {activePlan === "basic" ? (
              hasStripeCustomer ? (
                <button
                  className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                  onClick={openPortal}
                  disabled={busy !== null || billingUnavailable}
                  type="button"
                >
                  {busy === "portal" ? (t?.starting ?? "Starting…") : (t?.manageBilling ?? "Manage billing")}
                </button>
              ) : (
                <button
                  className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] opacity-60 cursor-wait"
                  disabled
                  type="button"
                >
                  Syncing billing info…
                </button>
              )
            ) : (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={() => startCheckout("basic")}
                disabled={busy !== null || billingUnavailable}
                type="button"
              >
                {busy === "basic" ? (t?.starting ?? "Starting…") : sub?.signedIn ? (t?.subscribe ?? "Subscribe") : (t?.signInToSubscribe ?? "Sign in to subscribe")}
              </button>
            )}
          </div>
        )}

        {/* Advanced */}
        <div className={`rounded-3xl border p-6 shadow-sm ${activePlan === "advanced" ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted)]">{t?.advanced ?? "Advanced"}</div>
            {activePlan === "advanced" && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {t?.yourPlan ?? "Your plan"}
              </span>
            )}
          </div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$10 <span className="text-base font-normal text-[var(--muted)]">{t?.perMonth ?? "/ month"}</span></div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>{t?.advancedBullet1 ?? "Unlimited exports"}</li>
            <li>{t?.advancedBullet2 ?? "Access to all built-in formats"}</li>
            <li>{t?.advancedBullet3 ?? "Custom Format Builder"}</li>
            <li>{t?.advancedBullet4 ?? "Save, reuse, import, and export formats"}</li>
          </ul>
          {activePlan === "advanced" ? (
            hasStripeCustomer ? (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={openPortal}
                disabled={busy !== null || billingUnavailable}
                type="button"
              >
                {busy === "portal" ? (t?.starting ?? "Starting…") : (t?.manageBilling ?? "Manage billing")}
              </button>
            ) : (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] opacity-60 cursor-wait"
                disabled
                type="button"
              >
                {t?.syncingBilling ?? "Syncing billing info…"}
              </button>
            )
          ) : activePlan === "basic" ? (
            hasStripeCustomer ? (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={openPortal}
                disabled={busy !== null || billingUnavailable}
                type="button"
              >
                {busy === "portal" ? (t?.starting ?? "Starting…") : (t?.upgradeToAdvanced ?? "Upgrade to Advanced")}
              </button>
            ) : (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] opacity-60 cursor-wait"
                disabled
                type="button"
              >
                {t?.syncingBilling ?? "Syncing billing info…"}
              </button>
            )
          ) : (
            <button
              className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
              onClick={() => startCheckout("advanced")}
              disabled={busy !== null || billingUnavailable}
              type="button"
            >
              {busy === "advanced" ? (t?.starting ?? "Starting…") : sub?.signedIn ? (t?.subscribe ?? "Subscribe") : (t?.signInToSubscribe ?? "Sign in to subscribe")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-[var(--muted)]">
        {t?.stripeNote ?? "Subscriptions are handled securely by Stripe. Cancel any time from your billing portal."}
      </div>
    </div>
  );
}
