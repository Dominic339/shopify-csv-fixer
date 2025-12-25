"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse =
  | { ok: true; user: { id: string; email: string | null } | null }
  | { ok: false; user: null };

export function UserBadge() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse>({ ok: true, user: null });

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = (await res.json()) as MeResponse;
        if (alive) setMe(data);
      } catch {
        if (alive) setMe({ ok: false, user: null });
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  // Small, clean header widget
  return (
    <div className="flex items-center justify-end">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm">
        {loading ? (
          <span className="text-[var(--muted)]">Checking session…</span>
        ) : me.ok && me.user ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[var(--muted)]">
              Signed in as <span className="font-semibold text-[var(--text)]">{me.user.email ?? "User"}</span>
            </span>
            <Link className="font-semibold text-[var(--primary)] hover:opacity-80" href="/app">
              Open app
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[var(--muted)]">Not signed in</span>
            <Link className="font-semibold text-[var(--primary)] hover:opacity-80" href="/login">
              Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
