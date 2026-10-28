// src/app/app/AppClient.tsx
// CSV Fixer page: 1. choose format → 2. upload → 3. review + export → fix remaining issues.
// State and logic live in ./fixer/useFixer.ts; each step is its own component.
"use client";

import { useRef } from "react";
import { QuotaWallCapture } from "@/components/QuotaWallCapture";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref } from "@/lib/i18n/locales";
import { useFixer, type AppStrings } from "./fixer/useFixer";
import { FormatPicker } from "./fixer/FormatPicker";
import { UploadPanel } from "./fixer/UploadPanel";
import { ResultsPanel } from "./fixer/ResultsPanel";
import { IssuesPanel } from "./fixer/IssuesPanel";
import { WorkspaceBar } from "./fixer/WorkspaceBar";
import { muted } from "./fixer/ui";

export default function AppClient({ tApp }: { tApp: AppStrings }) {
  const t = tApp;
  const f = useFixer(t);
  const issuesRef = useRef<HTMLElement>(null);
  const jumpToIssues = () => issuesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const hasFile = f.rows.length > 0 || f.issuesForTable.length > 0;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">{t.title}</h1>
            <p className={`mt-2 text-base ${muted}`}>{t.subtitle}</p>
          </div>
          <div className="shrink-0 self-start rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm">
            <span className="font-semibold text-[var(--text)]">
              {f.isUnlimited ? t.unlimitedExports : fmt(t.exportsLeft, { left: f.left ?? 0, limit: f.limit ?? 0 })}
            </span>
            <span className={`ml-2 ${muted}`}>· {fmt(t.planLabel, { plan: f.subStatus?.plan ?? "free" })}</span>
          </div>
        </header>

        {f.errorBanner ? (
          <div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-base text-red-800 dark:border-red-900/50 dark:bg-red-900/15 dark:text-red-200">
            <span>{f.errorBanner}</span>
            <button type="button" onClick={() => f.setErrorBanner(null)} className="shrink-0 text-sm underline">
              {t.dismiss}
            </button>
          </div>
        ) : null}
        {f.infoBanner ? (
          <div className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm ${muted}`}>
            <span>{f.infoBanner}</span>
            <button type="button" onClick={() => f.setInfoBanner(null)} className="shrink-0 text-xs underline">
              {t.dismiss}
            </button>
          </div>
        ) : null}

        <WorkspaceBar f={f} t={t} />

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <FormatPicker f={f} t={t} />
          <UploadPanel f={f} t={t} />
        </div>

        {hasFile ? (
          <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6">
            <ResultsPanel f={f} t={t} onJumpToIssues={jumpToIssues} />
            <IssuesPanel f={f} t={t} sectionRef={issuesRef} />
          </div>
        ) : (
          <ol className={`mt-6 grid gap-3 text-sm sm:grid-cols-3 ${muted}`}>
            {[t.howStep1, t.howStep2, t.howStep3].map((step, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)]">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {f.showQuotaModal && (
        <QuotaWallCapture
          t={t}
          locale={f.currentLocale}
          limit={f.limit ?? 3}
          pricingHref={`${localeHref(f.currentLocale, "/")}#pricing`}
          onDismiss={() => f.setShowQuotaModal(false)}
        />
      )}
    </>
  );
}
