"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { useCookieLocale } from "@/lib/i18n/useCookieLocale";
import type { Locale } from "@/lib/i18n/locales";
import type { Translations } from "@/lib/i18n/getTranslations";

type Props = { authByLocale: Record<Locale, Translations["auth"]> };

export default function ResetPasswordClient({ authByLocale }: Props) {
  const t = authByLocale[useCookieLocale()];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?redirect=/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMsg({ text: t.resetSent, ok: true });
    } catch (err: any) {
      setMsg({ text: err?.message || t.somethingWrong, ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-2xl font-semibold">{t.resetTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t.resetDesc}
        </p>

        {msg ? (
          <div
            className={`mt-4 rounded-2xl border p-3 text-sm ${
              msg.ok
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300"
                : "border-[var(--border)] bg-[var(--surface-2)]"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-semibold">{t.email}</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              disabled={busy || (msg?.ok ?? false)}
            />
          </div>

          <button
            disabled={busy || (msg?.ok ?? false)}
            className="rgb-btn w-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t.sending : t.sendResetLink}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/login" className="text-[var(--muted)] hover:underline">
            {t.backToLogin}
          </Link>
          <Link href="/" className="text-[var(--muted)] hover:underline">
            {t.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
