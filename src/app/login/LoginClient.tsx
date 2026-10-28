"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { useCookieLocale } from "@/lib/i18n/useCookieLocale";
import { localeHref, type Locale } from "@/lib/i18n/locales";
import type { Translations } from "@/lib/i18n/getTranslations";

type Props = { authByLocale: Record<Locale, Translations["auth"]> };

export default function LoginClient({ authByLocale }: Props) {
  const locale = useCookieLocale();
  const t = authByLocale[locale];
  const sp = useSearchParams();

  const redirectTo = useMemo(() => safeRedirectPath(sp.get("redirect")), [sp]);
  // Only known message keys are shown, never free text from the URL.
  const initialMsg = useMemo(() => {
    if (sp.get("msg") === "upgrade") return t.msgUpgrade;
    if (sp.get("error")) return t.msgAuthFailed;
    return null;
  }, [sp, t]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const shownMsg = msg ?? initialMsg;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;
        setMsg(t.checkEmailConfirm);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = redirectTo;
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error && err.message ? err.message : t.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{mode === "signup" ? t.signupTitle : t.loginTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{mode === "signup" ? t.signupDesc : t.loginDesc}</p>

        {shownMsg ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" role="status">
            {shownMsg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-semibold" htmlFor="login-email">{t.email}</label>
            <input
              id="login-email"
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-base sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="login-password">{t.password}</label>
            <input
              id="login-password"
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-base sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
            />
          </div>

          <button
            disabled={busy}
            className="rgb-btn w-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t.pleaseWait : mode === "signup" ? t.signUp : t.logIn}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            className="text-[var(--muted)] hover:underline"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            type="button"
          >
            {mode === "signup" ? t.haveAccount : t.newHere}
          </button>

          <Link className="text-[var(--muted)] hover:underline" href={localeHref(locale, "/")}>
            {t.backHome}
          </Link>
        </div>

        {mode === "login" && (
          <div className="mt-3 text-center text-sm">
            <Link href="/reset-password" className="text-[var(--muted)] hover:underline">
              {t.forgotPassword}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
