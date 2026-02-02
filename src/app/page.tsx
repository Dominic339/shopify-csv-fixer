import Link from "next/link";
import { PricingCards } from "@/components/ui/PricingCards";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">
            Shopify CSV Fixer
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Fix Shopify CSV import issues in seconds
          </h1>

          <p className="mt-4 text-lg text-[var(--muted)]">
            Upload your CSV, instantly see what’s wrong, auto-fix what’s safe,
            and export a clean file ready for Shopify.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rgb-btn bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white"
            >
              Start free — no account required
            </Link>

            <Link
              href="/how-it-works"
              className="rgb-btn bg-[var(--surface)] px-6 py-3 text-sm"
            >
              See how it works
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
            <span>Files processed locally</span>
            <span>No forced signup</span>
            <span>Cancel anytime</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--text)]">What it does</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Fix common CSV issues that break Shopify imports</li>
            <li>Validate files and explain errors in plain English</li>
            <li>Export a Shopify-ready CSV</li>
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="mt-20">
        <h2 className="text-2xl font-semibold">How it works</h2>

        <ol className="mt-6 grid gap-6 md:grid-cols-4">
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <p className="font-semibold">Step 1</p>
            <p className="mt-1 text-[var(--muted)]">
              Upload a CSV or start from scratch
            </p>
          </li>
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <p className="font-semibold">Step 2</p>
            <p className="mt-1 text-[var(--muted)]">
              Fix or validate automatically
            </p>
          </li>
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <p className="font-semibold">Step 3</p>
            <p className="mt-1 text-[var(--muted)]">Preview results</p>
          </li>
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <p className="font-semibold">Step 4</p>
            <p className="mt-1 text-[var(--muted)]">
              Export a Shopify-ready CSV
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-24">
        <PricingCards />
      </section>

      <footer className="mt-24 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        Shopify is a trademark of Shopify Inc. This tool is not affiliated with
        or endorsed by Shopify.
      </footer>
    </main>
  );
}
