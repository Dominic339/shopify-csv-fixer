import Link from "next/link";
import { GradientFrame } from "@/components/ui/GradientFrame";
import { PricingCards } from "@/components/ui/PricingCards";

export default function HomePage() {
  return (
    <div className="px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <GradientFrame>
              <div className="rounded-3xl bg-[var(--surface)] p-8 shadow-sm">
                <p className="text-sm font-medium text-[var(--muted)]">Shopify CSV Fixer</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)]">
                  Fix Shopify CSV import issues in seconds
                </h1>
                <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                  Upload your CSV, instantly see what’s wrong, auto-fix what’s safe, and export a clean file ready for Shopify.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/app"
                    className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  >
                    Start free — no account required
                  </Link>
                  <a
                    href="#how"
                    className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    See how it works
                  </a>
                </div>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
                  <span>Files processed locally</span>
                  <span>No forced signup</span>
                  <span>Cancel anytime</span>
                </div>
              </div>
            </GradientFrame>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-xl font-semibold text-[var(--text)]">What it does</h2>
            <ul className="mt-4 space-y-3 text-[var(--muted)]">
              <li>• Fix common CSV issues that break Shopify imports</li>
              <li>• Validate files and explain errors in plain English</li>
              <li>• Build Shopify-ready product CSVs from scratch</li>
            </ul>

            <div id="how" className="mt-8 rounded-2xl bg-[var(--surface-2)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text)]">How it works</h3>
              <ol className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <li>1) Upload a CSV or start from scratch</li>
                <li>2) Fix or validate</li>
                <li>3) Preview results</li>
                <li>4) Export a Shopify-ready CSV</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <PricingCards />
        </div>

        <footer className="mt-16 border-t border-[var(--border)] pt-8 text-sm text-[var(--muted)]">
          <p>Shopify is a trademark of Shopify Inc. This tool is not affiliated with or endorsed by Shopify.</p>
        </footer>
      </div>
    </div>
  );
}
