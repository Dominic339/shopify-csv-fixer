// src/app/HomeClient.tsx
"use client";

import Link from "next/link";

export default function HomeClient({ jsonLd }: { jsonLd: unknown }) {
  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/CSV%20Nest%20Logo.png"
              alt="CSNest"
              width={28}
              height={28}
              className="rounded-md"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[var(--text)]">CSNest</div>
              <div className="text-xs text-[var(--muted)]">Fix imports fast</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link className="rgb-btn" href="/app">
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">CSV Fixer</span>
            </Link>
            <button type="button" className="rgb-btn opacity-60" aria-label="Custom Formats (Advanced)">
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--muted)]">CSNest</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--text)]">
              Shopify CSV fixer for clean product imports
            </h1>
            <p className="mt-4 text-lg text-[var(--muted)]">
              Clean up messy product CSV files for Shopify imports. Auto-fix safe issues, flag risky rows,
              and export a clean file you can trust.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rgb-btn" href="/app">
                <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
              </Link>
              <button type="button" className="rgb-btn">
                <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                  Custom Formats (Advanced)
                </span>
              </button>
            </div>

            <div className="mt-4 flex gap-6 text-xs text-[var(--muted)]">
              <span>Files processed locally</span>
              <span>No forced signup</span>
              <span>Cancel anytime</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-sm font-semibold text-[var(--text)]">What it does</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Fix common CSV issues that break imports</li>
              <li>Normalize formatting such as spacing, casing, and columns</li>
              <li>Manually edit problem cells and export a clean CSV</li>
            </ul>
          </div>
        </section>

        <section className="mt-16">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-lg font-semibold text-[var(--text)]">Built for Shopify product CSV imports</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              If you are importing products, variants, and inventory into Shopify, small CSV issues can cause big
              import failures. CSNest helps you clean your file before you upload it.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
                <h3 className="text-sm font-semibold text-[var(--text)]">Common Shopify CSV problems</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                  <li>Extra whitespace and inconsistent casing</li>
                  <li>Missing required columns or unexpected headers</li>
                  <li>Duplicate handles or malformed values</li>
                  <li>Mixed types, blanks, and broken formatting</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
                <h3 className="text-sm font-semibold text-[var(--text)]">How CSNest helps</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                  <li>Applies safe cleanup automatically</li>
                  <li>Flags risky rows and cells for review</li>
                  <li>Exports a cleaner CSV for import</li>
                  <li>Supports reusable formats for repeat jobs</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16" id="pricing">
          <div className="grid gap-6 md:grid-cols-3" id="pricing">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <div className="text-sm text-[var(--muted)]">Free</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$0</div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                <li>Fix and export CSV files</li>
                <li>3 exports per month per device</li>
                <li>Access to all built-in formats</li>
                <li>No account required</li>
              </ul>
              <button className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)]" type="button">
                Start free
              </button>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <div className="text-sm text-[var(--muted)]">Basic</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$3 / month</div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                <li>100 exports per month</li>
                <li>Access to all built-in formats</li>
                <li>Account required</li>
                <li>Manage billing in Profile</li>
              </ul>
              <button className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50" type="button">
                Sign in to subscribe
              </button>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <div className="text-sm text-[var(--muted)]">Advanced</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--text)]">$10 / month</div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                <li>Unlimited exports</li>
                <li>Access to all built-in formats</li>
                <li>Custom Format Builder</li>
                <li>Save, reuse, import, and export formats</li>
              </ul>
              <button className="rgb-btn mt-6 w-full px-5 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50" type="button">
                Sign in to subscribe
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-[var(--muted)]">
            Subscriptions are handled securely by Stripe. Cancel any time from your billing portal.
          </div>
        </section>

        <section className="mt-16">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-lg font-semibold text-[var(--text)]">FAQ</h2>
            <div className="mt-6 grid gap-4">
              <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                  Does CSNest upload or store my CSV files?
                </summary>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  CSNest processes CSV files in your browser. You can export a clean CSV, and optional account
                  features are for subscription and saved formats.
                </p>
              </details>

              <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                  Will this fix Shopify product CSV import errors?
                </summary>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  CSNest is designed for Shopify CSV cleanup. It normalizes formatting, flags risky rows, and helps
                  you export a cleaner file for import. Some issues still require manual review depending on your data.
                </p>
              </details>

              <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                  Can I use CSNest without an account?
                </summary>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Yes. The Free plan works without an account. An account is required for paid plans and billing management.
                </p>
              </details>

              <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                  Will CSNest fix every CSV automatically?
                </summary>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No tool can safely auto-fix every edge case. CSNest auto-fixes what is safe and clearly flags what needs review
                  so you stay in control.
                </p>
              </details>

              <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                  Can I create reusable formats for repeat jobs?
                </summary>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Yes. Custom Formats let you save column templates and reusable rules. That feature is included with the Advanced plan.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
