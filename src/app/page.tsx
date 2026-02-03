import Link from "next/link";
import { PricingCards } from "@/components/ui/PricingCards";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="grid gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm text-[var(--muted)]">Shopify CSV Fixer</p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Fix Shopify CSV import issues in seconds
          </h1>

          <p className="mt-4 text-lg text-[var(--muted)]">
            Upload your CSV, instantly see what&apos;s wrong, auto-fix what&apos;s safe, and export a clean file ready for Shopify.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-white">
                Start free no account required
              </span>
            </Link>
          </div>

          <div className="mt-4 flex gap-6 text-xs text-[var(--muted)]">
            <span>Files processed locally</span>
            <span>No forced signup</span>
            <span>Cancel anytime</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-sm font-semibold">What it does</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Fix common CSV issues that break Shopify imports</li>
            <li>Validate files and explain errors in plain English</li>
            <li>Export a Shopify ready CSV</li>
          </ul>
        </div>
      </section>

      {/* PricingCards already includes the "Subscriptions are handled..." line */}
      <section className="mt-16">
        <PricingCards />
      </section>
    </main>
  );
}
