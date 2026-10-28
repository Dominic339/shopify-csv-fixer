"use client";

import { useState } from "react";
import Link from "next/link";

import { localeHref } from "@/lib/i18n/locales";
import { fmt, plural } from "@/lib/i18n/fmt";
import { groupFixesByType, generateFixesLogText } from "@/lib/validation/fixesLog";
import { downloadText, type AppStrings, type Fixer } from "./useFixer";
import { card, muted, platformLabel, StepTitle } from "./ui";

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "bad" | "warn" | "good" }) {
  const color =
    tone === "bad" ? "text-red-600 dark:text-red-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : tone === "good" ? "text-green-600 dark:text-green-400" : "text-[var(--text)]";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className={`text-xs ${muted}`}>{label}</div>
    </div>
  );
}

/** Step 3: is the file ready, export it, and what was changed. */
export function ResultsPanel({ f, t, onJumpToIssues }: { f: Fixer; t: AppStrings; onJumpToIssues: () => void }) {
  const [copied, setCopied] = useState(false);
  const platform = platformLabel(f.formatId);
  const blocked = f.blockingCount > 0;
  const counts = f.validation.counts;
  const scrollToIssues = onJumpToIssues;
  const href = (p: string) => localeHref(f.currentLocale, p);

  function onExport() {
    if (f.quotaExceeded && !f.subStatus?.signedIn) {
      f.setShowQuotaModal(true);
      return;
    }
    if (blocked && !window.confirm(plural(f.blockingCount, t.exportBlockedConfirmOne, t.exportBlockedConfirm))) return;
    void f.exportFixedCsv();
  }

  const sim = f.importSimulation;
  const simLines: string[] = sim
    ? [
        "mergedVariants" in sim && f.formatId === "shopify_products" ? plural(sim.mergedVariants, t.simMergedOne, t.simMerged) : "",
        "overwriteSkuRisk" in sim ? plural(Number(sim.overwriteSkuRisk ?? 0), t.simSkuOverwriteOne, t.simSkuOverwrite) : "",
        "orphanedVariations" in sim ? plural(Number(sim.orphanedVariations ?? 0), t.simOrphansOne, t.simOrphans) : "",
        "overwriteListingIdRisk" in sim ? plural(Number(sim.overwriteListingIdRisk ?? 0), t.simListingOverwriteOne, t.simListingOverwrite) : "",
        plural(sim.deletedRows, t.simIgnoredOne, t.simIgnored),
        plural(sim.rejectedRows, t.simRejectedOne, t.simRejected),
      ].filter(Boolean)
    : [];

  return (
    <section className={`${card} p-5 sm:p-7`}>
      <StepTitle n={3}>{t.stepReview}</StepTitle>

      {/* Status */}
      <div
        className={`mt-4 rounded-2xl border p-4 sm:p-5 ${
          blocked ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10" : "border-green-300 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10"
        }`}
        role="status"
      >
        <div className={`text-lg font-semibold ${blocked ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
          {blocked ? plural(f.blockingCount, t.blockedTitleOne, t.blockedTitle) : platform ? fmt(t.readyFor, { platform }) : t.readyGeneric}
        </div>
        <p className={`mt-1 text-sm ${muted}`}>{blocked ? t.blockedDesc : t.readyDesc}</p>

        {blocked && f.readiness.blockingGroups.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {f.readiness.blockingGroups.slice(0, 4).map((g) => (
              <li key={g.code} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <button type="button" className="text-left font-medium text-[var(--text)] hover:underline" onClick={scrollToIssues}>
                  {g.title}
                </button>
                <span className={muted}>({g.count})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Numbers */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.statErrors} value={counts.errors} tone={counts.errors ? "bad" : "good"} />
        <Stat label={t.statWarnings} value={counts.warnings} tone={counts.warnings ? "warn" : "good"} />
        <Stat label={t.statFixes} value={f.autoFixes.length} />
        <Stat label={t.validationScore} value={`${f.validation.score}/100`} />
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className="rg-btn justify-center"
          onClick={onExport}
          disabled={f.busy || f.rows.length === 0 || (f.quotaExceeded && f.subStatus?.signedIn)}
        >
          {f.busy ? t.working : blocked ? t.exportAnyway : t.exportFixed}
        </button>
        {(counts.errors > 0 || counts.warnings > 0) && (
          <button type="button" className="pill-btn justify-center" onClick={scrollToIssues}>
            {t.jumpToIssues}
          </button>
        )}
        {f.autoFixes.length > 0 && (
          <button
            type="button"
            className="pill-btn justify-center"
            onClick={() => downloadText(`${f.fixLogBase}_fix_log.txt`, generateFixesLogText(f.autoFixes, { fileName: f.fileName ?? undefined, formatId: f.formatId }))}
          >
            {t.downloadFixLog}
          </button>
        )}
        {f.lastExportStats && (
          <button
            type="button"
            className="pill-btn justify-center"
            onClick={() => {
              const s = f.lastExportStats!;
              const text = fmt(t.shareText, { fixes: s.fixes, rows: s.rows, score: s.score });
              if (typeof navigator.share === "function") void navigator.share({ text });
              else
                void navigator.clipboard.writeText(text).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
            }}
          >
            {copied ? t.copied : t.share}
          </button>
        )}
      </div>

      {/* Quota */}
      {f.quotaExceeded && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {f.subStatus?.signedIn ? fmt(t.limitReachedAccount, { limit: f.limit ?? 0 }) : fmt(t.limitReachedDevice, { limit: f.limit ?? 0 })}{" "}
          <Link href={`${href("/")}#pricing`} className="font-semibold underline">
            {t.viewPlans}
          </Link>
        </div>
      )}

      {f.lastExportStats && !f.upsellDismissed && !f.isUnlimited && f.subStatus?.plan === "free" && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[color:rgba(var(--accent-rgb),0.3)] bg-[color:rgba(var(--accent-rgb),0.06)] px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-[var(--text)]">{fmt(t.upsellTitle, { limit: f.limit ?? 3 })}</p>
            <p className={`mt-0.5 ${muted}`}>{t.upsellBody}</p>
            <Link href={`${href("/")}#pricing`} className="mt-2 inline-block font-semibold text-[var(--text)] underline hover:opacity-80">
              {t.viewPlans} →
            </Link>
          </div>
          <button type="button" className={`shrink-0 text-lg leading-none ${muted}`} onClick={() => f.setUpsellDismissed(true)} aria-label={t.dismiss}>
            ×
          </button>
        </div>
      )}

      {/* What was changed */}
      {f.autoFixes.length > 0 ? (
        <details className="group mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <span className="transition-transform group-open:rotate-90">&#9658;</span>
            {plural(f.autoFixes.length, t.autoFixesAppliedOne, t.autoFixesApplied)}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {groupFixesByType(f.autoFixes).map((g) => (
              <span key={g.type} className={`rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs ${muted}`} title={g.sample}>
                {g.count}× {g.type}
              </span>
            ))}
          </div>
          <ul className={`mt-3 space-y-1 text-sm ${muted}`}>
            {f.collapsedAutoFixes.slice(0, 50).map((msg, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400">&#10003;</span>
                <span className="min-w-0 break-words">{msg}</span>
              </li>
            ))}
          </ul>
          {f.collapsedAutoFixes.length > 50 && <p className={`mt-2 text-xs ${muted}`}>{fmt(t.moreInLog, { count: f.collapsedAutoFixes.length - 50 })}</p>}
        </details>
      ) : (
        <p className={`mt-5 text-sm ${muted}`}>{t.noAutoFixes}</p>
      )}

      {/* Advanced */}
      <details className="group mt-4 rounded-2xl border border-[var(--border)] p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <span className="transition-transform group-open:rotate-90">&#9658;</span>
          {t.advancedChecks}
        </summary>

        <div className="mt-4 space-y-5">
          {f.importConfidence != null && (
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                {t.importConfidence}: {f.importConfidence}%
              </div>
              <p className={`text-sm ${muted}`}>{t.importConfidenceHelp}</p>
            </div>
          )}

          <div>
            <button type="button" className={`pill-btn ${f.simulateImport ? "is-active" : ""}`} onClick={() => f.setSimulateImport((v) => !v)} aria-pressed={f.simulateImport}>
              {f.simulateImport ? t.simulateImportOn : t.simulateImport}
            </button>
            <p className={`mt-2 text-sm ${muted}`}>{t.simulateHelp}</p>
            {f.simulateImport && sim && (
              <div data-testid="simulation-results-card" className={`mt-3 rounded-xl border p-3 ${blocked ? "border-red-300 dark:border-red-900/50" : "border-green-300 dark:border-green-900/50"}`}>
                <div className="font-bold text-[var(--text)]">{blocked ? t.simFail : t.simPass}</div>
                <ul className={`mt-1 list-disc pl-5 text-sm ${muted}`}>
                  {simLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {f.formatId === "shopify_products" && (
            <div>
              <button
                type="button"
                className={`pill-btn ${f.strictShopify ? "is-active" : ""}`}
                aria-pressed={f.strictShopify}
                disabled={f.busy}
                onClick={() => {
                  if (!f.isAdvancedActive && !f.strictShopify) {
                    f.setErrorBanner(t.strictNeedsAdvanced);
                    return;
                  }
                  f.setStrictShopify((v) => !v);
                }}
              >
                {f.strictShopify ? t.strictModeOn : t.strictModeOff}
                {!f.isAdvancedActive ? ` (${t.advancedPlan})` : ""}
              </button>
              <p className={`mt-2 text-sm ${muted}`}>{t.strictModeHelp}</p>
            </div>
          )}

          {f.scoreNotes.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">{t.scoreDrivers}</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {f.scoreNotes.map((n) => (
                  <div key={n.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                    <div className="font-semibold text-[var(--text)]">
                      {n.label} <span className={muted}>{n.score}</span>
                    </div>
                    <div className={`mt-1 ${muted}`}>{n.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
