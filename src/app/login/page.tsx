"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";


export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const router = useRouter();
  const search = useSearchParams();
  const plan = useMemo(() => (search.get("plan") || "free").toLowerCase(), [search]);

  useEffect(() => {
    // If they came from pricing, default to signup
    if (plan === "basic" || plan === "advanced") setMode("signup");
  }, [plan]);

  async function onEmailAuth() {
    setMsg(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // If email confirmations are ON, user may need to confirm email first.
        // If session exists immediately, we can create profile now.
        if (data.user) {
          // Create profile with chosen plan (for now). Stripe will later control this.
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            plan: plan === "basic" || plan === "advanced" ? plan : "free",
          });
        }

        setMsg("Account created. If email confirmation is enabled, check your email to finish.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Ensure profile exists (just in case)
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
          });
        }

        router.push("/app");
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setMsg(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-14">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-2xl font-semibold">
          {mode === "signup" ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {plan === "basic" || plan === "advanced"
            ? `You selected the ${plan.toUpperCase()} plan. Create an account to continue.`
            : "Accounts are needed for memberships and subscription upgrades."}
        </p>

        {msg ? (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--muted)]">
            {msg}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--muted)]">Email</span>
            <input
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[var(--muted)]">Password</span>
            <input
              type="password"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            disabled={busy || !email || !password}
            onClick={onEmailAuth}
            className="mt-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onGoogle}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            Continue with Google
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>

          <Link href="/" className="text-[var(--muted)] hover:text-[var(--text)]">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
