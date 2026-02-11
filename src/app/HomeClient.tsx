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
            Fix broken CSVs fast for any platform. Auto-fix what is safe, flag what is risky, and export a clean file you
            can trust.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
            </Link>

            {canAccessCustomFormats ? (
              <Link href="/formats" className="rgb-btn">
                <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Custom Formats</span>
              </Link>
            ) : (
              // CHANGED: removed opacity-60 so it is not transparent
              <button type="button" className="rgb-btn" onClick={() => setUpgradeOpen(true)}>
                <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Custom Formats (Advanced)</span>
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

      <section className="mt-16" id="pricing">
        <PricingCards />
      </section>

      <section className="mt-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">CSV Fixer</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">Fix broken CSV files in seconds</div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Upload a CSV, apply a format, and let the tool auto-fix safe issues. Review anything risky, then export a
                clean file.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/app" className="rgb-btn">
                  <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open CSV Fixer</span>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
              <div className="text-sm font-semibold text-[var(--text)]">Custom Formats</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">Save and reuse your rules</div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Create reusable formats with column templates and rules. Perfect for repeat tasks like Shopify exports.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {canAccessCustomFormats ? (
                  <Link href="/formats" className="rgb-btn">
                    <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Custom Formats</span>
                  </Link>
                ) : (
                  <button type="button" className="rgb-btn" onClick={() => setUpgradeOpen(true)}>
                    <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upgrade to Advanced</span>
                  </button>
                )}
              </div>

              {!canAccessCustomFormats ? (
                <div className="mt-3 text-xs text-[var(--muted)]">Advanced plan required.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16" id="faq">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-sm font-semibold text-[var(--text)]">FAQ</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)]">Quick answers</div>

          <div className="mt-6 grid gap-4">
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                Do you upload my CSV to a server?
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                The fixer runs in your browser for the core parsing and edits. When you export, your cleaned CSV is
                generated locally.
              </p>
            </details>

            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                What kinds of problems can it fix automatically?
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Safe fixes include trimming extra spaces, normalizing empty cells, and applying consistent formatting.
                Anything that could change meaning is flagged so you can review it before export.
              </p>
            </details>

            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                What are Custom Formats?
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Custom Formats let you save reusable column templates and cleanup rules so repeat jobs take seconds.
                Advanced plan is required for creating and managing formats.
              </p>
            </details>

            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                Can I cancel or change plans later?
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Yes. You can upgrade, downgrade, or cancel from your Profile at any time.
              </p>
            </details>
          </div>
        </div>
      </section>

      <UpgradeModal
        open={upgradeOpen}
        title="Advanced only"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        signedIn={Boolean(sub?.signedIn)}
        upgradePlan="advanced"
        onClose={() => setUpgradeOpen(false)}
      />
    </main>
  );
}
