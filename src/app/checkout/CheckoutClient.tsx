"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { isValidLocale, DEFAULT_LOCALE, localeHref, type Locale } from "@/lib/i18n/locales";

/** Derive locale from NEXT_LOCALE cookie (client-side only). */
function getCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const val = match?.[1] ?? "";
  return isValidLocale(val) ? val : DEFAULT_LOCALE;
}

export default function CheckoutClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get("status"); // success/canceled
  const plan = sp.get("plan"); // basic/advanced

  const [synced, setSynced] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    // After Stripe redirects back, poll until Supabase picks up the subscription.
    // On success redirect to /profile (locale-aware) so the updated plan shows.
    let cancelled = false;

    async function pollAndRedirect() {
      const supabase = createClient();

      for (let i = 0; i < 8; i++) {
        if (cancelled) return;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data } = await supabase
              .from("user_subscriptions")
              .select("status")
              .eq("user_id", session.user.id)
              .maybeSingle();
            if (data?.status === "active") {
              if (!cancelled && !redirected.current) {
                redirected.current = true;
                setSynced(true);
                const locale = getCookieLocale();
                router.replace(localeHref(locale, "/profile"));
              }
              return;
            }
          }
        } catch {
          // ignore transient errors — keep polling
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      // Timed out — still redirect to profile so the user isn't stuck
      if (!cancelled && !redirected.current) {
        redirected.current = true;
        setSynced(true);
        const locale = getCookieLocale();
        router.replace(localeHref(locale, "/profile"));
      }
    }

    if (status === "success") {
      pollAndRedirect();
    } else {
      setSynced(true);
    }

    return () => {
      cancelled = true;
    };
  }, [status, router]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {status === "success" ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          {synced
            ? "Subscription activated! Redirecting to your profile…"
            : "Syncing your subscription… you will be redirected shortly."}
        </p>
      ) : status === "canceled" ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Checkout was cancelled. No charge was made.</p>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">Preparing your checkout…</p>
      )}

      {plan && status !== "success" ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Plan: <span className="font-semibold text-[var(--text)]">{plan}</span>
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
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
