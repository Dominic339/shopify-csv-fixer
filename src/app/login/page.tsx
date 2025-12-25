import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-6 py-16">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          </div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
