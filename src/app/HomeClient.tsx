"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PricingCards } from "@/components/ui/PricingCards";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

export default function HomeClient() {
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/subscription/status", { cache: "no-store" });
        const j = (await r.json()) as SubStatus;
        if (!cancelled) setSub(j);
      } catch {
        if (!cancelled) setSub(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdvanced = useMemo(() => {
    return !!sub?.signedIn && sub.plan === "advanced" && sub.status === "active";
  }, [sub]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="grid gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm text-[var(--muted)]">CSNest</p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--text)]">
            Clean, validate, and reshape CSV files with confidence
          </h1>

          <p className="mt-4 text-lg text-[var(--muted)]">
            Fix broken CSVs fast for any platform. Auto-fix what is safe, flag what is risky, and export a
            clean file you can trust.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
            </Link>

            {canAccessCustomFormats ? (
              <Link href="/formats" className="rgb-btn">
                <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                  Open Custom Formats
                </span>
              </Link>
            ) : (
              <button type="button" className="rgb-btn opacity-60" onClick={() => setUpgradeOpen(true)}>
                <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                  Custom Formats (Advanced)
                </span>
              </button>
            )}
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
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">CSV Fixer</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                Fix broken CSV files in seconds
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Upload any CSV and CSNest will automatically clean up formatting issues, flag errors and warnings,
                and let you manually fix only what matters before exporting a clean file.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                <li>Auto-fix safe issues such as spacing, casing, and formatting</li>
                <li>Highlight errors and warnings in plain English</li>
                <li>Edit problematic cells directly in the table</li>
                <li>Built-in formats for popular platforms</li>
                <li>Export clean, ready-to-import CSVs</li>
              </ul>
              <div className="mt-6">
                <Link href="/app" className="rgb-btn">
                  <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-[var(--text)]">Custom Formats</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                Build reusable CSV formats for any workflow
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Custom Formats let you define how a CSV should look before you ever upload it. Create reusable rules for
                columns, validation, and cleanup so every file imports cleanly the first time.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
                <li>Define required columns and column order</li>
                <li>Apply rules like trim, uppercase, numeric only, regex, and defaults</li>
                <li>Validate data and surface issues before export</li>
                <li>Save formats locally and reuse them anytime</li>
                <li>Import and export format files to share or back up</li>
              </ul>

              <div className="mt-6">
                {canAccessCustomFormats ? (
                  <Link href="/formats" className="rgb-btn">
                    <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                      Open Custom Formats
                    </span>
                  </Link>
                ) : (
                  <button type="button" className="rgb-btn opacity-60" onClick={() => setUpgradeOpen(true)}>
                    <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                      Custom Formats (Advanced)
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16" id="pricing">
        <h2 className="text-2xl font-semibold text-[var(--text)]">Pricing</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Start free. Upgrade only when you need more exports or custom formats.
        </p>

        <div className="mt-8">
          <PricingCards />
        </div>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Subscriptions are handled securely by Stripe. Cancel any time from your billing portal.
        </p>
      </section>

      <UpgradeModal
        open={upgradeOpen}
        title="Advanced only"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        onClose={() => setUpgradeOpen(false)}
      />
    </main>
  );
}
