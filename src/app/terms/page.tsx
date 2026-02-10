import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | CSNest",
  description: "Terms of service for CSNest.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>

      <p className="mt-4 text-white/80">
        CSNest is provided as-is without warranties. You are responsible for verifying the accuracy of your exports
        before importing into third-party services.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Acceptable use</h2>
      <p className="mt-2 text-white/80">
        Do not use CSNest to upload or process unlawful content. Do not attempt to disrupt the service or bypass usage limits.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Subscriptions</h2>
      <p className="mt-2 text-white/80">
        Subscription billing is managed through Stripe. You can cancel or manage your subscription through the billing portal.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Limitation of liability</h2>
      <p className="mt-2 text-white/80">
        CSNest is not liable for losses related to data imports, business operations, or third-party platform issues.
      </p>
    </main>
  );
}
