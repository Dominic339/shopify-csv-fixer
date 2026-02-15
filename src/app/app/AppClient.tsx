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
import { computeValidationBreakdown } from "@/lib/validation/scoring";
import { fixAllShopifyBlocking } from "@/lib/validation/fixAllShopify";

// Phase helpers
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
  code?: string;
  suggestion?: string;
};

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

  const [editing, setEditing] = useState<{ rowIndex: number; col: string; value: string } | null>(null);

  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);

  const [formatId, setFormatId] = useState<string>("general_csv");

  const builtinFormats = useMemo<CsvFormat[]>(() => getAllFormats(), []);
  const [customFormats, setCustomFormats] = useState<CsvFormat[]>([]);

  const issuesPanelRef = useRef<HTMLDivElement | null>(null);

  const [lastFixAll, setLastFixAll] = useState<null | { at: number; applied: string[] }>(null);

  // ✅ Pinned rows = Manual fixes worklist
  const [pinnedRows, setPinnedRows] = useState<Set<number>>(() => new Set());

  function refreshCustomFormats() {
    const user = loadUserFormatsFromStorage();
    const next = user.map(userFormatToCsvFormat);
    setCustomFormats(next);
  }

  useEffect(() => {
    refreshCustomFormats();
    const onChanged = () => refreshCustomFormats();
    window.addEventListener("csnest-formats-changed", onChanged);
    return () => window.removeEventListener("csnest-formats-changed", onChanged);
  }, []);

  const allFormats = useMemo<CsvFormat[]>(() => [...builtinFormats, ...customFormats], [builtinFormats, customFormats]);

  const appliedPresetRef = useRef(false);
  useEffect(() => {
    if (appliedPresetRef.current) return;
    if (typeof window === "undefined") return;

    const preset = new URLSearchParams(window.location.search).get("preset");
    if (!preset) {
      appliedPresetRef.current = true;
      return;
    }

    const exists = builtinFormats.some((f) => f.id === preset);
    if (!exists) {
      appliedPresetRef.current = true;
      return;
    }

    setFormatId(preset);
    appliedPresetRef.current = true;
  }, [builtinFormats]);

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

  useEffect(() => {
    if (allFormats.some((f) => f.id === formatId)) return;
    setFormatId(allFormats[0]?.id ?? "general_csv");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFormats.length]);

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

  const validation = useMemo(() => computeValidationBreakdown(issuesForTable, { formatId }), [issuesForTable, formatId]);
  const readiness = useMemo(() => computeReadinessSummary(issuesForTable, formatId), [issuesForTable, formatId]);
  const scoreNotes = useMemo(() => buildScoreNotes(validation as any, issuesForTable, formatId), [validation, issuesForTable, formatId]);

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }, [headers, rows]);

  // ✅ CELL-LEVEL severity map for highlighting (used by preview + Manual fixes inputs)
  const cellSeverityMap = useMemo(() => {
    const map = new Map<string, "error" | "warning" | "info">();

    for (const i of issuesForTable) {
      if (i.rowIndex == null || i.rowIndex < 0) continue;
      const col = (i.column ?? "").toString().trim();
      if (!col || col === "(file)") continue;

      const key = `${i.rowIndex}|||${col}`;
      const prev = map.get(key);

      // keep highest severity
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

  // ✅ Auto-pin rows with issues (Manual fixes worklist)
  useEffect(() => {
    if (!rowsWithAnyIssue.length) return;
    setPinnedRows((prev) => {
      const next = new Set(prev);
      for (const idx of rowsWithAnyIssue) next.add(idx);
      return next;
    });
  }, [rowsWithAnyIssue.join("|")]);

  const pinnedSorted = useMemo(() => {
    return [...pinnedRows].filter((i) => i >= 0 && i < rows.length).sort((a, b) => a - b);
  }, [pinnedRows, rows.length]);

  // Preview table ordering: pinned rows first, then issue rows, then rest
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
    for (const i of issuesForTable) {
      if (i.rowIndex < 0) continue;
      const prev = m.get(i.rowIndex);
      if (prev === "error") continue;
      if (prev === "warning" && i.severity === "info") continue;
      m.set(i.rowIndex, i.severity);
    }
    return m;
  }, [issuesForTable]);

  const rowHasErrorOrWarning = useCallback(
    (rowIndex: number) => {
      const s = rowSeverity.get(rowIndex);
      return s === "error" || s === "warning";
    },
    [rowSeverity]
  );

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

  // ✅ Revalidate issues only (no auto-fix during typing)
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
      try {
        await refreshQuotaAndPlan();
      } catch {
        // ignore
      }
    } finally {
      setBusy(false);
    }
  }

  function downloadAutoFixLog() {
    const fixList = Array.from(new Set([...(autoFixes ?? []), ...(lastFixAll?.applied ?? [])]));
    if (!fixList.length) return;

    const now = new Date();
    const iso = now.toISOString();
    const base =
      (exportBaseName ?? fileName ?? "fixed")
        .replace(/\.csv$/i, "")
        .trim() || "fixed";

    const lines: string[] = [];
    lines.push("StriveFormats – Auto-fix Change Log");
    lines.push(`Generated: ${iso}`);
    if (fileName) lines.push(`Source file: ${fileName}`);
    if (activeFormat?.name) lines.push(`Format: ${activeFormat.name}`);
    lines.push("");

    const counts = {
      errors: issuesForTable.filter((i) => i.severity === "error").length,
      warnings: issuesForTable.filter((i) => i.severity === "warning").length,
      tips: issuesForTable.filter((i) => i.severity === "info").length,
    };
    lines.push(`Issues after auto-fix: ${counts.errors} errors, ${counts.warnings} warnings, ${counts.tips} tips`);
    lines.push(`Total auto-fixes applied: ${fixList.length}`);
    lines.push("");

    lines.push("Fixes:");
    for (let i = 0; i < fixList.length; i++) lines.push(`${i + 1}. ${fixList[i]}`);

    if (lastFixAll?.applied?.length) {
      lines.push("");
      lines.push(`Note: "Fix all blocking issues" was used (${lastFixAll.applied.length} fixes in that batch).`);
    }

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}_fix_log.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

  const autoFixPreviewCount = 8;
  const autoFixPreview = autoFixes.slice(0, autoFixPreviewCount);
  const autoFixRest = autoFixes.slice(autoFixPreviewCount);
  const autoFixRestCount = Math.max(0, autoFixRest.length);

  const used = Number(quota?.used ?? 0);
  const limit = isUnlimited ? null : Number(planLimits?.exportsPerMonth ?? quota?.limit ?? 3);
  const left = isUnlimited ? null : Math.max(0, Number(quota?.remaining ?? (Number(limit ?? 0) - used)));

  const fixAllVisible = formatId === "shopify_products" && rows.length > 0 && realFixableBlockingCount > 0;
  const fixAllLabel = `Fix ${realFixableBlockingCount} auto-fixable blockers`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {errorBanner ? (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]">
          {errorBanner}
        </div>
      ) : null}

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

            <button
              type="button"
              className="pill-btn"
              onClick={downloadAutoFixLog}
              disabled={busy || rows.length === 0 || (!autoFixes.length && !lastFixAll?.applied?.length)}
              title={
                rows.length === 0
                  ? "Upload a CSV first"
                  : !autoFixes.length && !lastFixAll?.applied?.length
                    ? "No auto-fixes have been applied yet"
                    : "Download a text log of the fixes that were applied"
              }
              style={
                busy || rows.length === 0 || (!autoFixes.length && !lastFixAll?.applied?.length)
                  ? { opacity: 0.6, cursor: "not-allowed" }
                  : undefined
              }
            >
              Download fix log
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

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" className="pill-btn" onClick={downloadAutoFixLog}>
                  Download fix log
                </button>
                <span className="text-xs text-[color:rgba(var(--muted-rgb),1)]">
                  Includes both auto-fixes and any “Fix all blocking issues” changes.
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div ref={issuesPanelRef} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Issues</h2>
          <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Click a cell in the table to edit it. Red and yellow highlight errors and warnings.
          </p>

          <div className="mt-6">
            <EditableIssuesTable
              headers={tableHeaders}
              issues={issues as any}
              rows={rows}
              onUpdateRow={onUpdateRow}
              resetKey={formatId}
              formatId={formatId}
              pinnedRows={pinnedSorted}
              onUnpinRow={unpinRow}
              cellSeverityMap={cellSeverityMap}
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            <Link href="/formats/presets" className="hover:underline">
              Preset Formats
            </Link>
            <Link href="/pricing" className="hover:underline">
              Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* NOTE: the rest of your component above this section is unchanged in your app.
          If you pasted a different AppClient version earlier, keep that and only merge:
          - cellSeverityMap
          - passing cellSeverityMap into EditableIssuesTable
      */}
    </div>
  );
}
