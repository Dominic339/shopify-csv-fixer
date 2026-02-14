"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseCsv, toCsv } from "@/lib/csv";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import type { CsvFormat, CsvIssue } from "@/lib/formats/types";
import { loadUserFormatsFromStorage, userFormatToCsvFormat } from "@/lib/formats/customUser";
import { computeValidationBreakdown } from "@/lib/validation/scoring";
import { fixAllShopifyBlocking } from "@/lib/validation/fixAllShopify";

// NEW Phase 1 helpers
import { computeReadinessSummary } from "@/lib/validation/readiness";
import { buildScoreNotes } from "@/lib/validation/scoreNotes";

type SubStatus = {
  ok: boolean;
  plan?: "free" | "basic" | "advanced";
  status?: string;
  signedIn?: boolean;
};

type PlanLimits = {
  exportsPerMonth: number;
  unlimited?: boolean;
};

type CsvRow = Record<string, string>;

type UiIssue = {
  row?: number; // 1-based (legacy)
  rowIndex?: number; // 0-based (new)
  column?: string;
  field?: string;
  message: string;
  level?: "error" | "warning" | "info";
  severity?: "error" | "warning" | "info";

  // Structured metadata (optional)
  code?: string;
  suggestion?: string;
};

// CsvIssue type now comes from src/lib/formats/types.ts

export default function AppClient() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [autoFixes, setAutoFixes] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const [quota, setQuota] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubStatus>({ ok: true, plan: "free" });
  const [planLimits, setPlanLimits] = useState<PlanLimits>({ exportsPerMonth: 3 });

  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // NEW: optional export base name (from query param exportName)
  // Example: /app?exportName=shopify-products -> shopify-products_fixed.csv
  const [exportBaseName, setExportBaseName] = useState<string | null>(null);

  // inline edit state for the preview table
  const [editing, setEditing] = useState<{ rowIndex: number; col: string; value: string } | null>(
    null
  );

  // store last uploaded CSV text so switching formats can re-run on same file
  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);

  // Selected format
  const [formatId, setFormatId] = useState<string>("general_csv");

  // Built-in formats are stable
  const builtinFormats = useMemo<CsvFormat[]>(() => getAllFormats(), []);

  // Custom formats can change during the session (import/save/delete)
  const [customFormats, setCustomFormats] = useState<CsvFormat[]>([]);

  // Phase 1: “Jump to issues”
  const issuesPanelRef = useRef<HTMLDivElement | null>(null);

  // Phase 1: show last “Fix All” audit snippet
  const [lastFixAll, setLastFixAll] = useState<null | { at: number; applied: string[] }>(null);

  function refreshCustomFormats() {
    const user = loadUserFormatsFromStorage();
    const next = user.map(userFormatToCsvFormat);
    setCustomFormats(next);
  }

  useEffect(() => {
    refreshCustomFormats();

    // Listen for storage updates triggered by saveUserFormatsToStorage()
    const onChanged = () => refreshCustomFormats();
    window.addEventListener("csnest-formats-changed", onChanged);

    return () => {
      window.removeEventListener("csnest-formats-changed", onChanged);
    };
  }, []);

  const allFormats = useMemo<CsvFormat[]>(() => {
    return [...builtinFormats, ...customFormats];
  }, [builtinFormats, customFormats]);

  // Support selecting a preset via /app?preset=<formatId>
  const appliedPresetRef = useRef(false);

  useEffect(() => {
    if (appliedPresetRef.current) return;
    if (typeof window === "undefined") return;

    const preset = new URLSearchParams(window.location.search).get("preset");
    if (!preset) {
      appliedPresetRef.current = true;
      return;
    }

    // Only allow presets that exist in built-in formats (safe + predictable)
    const exists = builtinFormats.some((f) => f.id === preset);
    if (!exists) {
      appliedPresetRef.current = true;
      return;
    }

    setFormatId(preset);
    appliedPresetRef.current = true;
  }, [builtinFormats]);

  // NEW: support exportName via /app?exportName=<base>
  const appliedExportNameRef = useRef(false);
  useEffect(() => {
    if (appliedExportNameRef.current) return;
    if (typeof window === "undefined") return;

    const qp = new URLSearchParams(window.location.search);
    const exportName = qp.get("exportName");
    if (exportName) {
      setExportBaseName(exportName);
      appliedExportNameRef.current = true;
      return;
    }

    // If not provided, but preset is provided, we can default export name to preset
    const preset = qp.get("preset");
    if (preset) {
      setExportBaseName(preset);
    }

    appliedExportNameRef.current = true;
  }, []);

  // Keep selected format valid (if a custom format is deleted, fall back)
  useEffect(() => {
    if (allFormats.some((f) => f.id === formatId)) return;
    setFormatId(allFormats[0]?.id ?? "general_csv");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFormats.length]);

  const activeFormat = useMemo(() => {
    return allFormats.find((f) => f.id === formatId) ?? allFormats[0];
  }, [allFormats, formatId]);

  async function refreshQuotaAndPlan() {
    try {
      const [q, s] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status", { cache: "no-store" }).then((r) => r.json()),
      ]);

      // Your quota helper expects a plan argument for getPlanLimits(plan)
      const plan = ((s?.plan ?? q?.plan ?? "free") as "free" | "basic" | "advanced") ?? "free";
      const limits = getPlanLimits(plan) as PlanLimits;

      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to refresh quota/plan");
    }
  }

  useEffect(() => {
    void refreshQuotaAndPlan();
  }, []);

  const isUnlimited = useMemo(() => {
    const status = (subStatus?.status ?? "").toLowerCase();
    const plan = subStatus?.plan ?? "free";
    if (plan === "advanced" && status === "active") return true;
    if (quota?.unlimited) return true;
    if (planLimits?.unlimited) return true;
    return false;
  }, [subStatus, quota, planLimits]);

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

  // Weighted validation scoring + category breakdown
  const validation = useMemo(() => {
    return computeValidationBreakdown(issuesForTable, { formatId });
  }, [issuesForTable, formatId]);

  // Phase 1: readiness and score notes (Shopify UI polish)
  const readiness = useMemo(() => {
    return computeReadinessSummary(issuesForTable, formatId);
  }, [issuesForTable, formatId]);

  const scoreNotes = useMemo(() => {
    return buildScoreNotes(validation as any, issuesForTable, formatId);
  }, [validation, issuesForTable, formatId]);

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }, [headers, rows]);

  const issueCellMap = useMemo(() => {
    const map = new Map<string, "error" | "warning" | "info">();
    for (const i of issuesForTable) {
      const key = `${i.rowIndex}|||${i.column}`;
      const prev = map.get(key);
      if (prev === "error") continue;
      if (prev === "warning" && i.severity === "info") continue;
      map.set(key, i.severity);
    }
    return map;
  }, [issuesForTable]);

  const rowsWithAnyIssue = useMemo(() => {
    const set = new Set<number>();
    for (const i of issuesForTable) {
      if (i.rowIndex >= 0) set.add(i.rowIndex);
    }
    return [...set].sort((a, b) => a - b);
  }, [issuesForTable]);

  const previewRows = useMemo(() => {
    if (rowsWithAnyIssue.length) return rowsWithAnyIssue.slice(0, 25);
    return rows.map((_, idx) => idx).slice(0, 25);
  }, [rows, rowsWithAnyIssue]);

  const onUpdateRow = useCallback((rowIndex: number, patch: Partial<CsvRow>) => {
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
      return next;
    });
  }, []);

  function runFormatOnCurrentData(nextHeaders: string[], nextRows: CsvRow[], additionalFixes: string[] = []) {
    const res = applyFormatToParsedCsv(nextHeaders, nextRows, activeFormat);
    setHeaders(res.fixedHeaders ?? nextHeaders);
    setRows(res.fixedRows ?? nextRows);
    setIssues((res.issues as any) ?? []);
    setAutoFixes([...(additionalFixes ?? []), ...(res.fixesApplied ?? [])]);
  }

  function handleFixAllBlocking() {
    // Currently Shopify-only, but the plumbing is reusable for other presets.
    if (formatId !== "shopify_products") return;

    const fixed = fixAllShopifyBlocking(tableHeaders, rows, issuesForTable);
    if (!fixed.fixesApplied.length) return;

    setLastFixAll({ at: Date.now(), applied: fixed.fixesApplied });

    runFormatOnCurrentData(fixed.fixedHeaders, fixed.fixedRows, fixed.fixesApplied);
  }

  async function runFormatOnText(format: CsvFormat, csvText: string, name?: string) {
    setBusy(true);
    setErrorBanner(null);

    try {
      const parsed = parseCsv(csvText);

      // Apply selected format (engine includes universal cleanup now)
      const res = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);

      const parseIssues: UiIssue[] = (parsed.parseErrors ?? []).map((m) => ({
        message: m,
        level: "error",
        severity: "error",
      }));

      setHeaders(res.fixedHeaders ?? []);
      setRows(res.fixedRows ?? []);
      setIssues([...(res.issues ?? []), ...parseIssues]);
      setAutoFixes(res.fixesApplied ?? []);
      if (typeof name === "string") setFileName(name);

      setLastFixAll(null);

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to process CSV");
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    setErrorBanner(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setLastUploadedText(text);

      // Clear previous run immediately for a clean swap-in
      setIssues([]);
      setAutoFixes([]);
      setEditing(null);
      setLastFixAll(null);

      if (activeFormat) {
        await runFormatOnText(activeFormat, text, file.name);
      }
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to process CSV");
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  // When switching formats, clear pins + clear issues/autofixes, then re-run if a file is loaded
  useEffect(() => {
    setIssues([]);
    setAutoFixes([]);
    setEditing(null);
    setLastFixAll(null);

    if (!lastUploadedText || !activeFormat) return;

    void runFormatOnText(activeFormat, lastUploadedText, fileName ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId]);

  async function exportFixedCsv() {
    setBusy(true);
    setErrorBanner(null);
    try {
      await consumeExport();

      const cols = tableHeaders.length ? tableHeaders : Object.keys(rows[0] ?? {});
      const csv = toCsv(cols, rows);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // NEW: named export base overrides fileName
      const base =
        (exportBaseName ?? fileName ?? "fixed")
          .replace(/\.csv$/i, "")
          .trim() || "fixed";

      a.download = `${base}_fixed.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Export failed");
      // If the export failed due to quota, refresh so the UI matches the real usage.
      try {
        await refreshQuotaAndPlan();
      } catch {
        // ignore
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit(rowIndex: number, col: string) {
    const current = rows[rowIndex]?.[col] ?? "";
    setEditing({ rowIndex, col, value: current });
  }

  function commitEdit() {
    if (!editing) return;
    onUpdateRow(editing.rowIndex, { [editing.col]: editing.value });
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  const autoFixPreviewCount = 8;
  const autoFixPreview = autoFixes.slice(0, autoFixPreviewCount);
  const autoFixRest = autoFixes.slice(autoFixPreviewCount);
  const autoFixRestCount = Math.max(0, autoFixRest.length);

  const used = Number(quota?.used ?? 0);
  const limit = isUnlimited ? null : Number(planLimits?.exportsPerMonth ?? quota?.limit ?? 3);
  // Prefer server-provided remaining when available (and clamp at 0)
  const left = isUnlimited ? null : Math.max(0, Number(quota?.remaining ?? (Number(limit ?? 0) - used)));

  // Phase 1: smart Fix All label + disable when no safe blockers
  const fixAllLabel =
    readiness.autoFixableBlockingErrors > 0
      ? `Fix ${readiness.autoFixableBlockingErrors} auto-fixable blockers`
      : "Fix all blocking issues";

  const fixAllDisabled =
    formatId !== "shopify_products" || readiness.autoFixableBlockingErrors === 0 || busy || rows.length === 0;

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

          {/* score + badge (only show when rows exist) */}
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
                  {validation.label}
                </span>

                <span className="text-[color:rgba(var(--muted-rgb),1)]">
                  {validation.counts.errors} errors, {validation.counts.warnings} warnings
                  {validation.counts.blockingErrors ? ` • ${validation.counts.blockingErrors} blocking` : ""}
                </span>

                {formatId === "shopify_products" && validation.counts.blockingErrors > 0 ? (
                  <button
                    type="button"
                    className="pill-btn"
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

              {/* Phase 1: Shopify readiness summary */}
              {formatId === "shopify_products" ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-[260px]">
                      <div className="text-sm font-semibold text-[var(--text)]">
                        {validation.readyForShopifyImport ? "🟢 Ready for Shopify Import" : "Not ready for Shopify Import"}
                      </div>
                      <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                        {validation.readyForShopifyImport
                          ? "No blocking issues detected. Exporting should import cleanly."
                          : "Blocking issues are preventing a clean import. Fix blockers to safely import."}
                      </div>

                      {!validation.readyForShopifyImport ? (
                        <div className="mt-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                          <div className="font-semibold text-[var(--text)]">Top blockers</div>
                          <ul className="mt-1 list-disc pl-5">
                            {readiness.blockingGroups.slice(0, 3).map((g) => (
                              <li key={g.code}>
                                <span className="font-semibold text-[var(--text)]">{g.title}</span>{" "}
                                <span className="text-[color:rgba(var(--muted-rgb),1)]">({g.count})</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="rg-btn"
                              onClick={() =>
                                issuesPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                              }
                            >
                              Jump to issues
                            </button>

                            <span className="text-xs text-[color:rgba(var(--muted-rgb),1)]">
                              Fixable blockers:{" "}
                              <span className="font-semibold text-[var(--text)]">{readiness.autoFixableBlockingErrors}</span>
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {lastFixAll ? (
                        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                          <div className="text-sm font-semibold text-[var(--text)]">Last Fix All</div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                            {lastFixAll.applied.slice(0, 5).map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                            {lastFixAll.applied.length > 5 ? (
                              <li>…and {lastFixAll.applied.length - 5} more</li>
                            ) : null}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-[240px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                      <div className="text-xs text-[color:rgba(var(--muted-rgb),1)]">Score drivers</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {scoreNotes.map((n) => (
                          <div
                            key={n.key}
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
                            title={n.note}
                          >
                            <div className="font-semibold text-[var(--text)]">
                              {n.label}{" "}
                              <span className="text-[color:rgba(var(--muted-rgb),1)]">{n.score}</span>
                            </div>
                            <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">{n.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">
                  Structure {validation.categories.structure}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">
                  Variants {validation.categories.variant}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">
                  Pricing {validation.categories.pricing}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">
                  Inventory {validation.categories.inventory}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5">
                  SEO {validation.categories.seo}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
          <div className="font-medium">Monthly exports</div>
          {isUnlimited ? (
            <div>Unlimited</div>
          ) : (
            <div>
              {used}/{limit} used • {left} left
            </div>
          )}
          <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
            Plan: {subStatus?.plan ?? "free"} ({subStatus?.status ?? "unknown"})
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="text-sm font-semibold text-[var(--text)]">Format</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {allFormats.map((f) => {
            const active = f.id === formatId;
            return (
              <button
                key={f.id}
                type="button"
                className={`pill-btn ${active ? "is-active" : ""}`}
                onClick={() => setFormatId(f.id)}
              >
                {f.name}
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-[var(--muted)]">
          Built-in formats are available to everyone. Custom formats appear here when you save or
          import them.
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Upload CSV</h2>
          <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            We’ll auto-fix safe issues. Anything risky stays in the table for manual edits.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="rg-btn cursor-pointer">
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>

            <button
              className="rg-btn"
              onClick={() => void exportFixedCsv()}
              disabled={busy || rows.length === 0}
              title={rows.length === 0 ? "Upload a CSV first" : "Export your fixed CSV"}
              type="button"
            >
              {busy ? "Working..." : "Export fixed CSV"}
            </button>
          </div>

          {autoFixes.length ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-medium text-[var(--text)]">Auto-fixes applied</div>

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

        <div ref={issuesPanelRef} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Issues</h2>
          <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Click a cell in the table to edit it. Red and yellow highlight errors and warnings.
          </p>

          {/* show the badge here too when rows exist */}
          {rows.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
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
                {validation.label}
              </span>

              <span className="text-[color:rgba(var(--muted-rgb),1)]">
                {validation.counts.errors} errors, {validation.counts.warnings} warnings, {validation.counts.infos} tips
              </span>
            </div>
          ) : null}

          <div className="mt-4 data-table-wrap">
            <div className="data-table-scroll">
              {rows.length === 0 ? (
                <div className="p-6 text-sm text-[var(--muted)]">
                  No table yet. Upload a CSV to see it here.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Row</th>
                      {tableHeaders.slice(0, 12).map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((rowIndex) => {
                      const row = rows[rowIndex] ?? {};
                      return (
                        <tr key={rowIndex}>
                          <td className="text-[var(--muted)]">{rowIndex + 1}</td>
                          {tableHeaders.slice(0, 12).map((h) => {
                            const sev = issueCellMap.get(`${rowIndex}|||${h}`);
                            const isEditing = editing?.rowIndex === rowIndex && editing?.col === h;

                            const cellClass =
                              (sev === "error"
                                ? "cell-error"
                                : sev === "warning"
                                  ? "cell-warning"
                                  : "") + (isEditing ? " cell-editing" : "");

                            return (
                              <td
                                key={`${rowIndex}-${h}`}
                                className={cellClass}
                                onClick={() => startEdit(rowIndex, h)}
                                style={{ cursor: "pointer" }}
                                title={sev ? `${sev}` : "Click to edit"}
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none"
                                    value={editing.value}
                                    onChange={(e) =>
                                      setEditing((prev) =>
                                        prev ? { ...prev, value: e.target.value } : prev
                                      )
                                    }
                                    onBlur={commitEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                  />
                                ) : (
                                  <span>{row[h] ?? ""}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {rows.length > 0 ? (
              <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
                Showing first 12 columns and up to 25 rows for speed. Use “Manual fixes” for full
                row editing.
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <EditableIssuesTable
              headers={tableHeaders}
              issues={issues as any}
              rows={rows}
              onUpdateRow={onUpdateRow}
              resetKey={formatId}
              formatId={formatId}
            />
          </div>
        </div>
      </div>

      {/* Small footer links (keeps internal linking clean) */}
      <div className="mt-10 flex flex-wrap gap-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/formats/presets" className="hover:underline">
          Preset Formats
        </Link>
        <Link href="/pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </div>
  );
}
