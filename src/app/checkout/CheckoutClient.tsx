"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { localeHref, type Locale } from "@/lib/i18n/locales";
import { useCookieLocale } from "@/lib/i18n/useCookieLocale";
import { fmt } from "@/lib/i18n/fmt";
import type { Translations } from "@/lib/i18n/getTranslations";

type Props = { authByLocale: Record<Locale, Translations["auth"]> };

export default function CheckoutClient({ authByLocale }: Props) {
  const locale = useCookieLocale();
  const t = authByLocale[locale];
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get("status"); // success/canceled
  const plan = sp.get("plan"); // basic/advanced/pass
  const isPass = plan === "pass";
  // A pass buyer goes straight back to the fixer, where their file is waiting.
  const doneHref = localeHref(locale, isPass ? "/app" : "/profile");

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
          if (isPass) {
            const r = await fetch("/api/quota/status", { cache: "no-store" });
            const j = await r.json().catch(() => ({}));
            if (j?.passExpiresAt) {
              if (!cancelled && !redirected.current) {
                redirected.current = true;
                setSynced(true);
                router.replace(doneHref);
              }
              return;
            }
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
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
                router.replace(doneHref);
              }
              return;
            }
          }
        } catch {
          // ignore transient errors — keep polling
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      // Timed out — still redirect so the user isn't stuck
      if (!cancelled && !redirected.current) {
        redirected.current = true;
        setSynced(true);
        router.replace(doneHref);
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
  }, [status, router, locale, isPass, doneHref]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">{t.checkoutTitle}</h1>

      {status === "success" ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          {synced
            ? isPass ? t.checkoutPassActivated : t.checkoutActivated
            : isPass ? t.checkoutPassSyncing : t.checkoutSyncing}
        </p>
      ) : status === "canceled" ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{t.checkoutCanceled}</p>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">{t.checkoutPreparing}</p>
      )}

      {plan && !isPass && status !== "success" ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {fmt(t.planName, { plan })}
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Link
          className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold hover:bg-[var(--surface-2)]"
          href={doneHref}
        >
          {isPass ? t.backToFixer : t.viewProfile}
        </Link>
      </div>
    </main>
  );
}
