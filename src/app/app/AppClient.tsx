// src/app/app/AppClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseCsv, toCsv } from "@/lib/csv";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import type { CsvFormat, CsvIssue, CsvRow } from "@/lib/formats/types";

import { fixAllShopifyBlocking } from "@/lib/validation/fixAllShopify";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

type ValidationSummary = {
  score: number;
  readyForShopifyImport: boolean;
  errorCount: number;
  warningCount: number;
  tipCount: number;
  blockingCount: number;
  autoFixableBlockingErrors: number;
  bannerTitle: string;
  bannerBody: string;
  topBlockers: Array<{ label: string; count: number }>;
};

function formatLabel(f: CsvFormat) {
  return (f as any).title ?? (f as any).name ?? (f as any).label ?? f.id;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeValidationSummary(headers: string[], rows: CsvRow[], issues: CsvIssue[], formatId: string): ValidationSummary {
  let errorCount = 0;
  let warningCount = 0;
  let tipCount = 0;

  let blockingCount = 0;
  let autoFixableBlockingErrors = 0;

  const blockerCounts = new Map<string, number>();

  for (const iss of issues ?? []) {
    if (iss.severity === "error") {
      errorCount++;
      blockingCount++;

      const meta = getIssueMeta(formatId, (iss as any).code);
      const isAutoFixable = Boolean((meta as any)?.autoFixable) || Boolean((iss as any).autoFixable) || Boolean((iss as any).safeFix);
      if (isAutoFixable) autoFixableBlockingErrors++;

      const label =
        (meta as any)?.title ??
        (iss as any).code ??
        (iss as any).message?.split(":")[0]?.slice(0, 64) ??
        "Blocking issue";
      blockerCounts.set(label, (blockerCounts.get(label) ?? 0) + 1);
    } else if (iss.severity === "warning") {
      warningCount++;
    } else {
      tipCount++;
    }
  }

  const score = clamp(100 - errorCount * 10 - warningCount * 4 - tipCount * 1, 0, 100);
  const readyForShopifyImport = blockingCount === 0;

  const topBlockers = Array.from(blockerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  const bannerTitle = readyForShopifyImport ? "Ready for Shopify Import" : "Not ready for Shopify Import";
  const bannerBody = readyForShopifyImport
    ? "No blocking issues detected. You can export and import into Shopify."
    : "Blocking issues are preventing a clean import. Fix blockers to safely import.";

  return {
    score,
    readyForShopifyImport,
    errorCount,
    warningCount,
    tipCount,
    blockingCount,
    autoFixableBlockingErrors,
    bannerTitle,
    bannerBody,
    topBlockers,
  };
}

export default function AppClient() {
  const searchParams = useSearchParams();

  const [formatId, setFormatId] = useState<string>("general_csv");

  // Respect preset chosen from preset menu (e.g. /app?preset=shopify_products)
  useEffect(() => {
    const preset = searchParams.get("preset");
    if (preset && preset !== formatId) {
      setFormatId(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When switching formats, clear pins so old errors don’t clog the next format’s workflow.
  useEffect(() => {
    setPinnedRows([]);
  }, [formatId]);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [autoFixes, setAutoFixes] = useState<string[]>([]);
  const [pinnedRows, setPinnedRows] = useState<number[]>([]);
  const rerunTimerRef = useRef<number | null>(null);
  const latestHeadersRef = useRef<string[]>([]);
  const latestFormatRef = useRef<any>(null);

  const [fileName, setFileName] = useState<string | null>(null);

  const [quota, setQuota] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [planLimits, setPlanLimits] = useState<any>(null);

  const [lastFixAll, setLastFixAll] = useState<{ at: number; applied: string[] } | null>(null);

  const [customFormats, setCustomFormats] = useState<CsvFormat[]>([]);

  const builtinFormats = useMemo(() => getAllFormats(), []);
  const allFormats = useMemo(() => [...builtinFormats, ...customFormats], [builtinFormats, customFormats]);

  const activeFormat = useMemo(() => {
    return allFormats.find((f) => f.id === formatId) ?? allFormats[0];
  }, [allFormats, formatId]);

  // Keep refs in sync for debounced re-validation after manual edits
  useEffect(() => {
    latestFormatRef.current = activeFormat;
  }, [activeFormat]);

  async function refreshQuotaAndPlan() {
    try {
      const [q, s] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setQuota(q);
      setSubStatus(s);
      const limits = await getPlanLimits(s?.plan ?? "free");
      setPlanLimits(limits);
    } catch {
      // ignore
    }
  }

  async function refreshCustomFormats() {
    try {
      const res = await fetch("/api/formats/list", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCustomFormats(data.formats ?? []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshQuotaAndPlan();
    refreshCustomFormats();

    const onChanged = () => refreshCustomFormats();
    window.addEventListener("custom-formats-changed", onChanged as any);
    return () => window.removeEventListener("custom-formats-changed", onChanged as any);
  }, []);

  // Normalize issues into the engine's CsvIssue shape for the editable table + fix-all helper
  const issuesForTable: CsvIssue[] = useMemo(() => {
    return (issues ?? [])
      .map((it) => {
        const rowIndex =
          typeof (it as any).rowIndex === "number"
            ? (it as any).rowIndex
            : typeof it.row === "number"
              ? Math.max(0, it.row - 1)
              : -1;

        const col = (it.column ?? it.field ?? "").toString();
        const sev = (it.severity ?? it.level ?? "error") as "error" | "warning" | "info";

        if (rowIndex == null) return null;

        return {
          rowIndex,
          column: col || "(file)",
          message: it.message,
          severity: sev,
          code: (it as any).code,
          suggestion: (it as any).suggestion,
        };
      })
      .filter(Boolean) as CsvIssue[];
  }, [issues]);

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }, [headers, rows]);

  useEffect(() => {
    latestHeadersRef.current = tableHeaders;
  }, [tableHeaders]);

  const validation = useMemo(() => {
    return computeValidationSummary(headers, rows, issuesForTable, formatId);
  }, [headers, rows, issuesForTable, formatId]);

  const readiness = useMemo(() => {
    if (formatId !== "shopify_products") {
      return { autoFixableBlockingErrors: 0 };
    }
    return {
      autoFixableBlockingErrors: validation.autoFixableBlockingErrors ?? 0,
    };
  }, [formatId, validation]);

  const scoreNotes = useMemo(() => {
    const cards = [
      {
        title: "Structure",
        score: clamp(validation.score + (validation.errorCount === 0 ? 4 : 0), 0, 100),
        note:
          validation.errorCount === 0
            ? "No structural errors detected"
            : `${validation.errorCount} structural blockers detected`,
      },
      {
        title: "Data",
        score: clamp(validation.score - validation.warningCount * 2, 0, 100),
        note: validation.warningCount === 0 ? "No warnings detected" : `${validation.warningCount} warnings to review`,
      },
      {
        title: "Import",
        score: validation.readyForShopifyImport ? 100 : clamp(70 - validation.blockingCount * 6, 0, 100),
        note: validation.readyForShopifyImport ? "Ready to import" : `${validation.blockingCount} blocking issues`,
      },
      {
        title: "Auto-fix",
        score: validation.blockingCount === 0 ? 100 : clamp(50 + validation.autoFixableBlockingErrors * 10, 0, 100),
        note:
          validation.autoFixableBlockingErrors > 0
            ? `${validation.autoFixableBlockingErrors} safe auto-fix blockers`
            : "No safe auto-fix blockers",
      },
    ];
    return { cards };
  }, [validation]);

  const autoFixPreviewCount = 6;
  const autoFixPreview = autoFixes.slice(0, autoFixPreviewCount);
  const autoFixRest = autoFixes.slice(autoFixPreviewCount);
  const autoFixRestCount = Math.max(0, autoFixRest.length);

  // Quota / remaining for UI
  const used = Number(quota?.used ?? 0);
  const limit = planLimits?.monthlyExports;
  const isUnlimited = limit == null || limit === "unlimited";
  const left = isUnlimited ? null : Math.max(0, Number(quota?.remaining ?? (Number(limit ?? 0) - used)));

  // Smart Fix All label + disable when no safe blockers
  const fixAllLabel =
    readiness.autoFixableBlockingErrors > 0
      ? `Fix ${readiness.autoFixableBlockingErrors} auto-fixable blockers`
      : "Fix all blocking issues";

  const fixAllDisabled =
    formatId !== "shopify_products" || readiness.autoFixableBlockingErrors === 0 || busy || rows.length === 0;

  function stampFix(msg: string) {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}] ${msg}`;
  }

  function runFormatOnCurrentData(nextHeaders: string[], nextRows: CsvRow[], additionalFixes: string[] = []) {
    const format = latestFormatRef.current ?? activeFormat;
    const res = applyFormatToParsedCsv(nextHeaders, nextRows, format);

    const outHeaders = (res.fixedHeaders ?? nextHeaders) as string[];
    const outRows = (res.fixedRows ?? nextRows) as CsvRow[];
    const outIssues = ((res.issues as any) ?? []) as any[];

    setHeaders(outHeaders);
    setRows(outRows);
    setIssues(outIssues);

    const mergedFixes = [...(additionalFixes ?? []), ...((res.fixesApplied as any) ?? [])].filter(Boolean) as string[];
    if (mergedFixes.length) {
      setAutoFixes((prev) => [...prev, ...mergedFixes.map(stampFix)]);
    }

    // Pins: add any rows that currently have errors/warnings, but NEVER auto-unpin.
    const newlyPinned = new Set<number>();
    for (const it of outIssues) {
      const sev = (it.severity ?? it.level ?? "error") as "error" | "warning" | "info";
      if (sev !== "error" && sev !== "warning") continue;

      const rowIndex =
        typeof (it as any).rowIndex === "number"
          ? (it as any).rowIndex
          : typeof it.row === "number"
            ? Math.max(0, it.row - 1)
            : -1;

      if (rowIndex >= 0) newlyPinned.add(rowIndex);
    }

    if (newlyPinned.size) {
      setPinnedRows((prev) => {
        const set = new Set(prev);
        for (const r of newlyPinned) set.add(r);
        return Array.from(set).sort((a, b) => a - b);
      });
    }
  }

  function handleFixAllBlocking() {
    if (formatId !== "shopify_products") return;

    const fixed = fixAllShopifyBlocking(tableHeaders, rows, issuesForTable);

    setLastFixAll({ at: Date.now(), applied: fixed.fixesApplied ?? [] });

    // Always re-run validation so resolved highlights disappear
    runFormatOnCurrentData(fixed.fixedHeaders, fixed.fixedRows, fixed.fixesApplied);
  }

  async function runFormatOnText(format: CsvFormat, csvText: string, name?: string) {
    setBusy(true);
    setErrorBanner(null);

    try {
      const parsed = parseCsv(csvText);

      const res = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);

      setHeaders(res.fixedHeaders ?? parsed.headers);
      setRows(res.fixedRows ?? parsed.rows);
      setIssues((res.issues as any) ?? []);

      // reset and seed the changelog for this run
      const seedFixes = (res.fixesApplied ?? []).filter(Boolean).map((x) => stampFix(x));
      setAutoFixes(seedFixes);

      // pin any rows with errors/warnings on upload
      const seededPins = new Set<number>();
      for (const it of (res.issues as any) ?? []) {
        const sev = (it.severity ?? it.level ?? "error") as "error" | "warning" | "info";
        if (sev !== "error" && sev !== "warning") continue;
        const rowIndex =
          typeof (it as any).rowIndex === "number"
            ? (it as any).rowIndex
            : typeof it.row === "number"
              ? Math.max(0, it.row - 1)
              : -1;
        if (rowIndex >= 0) seededPins.add(rowIndex);
      }
      setPinnedRows(Array.from(seededPins).sort((a, b) => a - b));

      setFileName(name ?? null);
      setLastFixAll(null);
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to parse CSV");
    } finally {
      setBusy(false);
    }
  }

  const onUpdateRow = useCallback(
    (rowIndex: number, patch: Partial<CsvRow>) => {
      setRows((prev) => {
        const next = [...prev];
        const existing = next[rowIndex] ?? {};
        const cleaned: Record<string, string> = {};

        for (const [k, v] of Object.entries(patch)) {
          if (typeof v === "string") cleaned[k] = v;
          else if (v == null) cleaned[k] = "";
          else cleaned[k] = String(v);
        }

        next[rowIndex] = { ...existing, ...cleaned };

        // Debounced re-validation so highlights and counts update while editing,
        // but pinned rows stay pinned until the user manually unpins.
        if (rerunTimerRef.current) window.clearTimeout(rerunTimerRef.current);
        rerunTimerRef.current = window.setTimeout(() => {
          const h = latestHeadersRef.current?.length ? latestHeadersRef.current : tableHeaders;
          runFormatOnCurrentData(h, next);
        }, 250);

        return next;
      });
    },
    [tableHeaders]
  );

  async function handleChooseFile(file: File) {
    const text = await file.text();
    await runFormatOnText(activeFormat, text, file.name);
  }

  async function handleExport() {
    if (busy) return;

    try {
      setBusy(true);
      setErrorBanner(null);

      // consumeExport() is void in your current codebase; treat it as "throws on failure"
      try {
        await consumeExport();
      } catch {
        setErrorBanner("Monthly export limit reached. Upgrade to export more.");
        return;
      }

      const csvOut = toCsv(headers.length ? headers : tableHeaders, rows);
      const blob = new Blob([csvOut], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = (fileName ?? "fixed.csv").replace(/\.csv$/i, "") + "_fixed.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 500);
      refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {errorBanner ? (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]">
          {errorBanner}
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">CSV Fixer</h1>
          <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Pick a format → upload → auto-fix safe issues → export.
          </p>

          {rows.length > 0 ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[var(--text)]">
                  Validation score: <span className="font-semibold">{validation.score}</span>/100
                </span>

                <span
                  className={
                    "rounded-full border px-3 py-1 font-semibold " +
                    (validation.readyForShopifyImport
                      ? "border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.12)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[color:rgba(var(--muted-rgb),1)]")
                  }
                >
                  {validation.readyForShopifyImport ? "Ready for Shopify import" : "Not ready yet"}
                </span>

                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[color:rgba(var(--muted-rgb),1)]">
                  {validation.errorCount} errors, {validation.warningCount} warnings, {validation.tipCount} tips ·{" "}
                  <span className="font-semibold">{validation.blockingCount}</span> blocking
                </span>

                {formatId === "shopify_products" ? (
                  <button
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={handleFixAllBlocking}
                    disabled={fixAllDisabled}
                    title={
                      fixAllDisabled
                        ? "No blocking issues are safely auto-fixable. Review the manual blockers in the Issues list."
                        : "Applies safe, deterministic fixes to blocking Shopify issues only."
                    }
                    style={fixAllDisabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    {fixAllLabel}
                  </button>
                ) : null}
              </div>

              {formatId === "shopify_products" ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{validation.bannerTitle}</div>
                      <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">{validation.bannerBody}</div>

                      {validation.topBlockers?.length ? (
                        <div className="mt-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                          <div className="font-semibold text-[var(--text)]">Top blockers</div>
                          <ul className="mt-1 list-disc pl-5">
                            {validation.topBlockers.map((x: any, i: number) => (
                              <li key={i}>
                                {x.label} ({x.count})
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a
                          href="#issues"
                          className="rounded-xl bg-[color:rgba(var(--accent-rgb),0.9)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                        >
                          Jump to issues
                        </a>
                        <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">
                          Fixable blockers: <span className="font-semibold">{validation.autoFixableBlockingErrors}</span>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      <div className="text-sm font-semibold text-[var(--text)]">Score drivers</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        {scoreNotes.cards.map((c: any) => (
                          <div key={c.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                            <div className="font-semibold text-[var(--text)]">
                              {c.title} {c.score}
                            </div>
                            <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">{c.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {lastFixAll ? (
                    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                      Fix All ran at {new Date(lastFixAll.at).toLocaleTimeString()} and applied{" "}
                      <span className="font-semibold">{lastFixAll.applied.length}</span> fix operations.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
          <div className="font-semibold">Monthly exports</div>
          <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">
            {used}/{isUnlimited ? "∞" : limit} used · {isUnlimited ? "Unlimited" : `${left} left`}
          </div>
          <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">Plan: {subStatus?.plan ?? "free"}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="text-sm font-semibold text-[var(--text)]">Format</div>

        <div className="mt-3 flex flex-wrap gap-2">
          {allFormats.map((f) => {
            const active = f.id === formatId;
            return (
              <button
                key={f.id}
                type="button"
                className={
                  "rounded-xl border px-3 py-2 text-sm font-semibold " +
                  (active
                    ? "border-[color:rgba(var(--accent-rgb),0.45)] bg-[color:rgba(var(--accent-rgb),0.12)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]")
                }
                onClick={() => {
                  setFormatId(f.id);
                  setLastFixAll(null);
                }}
              >
                {formatLabel(f)}
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          Built-in formats are available to everyone. Custom formats appear here when you save or import them.
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-lg font-semibold text-[var(--text)]">Upload CSV</div>
          <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            We&apos;ll auto-fix safe issues. Anything risky stays in the table for manual edits.
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[color:rgba(var(--accent-rgb),0.9)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleChooseFile(f);
                }}
              />
            </label>

            <button
              className="rounded-xl bg-[color:rgba(var(--accent-rgb),0.9)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
              onClick={handleExport}
              disabled={busy || rows.length === 0}
              type="button"
            >
              {busy ? "Working..." : "Export fixed CSV"}
            </button>
          </div>

          {autoFixes.length ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-medium text-[var(--text)]">Auto-fixes applied</div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                  onClick={() => {
                    const text = (autoFixes ?? []).join("\n");
                    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    const safe = (fileName ?? "csv").replace(/\.[^/.]+$/, "");
                    a.href = url;
                    a.download = `${safe}_autofix_changelog.txt`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 500);
                  }}
                >
                  Download changelog
                </button>
              </div>

              <ul className="mt-2 space-y-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                {autoFixPreview.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>

              {autoFixRestCount > 0 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[color:rgba(var(--muted-rgb),1)]">
                    …and {autoFixRestCount} more
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                    {autoFixRest.map((x, i) => (
                      <li key={i + autoFixPreviewCount}>{x}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>

        <div id="issues" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-lg font-semibold text-[var(--text)]">Issues</div>
          <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Click a cell in the table to edit it. Red and yellow highlight errors and warnings.
          </div>

          {rows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Upload a CSV to see issues.
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[var(--text)]">
                  Validation score: <span className="font-semibold">{validation.score}</span>/100
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-semibold text-[var(--text)]">
                  {validation.readyForShopifyImport ? "Ready for Shopify import" : "Not ready yet"}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[color:rgba(var(--muted-rgb),1)]">
                  {validation.errorCount} errors, {validation.warningCount} warnings, {validation.tipCount} tips
                </span>
              </div>

              <div className="mt-4">
                <EditableIssuesTable
                  headers={tableHeaders}
                  issues={issues as any}
                  rows={rows}
                  onUpdateRow={onUpdateRow}
                  resetKey={formatId}
                  formatId={formatId}
                  pinnedRows={pinnedRows}
                  onUnpinRow={(rowIndex) => setPinnedRows((prev) => prev.filter((x) => x !== rowIndex))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/presets" className="hover:underline">
          Preset formats
        </Link>
        <Link href="/pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </div>
  );
}
