"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function UpdatePasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if a session is present (set by the auth callback after the reset link)
    const supabase = createClient();
    supabase.auth.getSession().then((result) => {
      setSessionReady(!!result.data?.session);
    });

    // Also listen for the PASSWORD_RECOVERY event emitted when a recovery link is clicked
    const authListener = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    return () => authListener.data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ text: "Passwords do not match.", ok: false });
      return;
    }
    if (password.length < 6) {
      setMsg({ text: "Password must be at least 6 characters.", ok: false });
      return;
    }
    setMsg(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg({ text: "Password updated successfully. Redirecting to login…", ok: true });
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setMsg({ text: err?.message ?? "Failed to update password.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  if (sessionReady === null) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
          Verifying reset link…
        </div>
      </main>
    );
  }

  if (!sessionReady) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h1 className="text-2xl font-semibold">Link expired or invalid</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <a
            href="/reset-password"
            className="rgb-btn mt-6 inline-block bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
          >
            Request new link
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter and confirm your new password below.
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
            <label className="text-sm font-semibold">New password</label>
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
            <label className="text-sm font-semibold">Confirm password</label>
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
            className="rgb-btn w-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
