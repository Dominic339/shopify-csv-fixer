// src/components/ui/PricingCards.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { Translations } from "@/lib/i18n/getTranslations";
import { createClient } from "@/lib/supabase/browser";
import { PASS_PRICE_LABEL } from "@/lib/plans";
import { startPassCheckout } from "@/lib/passCheckout";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  stripeCustomerId?: string | null;
};

type Props = {
  sub?: SubStatus | null;
  tPricing: Translations["pricing"];
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
  const [passExpiresAt, setPassExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
    fetch("/api/quota/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setPassExpiresAt(j?.passExpiresAt ?? null))
      .catch(() => {});
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
      setMsg(t.billingError);
      return;
    }
    if (json?.url) window.location.href = json.url;
  }

  async function buyPass() {
    if (billingUnavailable) return;
    setMsg("");
    if (!sub?.signedIn) {
      router.push("/login");
      return;
    }
    setBusy("pass");
    const r = await startPassCheckout();
    if (r === "redirected") return;
    setBusy(null);
    if (r === "signin") router.push("/login");
    else if (r === "unavailable") setStripeEnabled(false);
    else setMsg(t.billingError);
  }

  async function openPortal() {
    if (billingUnavailable) return;
    setMsg("");
    setBusy("portal");
    const { ok, json } = await postJson("/api/stripe/portal", undefined, accessToken);
    setBusy(null);
    if (!ok) {
      if (json?.error === "stripe_not_configured") { setStripeEnabled(false); return; }
      setMsg(t.billingError);
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
  const showPass = activePlan !== "advanced";
  const cardCount = 1 + Number(showFree) + Number(showBasic) + Number(showPass);
  const gridCols = cardCount >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : cardCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  const passTime = passExpiresAt
    ? new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(passExpiresAt))
    : null;

  return (
    <div className="mt-10">
      {billingUnavailable && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t.billingUnavailable}
        </div>
      )}
      {msg && <div className="mb-4 text-sm text-red-400">{msg}</div>}

      <div className={`grid gap-6 ${gridCols}`}>
        {/* Free */}
        {showFree && (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="text-sm text-[var(--muted)]">{t.free}</div>
            <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$0</div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>{t.freeBullet1}</li>
              <li>{t.freeBullet2}</li>
              <li>{t.freeBulletSmall}</li>
              <li>{t.freeBullet4}</li>
            </ul>
            <button
              className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)]"
              onClick={() => router.push("/app")}
              type="button"
            >
              {t.startFree}
            </button>
          </div>
        )}

        {/* 24-hour pass */}
        {showPass && (
          <div className={`rounded-3xl border p-6 shadow-sm ${passTime ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">{t.pass}</div>
              {passTime && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {t.passActiveUntil.replace("{time}", passTime)}
                </span>
              )}
            </div>
            <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{PASS_PRICE_LABEL} <span className="text-base font-normal text-[var(--muted)]">{t.oneTime}</span></div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>{t.passBullet1}</li>
              <li>{t.passBullet2}</li>
              <li>{t.passBullet3}</li>
            </ul>
            <button
              className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
              onClick={buyPass}
              disabled={busy !== null || billingUnavailable}
              type="button"
            >
              {busy === "pass" ? t.starting : sub?.signedIn ? t.buyPass : t.signInToBuy}
            </button>
          </div>
        )}

        {/* Basic */}
        {showBasic && (
          <div className={`rounded-3xl border p-6 shadow-sm ${activePlan === "basic" ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">{t.basic}</div>
              {activePlan === "basic" && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {t.yourPlan}
                </span>
              )}
            </div>
            <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$5 <span className="text-base font-normal text-[var(--muted)]">{t.perMonth}</span></div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>{t.basicBullet1}</li>
              <li>{t.basicBullet3}</li>
              <li>{t.basicBullet4}</li>
            </ul>
            {activePlan === "basic" ? (
              hasStripeCustomer ? (
                <button
                  className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                  onClick={openPortal}
                  disabled={busy !== null || billingUnavailable}
                  type="button"
                >
                  {busy === "portal" ? t.starting : t.manageBilling}
                </button>
              ) : (
                <button
                  className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] opacity-60 cursor-wait"
                  disabled
                  type="button"
                >
                  {t.syncingBilling}
                </button>
              )
            ) : (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={() => startCheckout("basic")}
                disabled={busy !== null || billingUnavailable}
                type="button"
              >
                {busy === "basic" ? t.starting : sub?.signedIn ? t.subscribe : t.signInToSubscribe}
              </button>
            )}
          </div>
        )}

        {/* Advanced */}
        <div className={`rounded-3xl border p-6 shadow-sm ${activePlan === "advanced" ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted)]">{t.advanced}</div>
            {activePlan === "advanced" && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {t.yourPlan}
              </span>
            )}
          </div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$10 <span className="text-base font-normal text-[var(--muted)]">{t.perMonth}</span></div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>{t.advancedBullet1}</li>
            <li>{t.advancedBullet3}</li>
            <li>{t.advancedBullet4}</li>
          </ul>
          {activePlan === "advanced" ? (
            hasStripeCustomer ? (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
                onClick={openPortal}
                disabled={busy !== null || billingUnavailable}
                type="button"
              >
                {busy === "portal" ? t.starting : t.manageBilling}
              </button>
            ) : (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] opacity-60 cursor-wait"
                disabled
                type="button"
              >
                {t.syncingBilling}
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
                {busy === "portal" ? t.starting : t.upgradeToAdvanced}
              </button>
            ) : (
              <button
                className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] opacity-60 cursor-wait"
                disabled
                type="button"
              >
                {t.syncingBilling}
              </button>
            )
          ) : (
            <button
              className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
              onClick={() => startCheckout("advanced")}
              disabled={busy !== null || billingUnavailable}
              type="button"
            >
              {busy === "advanced" ? t.starting : sub?.signedIn ? t.subscribe : t.signInToSubscribe}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-1 text-xs text-[var(--muted)]">
        <div>{t.allPlansFormats}</div>
        <div>{t.stripeNote}</div>
      </div>
    </div>
  );
}
