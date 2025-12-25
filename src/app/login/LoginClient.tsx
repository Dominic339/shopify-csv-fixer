"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginClient() {
  const sp = useSearchParams();

  // Example: read redirect + message from querystring (adjust to your needs)
  const redirectTo = useMemo(() => sp.get("redirect") ?? "/app", [sp]);
  const initialMsg = useMemo(() => sp.get("msg"), [sp]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(initialMsg);

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
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
              redirectTo
            )}`,
          },
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // If you're using middleware to redirect based on session, this is enough.
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-2xl font-semibold">
          {mode === "signup" ? "Create account" : "Log in"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {mode === "signup"
            ? "Create an account to manage your membership."
            : "Log in to manage your membership and exports."}
        </p>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
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
            {busy ? "Please wait…" : mode === "signup" ? "Sign up" : "Log in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            className="text-[var(--muted)] hover:underline"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            type="button"
          >
            {mode === "signup"
              ? "Already have an account? Log in"
              : "New here? Create account"}
          </button>

          <a className="text-[var(--muted)] hover:underline" href="/">
            Back home
          </a>
        </div>
      </div>
    </main>
  );
}
