// src/app/app/page.tsx
import { Suspense } from "react";
import AppClient from "./AppClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10">Loading…</div>}>
      <AppClient />
    </Suspense>
  );
}
