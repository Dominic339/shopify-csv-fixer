// src/app/profile/page.tsx
import { Suspense } from "react";
import ProfileClient from "./ProfileClient";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            Loading profile…
          </div>
        </div>
      }
    >
      <ProfileClient />
    </Suspense>
  );
}
