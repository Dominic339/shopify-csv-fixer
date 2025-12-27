import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-[var(--muted)]">
          Loading checkout…
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
