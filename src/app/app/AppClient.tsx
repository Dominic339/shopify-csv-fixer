// src/app/app/AppClient.tsx
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
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import { computeValidationBreakdown } from "@/lib/validation/scoring";
import { fixAllShopifyBlocking } from "@/lib/validation/fixAllShopify";

// Phase helpers
import { computeReadinessSummary } from "@/lib/validation/readiness";
import { buildScoreNotes } from "@/lib/validation/scoreNotes";

// Phase 1: strict mode preference (Shopify)
import { getStrictMode, setStrictMode } from "@/lib/validation/strictMode";

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
  code?: string;
  suggestion?: string;
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeBaseName(name: string | null) {
  const base = (name ?? "csv").replace(/\.csv$/i, "").trim() || "csv";
  return base.replace(/[^\w\d._-]+/g, "_");
}

export default function AppClient() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [parseIssues, setParseIssues] = useState<UiIssue[]>([]);
  const [autoFixes, setAutoFixes] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const [quota, setQuota] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubStatus>({ ok: true, plan: "free" });
  const [planLimits, setPlanLimits] = useState<PlanLimits>({ exportsPerMonth: 3 });

  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [exportBaseName, setExportBaseName] = useState<string | null>(null);

  // inline edit state for the preview table
  const [editing, setEditing] = useState<{ rowIndex: number; col: string; value: string } | null>(null);

  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);

  // Initialize the selected format from the URL query param if present.
  // This prevents the "keep valid" fallback from snapping to the first format
  // before the preset can be applied.
  const [formatId, setFormatId] = useState<string>(() => {
    if (typeof window === "undefined") return "shopify_products";
    const preset = new URLSearchParams(window.location.search).get("preset");
    return preset?.trim() ? preset.trim() : "shopify_products";
  });

  const builtinFormats = useMemo<CsvFormat[]>(() => getAllFormats(), []);
  const [customFormats, setCustomFormats] = useState<CsvFormat[]>([]);

  // “Jump to issues”
  const issuesPanelRef = useRef<HTMLDivElement | null>(null);

  // show last “Fix All” audit snippet
  const [lastFixAll, setLastFixAll] = useState<null | { at: number; applied: string[] }>(null);

  // ✅ Pinned rows = the "Manual fixes" worklist
  const [pinnedRows, setPinnedRows] = useState<Set<number>>(() => new Set());

  // Phase 1: Shopify strict mode toggle (stored local)
  const [strictShopify, setStrictShopify] = useState<boolean>(() => getStrictMode());

  // Phase 1: Severity filter
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all");

  function refreshCustomFormats() {
    const user = loadUserFormatsFromStorage();
    const next = user.map(userFormatToCsvFormat);
    setCustomFormats(next);
  }

  const allFormats = useMemo<CsvFormat[]>(() => [...builtinFormats, ...customFormats], [builtinFormats, customFormats]);

  // Support selecting a preset via /app?preset=<formatId>
  // NOTE: read the query param *inside* this effect to avoid a first-mount race
  // between multiple useEffects.
  // (Built-ins always work; Custom Formats will work once they load for Advanced users.)
  const appliedPresetRef = useRef(false);

  useEffect(() => {
    if (appliedPresetRef.current) return;
    if (typeof window === "undefined") return;

    const preset = new URLSearchParams(window.location.search).get("preset");
    if (!preset) {
      appliedPresetRef.current = true;
      return;
    }

    const exists = allFormats.some((f) => f.id === preset);
    if (!exists) return; // wait until formats load

    setFormatId(preset);
    appliedPresetRef.current = true;
  }, [allFormats]);

  // support exportName via /app?exportName=<base>
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

    const preset = qp.get("preset");
    if (preset) setExportBaseName(preset);
    appliedExportNameRef.current = true;
  }, []);

  // Keep selected format valid (if a custom format is deleted, fall back)
  // IMPORTANT: depend on `formatId` and `allFormats` so this effect sees the
  // latest selected id (including a preset from the URL) and does not overwrite it.
  useEffect(() => {
    if (!allFormats.length) return;
    if (allFormats.some((f) => f.id === formatId)) return;
    setFormatId(allFormats[0]!.id);
  }, [allFormats, formatId]);

  const activeFormat = useMemo(() => allFormats.find((f) => f.id === formatId) ?? allFormats[0], [allFormats, formatId]);

  async function refreshQuotaAndPlan() {
    try {
      const [q, s] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status", { cache: "no-store" }).then((r) => r.json()),
      ]);

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

  const isAdvancedActive = useMemo(() => {
    const status = (subStatus?.status ?? "").toLowerCase();
    const plan = subStatus?.plan ?? "free";
    return plan === "advanced" && status === "active";
  }, [subStatus]);

  const canAccessCustomFormats = useMemo(() => {
    return ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvancedActive;
  }, [isAdvancedActive]);

  // Load (and live-refresh) Custom Formats only when the user can access them.
  useEffect(() => {
    if (!canAccessCustomFormats) {
      setCustomFormats([]);
      return;
    }

    refreshCustomFormats();
    const onChanged = () => refreshCustomFormats();
    window.addEventListener("csnest-formats-changed", onChanged);
    return () => window.removeEventListener("csnest-formats-changed", onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccessCustomFormats]);

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

  const issuesForDisplay = useMemo(() => {
    if (issueSeverityFilter === "all") return issuesForTable;
    return issuesForTable.filter((i) => i.severity === issueSeverityFilter);
  }, [issuesForTable, issueSeverityFilter]);

  const validation = useMemo(() => computeValidationBreakdown(issuesForTable, { formatId }), [issuesForTable, formatId]);
  const readiness = useMemo(() => computeReadinessSummary(issuesForTable, formatId), [issuesForTable, formatId]);
  const scoreNotes = useMemo(
    () => buildScoreNotes(validation as any, issuesForTable, formatId),
    [validation, issuesForTable, formatId]
  );

  // Shopify-only: "Import Confidence" is a user-facing label for overall readiness.
  const shopifyImportConfidence = useMemo(() => {
    if (formatId !== "shopify_products") return null;
    const s = Number((validation as any)?.score ?? 0);
    if (!Number.isFinite(s)) return 0;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [formatId, validation]);

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }, [headers, rows]);

  // Build cell highlight map from CURRENT issues (respect filter)
  const issueCellMap = useMemo(() => {
    const map = new Map<string, "error" | "warning" | "info">();
    for (const i of issuesForDisplay) {
      if (!i.column || i.column === "(file)") continue;

      const key = `${i.rowIndex}|||${i.column}`;
      const prev = map.get(key);
      if (prev === "error") continue;
      if (prev === "warning" && i.severity === "info") continue;
      map.set(key, i.severity);
    }
    return map;
  }, [issuesForDisplay]);

  const rowsWithAnyIssue = useMemo(() => {
    const set = new Set<number>();
    for (const i of issuesForDisplay) {
      if (i.rowIndex >= 0) set.add(i.rowIndex);
    }
    return [...set].sort((a, b) => a - b);
  }, [issuesForDisplay]);

  // ✅ Auto-pin any row that has issues (filtered)
  useEffect(() => {
    if (!rowsWithAnyIssue.length) return;
    setPinnedRows((prev) => {
      const next = new Set(prev);
      for (const idx of rowsWithAnyIssue) next.add(idx);
      return next;
    });
  }, [rowsWithAnyIssue.length, formatId]);

  const pinnedSorted = useMemo(() => {
    return [...pinnedRows].filter((i) => i >= 0 && i < rows.length).sort((a, b) => a - b);
  }, [pinnedRows, rows.length]);

  // Preview table: pinned rows first, then issue rows, then rest up to 25
  const previewRows = useMemo(() => {
    const out: number[] = [];
    const seen = new Set<number>();

    for (const idx of pinnedSorted) {
      if (!seen.has(idx)) {
        out.push(idx);
        seen.add(idx);
      }
    }
    for (const idx of rowsWithAnyIssue) {
      if (!seen.has(idx)) {
        out.push(idx);
        seen.add(idx);
      }
    }
    for (let idx = 0; idx < rows.length && out.length < 25; idx++) {
      if (!seen.has(idx)) {
        out.push(idx);
        seen.add(idx);
      }
    }
    return out.slice(0, 25);
  }, [pinnedSorted, rowsWithAnyIssue, rows.length]);

  const rowSeverity = useMemo(() => {
    const m = new Map<number, "error" | "warning" | "info">();
    for (const i of issuesForDisplay) {
      if (i.rowIndex < 0) continue;
      const prev = m.get(i.rowIndex);
      if (prev === "error") continue;
      if (prev === "warning" && i.severity === "info") continue;
      m.set(i.rowIndex, i.severity);
    }
    return m;
  }, [issuesForDisplay]);

  function pinRow(rowIndex: number) {
    setPinnedRows((prev) => {
      const next = new Set(prev);
      next.add(rowIndex);
      return next;
    });
  }

  function unpinRow(rowIndex: number) {
    setPinnedRows((prev) => {
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
  }

  // ✅ Revalidate issues WITHOUT applying fixes
  const revalidateTimerRef = useRef<number | null>(null);
  function revalidateIssuesOnly(nextHeaders: string[], nextRows: CsvRow[]) {
    if (!activeFormat) return;

    if (revalidateTimerRef.current) {
      window.clearTimeout(revalidateTimerRef.current);
      revalidateTimerRef.current = null;
    }

    revalidateTimerRef.current = window.setTimeout(() => {
      try {
        const res = applyFormatToParsedCsv(nextHeaders, nextRows, activeFormat);
        const mergedIssues = [...((res.issues as any) ?? []), ...(parseIssues ?? [])];
        setIssues(mergedIssues as any);
      } catch {
        // ignore
      }
    }, 220);
  }

  useEffect(() => {
    return () => {
      if (revalidateTimerRef.current) window.clearTimeout(revalidateTimerRef.current);
    };
  }, []);

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

        const hdrs = tableHeaders.length ? tableHeaders : Object.keys(next[0] ?? {});
        revalidateIssuesOnly(hdrs, next);

        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableHeaders, activeFormat, parseIssues]
  );

  function runFormatOnCurrentData(nextHeaders: string[], nextRows: CsvRow[], additionalFixes: string[] = []) {
    const res = applyFormatToParsedCsv(nextHeaders, nextRows, activeFormat);
    setHeaders(res.fixedHeaders ?? nextHeaders);
    setRows(res.fixedRows ?? nextRows);

    const mergedIssues = [...((res.issues as any) ?? []), ...(parseIssues ?? [])];
    setIssues(mergedIssues as any);

    setAutoFixes([...(additionalFixes ?? []), ...(res.fixesApplied ?? [])]);
  }

  const fixAllDryRun = useMemo(() => {
    if (formatId !== "shopify_products") return null;
    if (!rows.length) return null;
    return fixAllShopifyBlocking(tableHeaders, rows, issuesForTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, tableHeaders.join("||"), rows, issuesForTable]);

  const realFixableBlockingCount = fixAllDryRun?.fixesApplied?.length ?? 0;

  function handleFixAllBlocking() {
    if (formatId !== "shopify_products") return;

    const fixed = fixAllDryRun ?? fixAllShopifyBlocking(tableHeaders, rows, issuesForTable);

    if (!fixed.fixesApplied.length) {
      setErrorBanner(
        `Fix All ran, but 0 fixes were safely applied. Remaining blockers require manual edits (e.g., Missing Title, Published like "maybe", Price like "free").`
      );
      return;
    }

    setErrorBanner(null);
    setLastFixAll({ at: Date.now(), applied: fixed.fixesApplied });
    runFormatOnCurrentData(fixed.fixedHeaders, fixed.fixedRows, fixed.fixesApplied);
  }

  async function runFormatOnText(format: CsvFormat, csvText: string, name?: string) {
    setBusy(true);
    setErrorBanner(null);

    try {
      const parsed = parseCsv(csvText);
      const res = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);

      const nextParseIssues: UiIssue[] = (parsed.parseErrors ?? []).map((m) => ({
        message: m,
        level: "error",
        severity: "error",
      }));

      setParseIssues(nextParseIssues);

      setHeaders(res.fixedHeaders ?? []);
      setRows(res.fixedRows ?? []);

      setIssues([...(res.issues ?? []), ...nextParseIssues] as any);

      setAutoFixes(res.fixesApplied ?? []);
      if (typeof name === "string") setFileName(name);

      setLastFixAll(null);
      setPinnedRows(new Set());

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

      setIssues([]);
      setParseIssues([]);
      setAutoFixes([]);
      setEditing(null);
      setLastFixAll(null);
      setPinnedRows(new Set());

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

  // Re-run when format changes
  useEffect(() => {
    setIssues([]);
    setParseIssues([]);
    setAutoFixes([]);
    setEditing(null);
    setLastFixAll(null);
    setPinnedRows(new Set());

    if (!lastUploadedText || !activeFormat) return;
    void runFormatOnText(activeFormat, lastUploadedText, fileName ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId]);

  // Persist + re-run when strict mode toggles (Shopify only)
  useEffect(() => {
    setStrictMode(Boolean(strictShopify));

    if (formatId !== "shopify_products") return;
    if (!lastUploadedText || !activeFormat) return;

    void runFormatOnText(activeFormat, lastUploadedText, fileName ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictShopify]);

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

      const base = (exportBaseName ?? fileName ?? "fixed").replace(/\.csv$/i, "").trim() || "fixed";
      a.download = `${base}_fixed.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Export failed");
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
    pinRow(rowIndex);
  }

  function commitEdit() {
    if (!editing) return;
    onUpdateRow(editing.rowIndex, { [editing.col]: editing.value });
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  const used = Number(quota?.used ?? 0);
  const limit = isUnlimited ? null : Number(planLimits?.exportsPerMonth ?? quota?.limit ?? 3);
  const left = isUnlimited ? null : Math.max(0, Number(quota?.remaining ?? (Number(limit ?? 0) - used)));

  const fixAllVisible = formatId === "shopify_products" && rows.length > 0 && realFixableBlockingCount > 0;
  const fixAllLabel = `Fix ${realFixableBlockingCount} auto-fixable blockers`;

  const fixLogBase = safeBaseName(exportBaseName ?? fileName ?? "csv");

  return (
    <div className="mx-auto max-w-7xl px-8 py-12">
      {errorBanner ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-[var(--text)] text-base">
          {errorBanner}
        </div>
      ) : null}

      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">CSV Fixer</h1>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Pick a format → upload → auto-fix safe issues → export.
          </p>

          {rows.length > 0 ? (
            <div className="mt-4 space-y-3 text-base">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-[var(--text)]">
                  Validation score: <span className="font-semibold">{validation.score}</span>/100
                </span>

                {shopifyImportConfidence != null ? (
                  <span
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-[var(--text)]"
                    title="A quick readiness indicator based on your current Shopify issues. Aim for 90%+ for a clean import."
                  >
                    Shopify import confidence: <span className="font-semibold">{shopifyImportConfidence}%</span>
                  </span>
                ) : null}

                <span
                  className={
                    "rounded-full border px-4 py-1.5 font-semibold " +
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

                {fixAllVisible ? (
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={handleFixAllBlocking}
                    disabled={busy}
                    title="Applies safe, deterministic fixes to Shopify blockers."
                    style={busy ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    {fixAllLabel}
                  </button>
                ) : null}

                {formatId === "shopify_products" ? (
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => {
                      setStrictShopify((v) => !v);
                    }}
                    disabled={busy}
                    title="Strict mode adds extra Shopify checks."
                  >
                    {strictShopify ? "Strict mode: ON" : "Strict mode: OFF"}
                  </button>
                ) : null}
              </div>

              {formatId === "shopify_products" ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-[320px]">
                      <div className="text-base font-semibold text-[var(--text)]">
                        {validation.readyForShopifyImport ? "🟢 Ready for Shopify Import" : "Not ready for Shopify Import"}
                      </div>
                      <div className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                        {validation.readyForShopifyImport
                          ? "No blocking issues detected. Exporting should import cleanly."
                          : "Blocking issues are preventing a clean import. Fix blockers to safely import."}
                      </div>

                      {!validation.readyForShopifyImport ? (
                        <div className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
                          <div className="font-semibold text-[var(--text)]">Top blockers</div>
                          <ul className="mt-2 list-disc pl-6">
                            {readiness.blockingGroups.slice(0, 3).map((g) => (
                              <li key={g.code}>
                                <span className="font-semibold text-[var(--text)]">{g.title}</span>{" "}
                                <span className="text-[color:rgba(var(--muted-rgb),1)]">({g.count})</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className="rg-btn"
                              onClick={() => issuesPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            >
                              Jump to issues
                            </button>

                            <span className="text-sm text-[color:rgba(var(--muted-rgb),1)]">
                              Auto-fixable blockers:{" "}
                              <span className="font-semibold text-[var(--text)]">{realFixableBlockingCount}</span>
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {lastFixAll ? (
                        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                          <div className="text-base font-semibold text-[var(--text)]">Last Fix All</div>
                          <ul className="mt-3 list-disc pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
                            {lastFixAll.applied.slice(0, 5).map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                            {lastFixAll.applied.length > 5 ? <li>…and {lastFixAll.applied.length - 5} more</li> : null}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-[300px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">Score drivers</div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        {scoreNotes.map((n) => (
                          <div
                            key={n.key}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                            title={n.note}
                          >
                            <div className="font-semibold text-[var(--text)]">
                              {n.label} <span className="text-[color:rgba(var(--muted-rgb),1)]">{n.score}</span>
                            </div>
                            <div className="mt-2 text-[color:rgba(var(--muted-rgb),1)]">{n.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {autoFixes.length > 0 ? (
                    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-base font-semibold text-[var(--text)]">
                          Auto fixes applied{" "}
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">({autoFixes.length})</span>
                        </div>

                        <button
                          type="button"
                          className="pill-btn"
                          onClick={() => {
                            const header = `Auto fix log\nFile: ${fileName ?? "unknown"}\nFormat: ${formatId}\nApplied: ${autoFixes.length}\n\n`;
                            const body = autoFixes.map((x, idx) => `${idx + 1}. ${x}`).join("\n");
                            downloadText(`${fixLogBase}_fix_log.txt`, header + body + "\n");
                          }}
                        >
                          Download fix log
                        </button>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-base text-[color:rgba(var(--muted-rgb),1)]">
                          View auto fixes
                        </summary>
                        <ul className="mt-3 list-disc pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
                          {autoFixes.slice(0, 50).map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                          {autoFixes.length > 50 ? (
                            <li>…and {autoFixes.length - 50} more (download the log for the full list)</li>
                          ) : null}
                        </ul>
                      </details>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-base text-[var(--text)]">
          <div className="font-medium">Monthly exports</div>
          {isUnlimited ? <div>Unlimited</div> : <div>{used}/{limit} used • {left} left</div>}
          <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Plan: {subStatus?.plan ?? "free"} ({subStatus?.status ?? "unknown"})
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <div className="text-base font-semibold text-[var(--text)]">Format</div>
        <div className="mt-4 flex flex-wrap gap-2">
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

        <div className="mt-4 text-sm text-[var(--muted)]">
          Built-in formats are available to everyone.{" "}
          {canAccessCustomFormats ? (
            <>Custom formats appear here when you save or import them.</>
          ) : (
            <>
              Custom formats are Advanced only. <Link className="underline" href="/checkout">Upgrade to Advanced</Link> to
              create and use saved formats.
            </>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Upload CSV</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
            We’ll auto-fix safe issues. Anything risky stays in the table for manual edits.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
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

          {rows.length > 0 && autoFixes.length === 0 ? (
            <div className="mt-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">No auto fixes were applied for this upload.</div>
          ) : null}
        </div>

        <div ref={issuesPanelRef} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Issues</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
            Click a cell in the table to edit it. Red and yellow highlight errors and warnings.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[color:rgba(var(--muted-rgb),1)]">Issue filter</span>
            {(["all", "error", "warning", "info"] as const).map((k) => {
              const active = issueSeverityFilter === k;
              return (
                <button
                  key={k}
                  type="button"
                  className={`pill-btn ${active ? "is-active" : ""}`}
                  onClick={() => setIssueSeverityFilter(k)}
                >
                  {k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}
                </button>
              );
            })}
            <span className="ml-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Showing {issuesForDisplay.length} of {issuesForTable.length}
            </span>
          </div>

          <div className="mt-5 data-table-wrap">
            <div className="data-table-scroll">
              {rows.length === 0 ? (
                <div className="p-7 text-base text-[var(--muted)]">No table yet. Upload a CSV to see it here.</div>
              ) : (
                <table className="data-table text-sm">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Row</th>
                      <th style={{ width: 110 }}></th>
                      {tableHeaders.slice(0, 10).map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((rowIndex) => {
                      const row = rows[rowIndex] ?? {};
                      const isPinned = pinnedRows.has(rowIndex);
                      const sev = rowSeverity.get(rowIndex);

                      const actionCell =
                        sev === "error" || sev === "warning" ? (
                          <span
                            className={
                              "rounded-full border px-2 py-0.5 text-xs font-semibold " +
                              (sev === "error"
                                ? "border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.10)]"
                                : "border-[color:rgba(255,200,0,0.35)] bg-[color:rgba(255,200,0,0.10)]")
                            }
                          >
                            {sev === "error" ? "Error" : "Warning"}
                          </span>
                        ) : isPinned ? (
                          <button
                            type="button"
                            className="pill-btn"
                            onClick={() => unpinRow(rowIndex)}
                            title="Remove from Manual fixes"
                          >
                            Unpin
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pill-btn"
                            onClick={() => pinRow(rowIndex)}
                            title="Add to Manual fixes"
                          >
                            Pin
                          </button>
                        );

                      return (
                        <tr key={rowIndex}>
                          <td className="text-[var(--muted)]">{rowIndex + 1}</td>
                          <td>{actionCell}</td>

                          {tableHeaders.slice(0, 10).map((h) => {
                            const cellSev = issueCellMap.get(`${rowIndex}|||${h}`);
                            const isEditing = editing?.rowIndex === rowIndex && editing?.col === h;

                            const cellClass =
                              (cellSev === "error" ? "cell-error" : cellSev === "warning" ? "cell-warning" : "") +
                              (isEditing ? " cell-editing" : "");

                            return (
                              <td
                                key={`${rowIndex}-${h}`}
                                className={cellClass}
                                onClick={() => startEdit(rowIndex, h)}
                                style={{ cursor: "pointer" }}
                                title={cellSev ? `${cellSev}` : "Click to edit"}
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm outline-none"
                                    value={editing.value}
                                    onChange={(e) =>
                                      setEditing((prev) => (prev ? { ...prev, value: e.target.value } : prev))
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
              <div className="border-t border-[var(--border)] px-5 py-4 text-sm text-[var(--muted)]">
                Showing first 10 columns and up to 25 rows for speed. “Pin” adds a row to Manual fixes. Rows stay there until
                unpinned.
              </div>
            ) : null}
          </div>

          <div className="mt-7">
            <EditableIssuesTable
              headers={tableHeaders}
              issues={issuesForDisplay as any}
              rows={rows}
              onUpdateRow={onUpdateRow}
              resetKey={formatId}
              formatId={formatId}
              pinnedRows={pinnedSorted}
              onUnpinRow={unpinRow}
              cellSeverityMap={issueCellMap}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">
          Preset Formats
        </Link>

        <Link href="/#pricing" className="hover:underline">
          Pricing
        </Link>
      </div>
    </div>
  );
}
