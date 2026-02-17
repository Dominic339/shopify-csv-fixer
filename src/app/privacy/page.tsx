import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | StriveFormats",
  description: "Privacy policy for StriveFormats.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>

      <p className="mt-4 text-white/80">
        StriveFormats is designed to process CSV files in your browser and provide export-ready output.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Data we collect</h2>
      <p className="mt-2 text-white/80">
        We may collect basic account information (such as email) for authentication and subscription management.
        We may collect usage events for analytics to improve the product.
      </p>

      <h2 className="mt-8 text-xl font-semibold">CSV content</h2>
      <p className="mt-2 text-white/80">
        Your uploaded CSV content is processed to provide fixes and exports. If server-side processing is used for
        specific features, it is only used to fulfill the request and not sold.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Payments</h2>
      <p className="mt-2 text-white/80">
        Payments are handled by Stripe. StriveFormats does not store your full payment card details.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Contact</h2>
      <p className="mt-2 text-white/80">
        If you need help or want your account data removed, contact the site owner.
      </p>
    </main>
  );
}
