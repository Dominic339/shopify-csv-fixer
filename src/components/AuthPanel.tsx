"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signInWithMagicLink() {
    setStatus("Sending login link...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });

    if (error) setStatus(`Error: ${error.message}`);
    else setStatus("Check your email for the login link.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setStatus("Signed out.");
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Account</h2>

      {userEmail ? (
        <>
          <p className="mt-2 text-sm text-[var(--muted)]">Signed in as <span className="font-semibold">{userEmail}</span></p>
          <button
            onClick={signOut}
            className="rgb-btn mt-4 bg-[var(--surface-2)] px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to unlock subscription features.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={signInWithMagicLink}
              className="rgb-btn bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
            >
              Email login link
            </button>
          </div>
        </>
      )}

      {status ? <p className="mt-3 text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
