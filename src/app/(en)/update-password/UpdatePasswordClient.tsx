"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/browser";
import { useCookieLocale } from "@/lib/i18n/useCookieLocale";
import type { Locale } from "@/lib/i18n/locales";
import type { Translations } from "@/lib/i18n/getTranslations";

type Props = { authByLocale: Record<Locale, Translations["auth"]> };

export default function UpdatePasswordClient({ authByLocale }: Props) {
  const t = authByLocale[useCookieLocale()];
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let alive = true;
    void getSupabase().then((supabase) => {
      if (!alive) return;
      // Listen for the PASSWORD_RECOVERY event emitted when a recovery link is clicked
      const authListener = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setSessionReady(true);
      });
      unsubscribe = () => authListener.data.subscription.unsubscribe();
      // Check if a session is present (set by the auth callback after the reset link)
      void supabase.auth.getSession().then((result) => {
        if (alive) setSessionReady(!!result.data?.session);
      });
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ text: t.passwordsMismatch, ok: false });
      return;
    }
    if (password.length < 6) {
      setMsg({ text: t.passwordTooShort, ok: false });
      return;
    }
    setMsg(null);
    setBusy(true);

    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg({ text: t.passwordUpdated, ok: true });
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setMsg({ text: (err instanceof Error && err.message) || t.updateFailed, ok: false });
    } finally {
      setBusy(false);
    }
  }

  if (sessionReady === null) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
          {t.verifyingLink}
        </div>
      </main>
    );
  }

  if (!sessionReady) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h1 className="text-2xl font-semibold">{t.linkExpiredTitle}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t.linkExpiredDesc}
          </p>
          <Link
            href="/reset-password"
            className="rg-btn mt-6 inline-block px-4 py-3 text-sm font-semibold"
          >
            {t.requestNewLink}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-2xl font-semibold">{t.setNewTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t.setNewDesc}
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
            <label className="text-sm font-semibold">{t.newPassword}</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={busy || (msg?.ok ?? false)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">{t.confirmPassword}</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={busy || (msg?.ok ?? false)}
            />
          </div>

          <button
            disabled={busy || (msg?.ok ?? false)}
            className="rg-btn w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? t.updating : t.updatePassword}
          </button>
        </form>
      </div>
    </main>
  );
}
