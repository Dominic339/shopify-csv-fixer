// src/app/profile/ProfileClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE, isValidLocale, localeHref, type Locale } from "@/lib/i18n/locales";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { Translations } from "@/lib/i18n/getTranslations";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  current_period_end: string | null;
  stripeCustomerId?: string | null;
};

async function safeReadJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type Props = {
  tProfile?: Translations["profile"];
  navT?: Translations["nav"];
};

export default function ProfileClient({ tProfile, navT }: Props) {
  const { theme } = useTheme();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null);

  const [currentLocale, setCurrentLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [localeBusy, setLocaleBusy] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const cookieVal = match?.[1];
    if (cookieVal && (LOCALES as readonly string[]).includes(cookieVal)) {
      setCurrentLocale(cookieVal as Locale);
    }
  }, []);

  const upgradeIntent = useMemo(() => {
    const u = (sp.get("upgrade") ?? "").toLowerCase();
    return u === "basic" || u === "advanced" ? (u as "basic" | "advanced") : null;
  }, [sp]);

  async function load() {
    const FALLBACK_SUB: SubStatus = { signedIn: false, plan: "free", status: "none", current_period_end: null };

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setSub(FALLBACK_SUB);
    } else {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan,status,current_period_end,stripe_customer_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const activePlan = data?.status === "active" ? data.plan : "free";
      setSub({
        signedIn: true,
        plan: (activePlan ?? "free") as SubStatus["plan"],
        status: data?.status ?? "none",
        current_period_end: data?.current_period_end ?? null,
        stripeCustomerId: (data as any)?.stripe_customer_id ?? null,
      });
    }

    try {
      const statusRes = await fetch("/api/stripe/status", { cache: "no-store" });
      const text = await statusRes.text();
      const j = text ? JSON.parse(text) : { enabled: true };
      setStripeEnabled(Boolean(j?.enabled ?? true));
    } catch {
      setStripeEnabled(true);
    }
  }

  useEffect(() => {
    const FALLBACK_SUB: SubStatus = { signedIn: false, plan: "free", status: "none", current_period_end: null };
    load().catch(() => { setSub(FALLBACK_SUB); setStripeEnabled(true); });
  }, []);

  const billingUnavailable = stripeEnabled === false;

  function handleLocaleChange(locale: Locale) {
    if (localeBusy) return;
    setLocaleBusy(true);
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setCurrentLocale(locale);

    const segments = (pathname ?? "/").split("/").filter(Boolean);
    const firstSegment = segments[0] ?? "";
    const routePath = isValidLocale(firstSegment)
      ? "/" + segments.slice(1).join("/") || "/"
      : pathname ?? "/";

    window.location.href = localeHref(locale, routePath);
  }

  async function openPortal() {
    if (billingUnavailable) return;
    setBusy(true);
    setMsg("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const j = await safeReadJson(r);

      if (!r.ok) {
        if (j?.error === "stripe_not_configured") { setStripeEnabled(false); return; }
        const errMsg =
          j?.error ||
          `Billing portal failed (${r.status}). Check STRIPE_SECRET_KEY + NEXT_PUBLIC_SITE_URL env vars.`;
        const details = j?.details ? ` ${j.details}` : "";
        setMsg(errMsg + details);
        return;
      }

      if (!j?.url) {
        setMsg("Billing portal response missing URL.");
        return;
      }

      window.location.href = j.url;
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to open portal");
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout(plan: "basic" | "advanced") {
    if (billingUnavailable) return;
    setBusy(true);
    setMsg("");

    try {
      if (!sub?.signedIn) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/profile?upgrade=${plan}`)}&msg=${encodeURIComponent(
            "Sign in to upgrade your plan."
          )}`
        );
        return;
      }

      const supabase = createClient();
      const { data: { session: sess } } = await supabase.auth.getSession();
      const token = sess?.access_token;

      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan }),
      });

      const j = await safeReadJson(r);

      if (!r.ok) {
        if (j?.error === "stripe_not_configured") { setStripeEnabled(false); return; }
        setMsg(j?.error ?? "Could not start checkout.");
        return;
      }

      if (!j?.url) {
        setMsg("Checkout response missing URL.");
        return;
      }

      window.location.href = j.url;
    } catch (e: any) {
      setMsg(e?.message ?? "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{navT?.profile ?? "Profile"}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{tProfile?.verifySubscription ?? "Verify your subscription and manage billing."}</p>

      {billingUnavailable ? (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {tProfile?.billingUnavailable ?? "Billing is temporarily unavailable. Please try again later."}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {sub ? (
          <>
            <div className="text-sm text-[var(--muted)]">{tProfile?.subscription ?? "Subscription"}</div>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                {tProfile?.signedIn ?? "Signed in"}: <span className="font-semibold">{sub.signedIn ? (tProfile?.yes ?? "Yes") : (tProfile?.no ?? "No")}</span>
              </div>
              <div>
                {navT?.plan ?? "Plan"}: <span className="font-semibold">{sub.plan}</span>
              </div>
              <div>
                {tProfile?.status ?? "Status"}: <span className="font-semibold">{sub.status}</span>
              </div>
              <div>
                {tProfile?.periodEnd ?? "Period end"}: <span className="font-semibold">{sub.current_period_end ?? "—"}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {sub.signedIn && sub.status === "active" ? (
                sub.stripeCustomerId ? (
                  <button
                    className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={openPortal}
                    disabled={busy || billingUnavailable}
                    type="button"
                  >
                    {busy ? (tProfile?.opening ?? "Opening…") : (tProfile?.manageStripe ?? "Manage in Stripe (upgrade/cancel)")}
                  </button>
                ) : (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
                    {tProfile?.billingSyncing ?? "Billing portal syncing… please check back in a moment."}
                  </div>
                )
              ) : null}

              {sub.signedIn && sub.status !== "active" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-60"
                    onClick={() => startCheckout("basic")}
                    disabled={busy || billingUnavailable}
                    type="button"
                  >
                    {tProfile?.upgradeToBasic ?? "Upgrade to Basic"}
                  </button>

                  <button
                    className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-60"
                    onClick={() => startCheckout("advanced")}
                    disabled={busy || billingUnavailable}
                    type="button"
                  >
                    {tProfile?.upgradeToAdvanced ?? "Upgrade to Advanced"}
                  </button>
                </div>
              ) : null}

              {sub.signedIn && sub.status === "active" && sub.plan === "basic" ? (
                <button
                  className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-60"
                  onClick={() => startCheckout("advanced")}
                  disabled={busy || billingUnavailable}
                  type="button"
                >
                  {tProfile?.upgradeToAdvanced ?? "Upgrade to Advanced"}
                </button>
              ) : null}

              {!sub.signedIn ? (
                <Link
                  href={
                    upgradeIntent
                      ? `/login?redirect=${encodeURIComponent(
                          `/profile?upgrade=${upgradeIntent}`
                        )}&msg=${encodeURIComponent("Sign in to upgrade your plan.")}`
                      : "/login?redirect=%2Fprofile"
                  }
                  className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
                >
                  {navT?.signIn ?? "Sign in"}
                </Link>
              ) : null}

              <Link
                href="/ecommerce-csv-fixer"
                className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold"
              >
                {tProfile?.backToEcommerce ?? "Back to Ecommerce"}
              </Link>
            </div>

            {upgradeIntent ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                {tProfile?.youreSignedIn ?? "You’re signed in. Choose a plan above to upgrade."}
              </div>
            ) : null}

            {msg ? <div className="mt-3 text-sm text-[var(--muted)]">{msg}</div> : null}
          </>
        ) : (
          <div className="text-sm text-[var(--muted)]">{tProfile?.loading ?? "Loading…"}</div>
        )}
      </div>
      {/* Language selector */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-semibold">{tProfile?.language ?? "Language"}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {tProfile?.languageDesc ?? "Choose your preferred display language. This overrides browser detection."}
        </p>
        <p className="mt-2 text-xs text-amber-300">
          Language support is currently in beta. Some pages and tool content may still appear in English while localization is being completed.
        </p>
        <div className="mt-4">
          <select
            className="w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            style={{ colorScheme: theme }}
            value={currentLocale}
            disabled={localeBusy}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            aria-label="Select language"
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_NAMES[locale]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {tProfile?.current ?? "Current"}: <span className="font-semibold">{LOCALE_NAMES[currentLocale]}</span>
          </p>
        </div>
      </div>
    </main>
  );
}