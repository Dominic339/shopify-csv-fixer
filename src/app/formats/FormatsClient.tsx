"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

export default function FormatsClient() {
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

  if (!canAccessCustomFormats) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Custom Formats</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats for any
          workflow.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="rgb-btn" onClick={() => setUpgradeOpen(true)}>
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upgrade to Advanced</span>
          </button>

          <Link
            href="/"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]"
          >
            Back to Home
          </Link>
        </div>

        <UpgradeModal
          open={upgradeOpen}
          title="Advanced only"
          message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
          onClose={() => setUpgradeOpen(false)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Custom Formats</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Define expected columns, apply cleanup rules, validate data, and reuse the same format across files.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]"
          >
            CSV Fixer
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Your formats</div>
          <p className="mt-2 text-sm text-[var(--muted)]">Saved formats will appear here.</p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
            >
              New format
            </button>
            <button
              type="button"
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
            >
              Import format file
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
            Formats are saved locally on your device. You can export format files to back up or share them.
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Format Builder</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This workspace will include column design, rule controls, sample CSV preview, and export actions.
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="text-sm font-semibold text-[var(--text)]">Next</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Add and reorder columns</li>
              <li>Set required fields and default values</li>
              <li>Apply rules like trim, uppercase, numeric only, regex, and allowed values</li>
              <li>Import a sample CSV to preview issues</li>
              <li>Save and export as a format file</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
