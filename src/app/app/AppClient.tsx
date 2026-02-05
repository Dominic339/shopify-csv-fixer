"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { parseCsv, toCsv } from "@/lib/csv";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

import { getAllBuiltinFormats, getFormatById } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import type { CsvFixResult, CsvRow } from "@/lib/formats/types";

type SubStatus = {
  ok: boolean;
  plan?: "free" | "basic" | "advanced";
  status?: string;
};

type PlanLimits = {
  exportsPerMonth: number;
};

type UiIssue = {
  row?: number; // 1-based (what EditableIssuesTable expects)
  column?: string;
  field?: string;
  message: string;
  level?: "error" | "warning" | "info";
  severity?: "error" | "warning" | "info";
};

export default function AppClient() {
  const builtinFormats = useMemo(() => getAllBuiltinFormats(), []);

  // default to General CSV
  const [formatId, setFormatId] = useState<string>("general_csv");

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [autoFixes, setAutoFixes] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // store original uploaded text so switching formats can re-run processing
  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);

  const [quota, setQuota] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubStatus>({ ok: true, plan: "free" });
  const [planLimits, setPlanLimits] = useState<PlanLimits>({ exportsPerMonth: 3 });

  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const planForLimits = useMemo(() => {
    return (subStatus?.plan ?? "free") as "free" | "basic" | "advanced";
  }, [subStatus]);

  async function refreshQuotaAndPlan() {
    try {
      const [q, s, limits] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status").then((r) => r.json()),
        getPlanLimits(planForLimits),
      ]);
      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to refresh quota/plan");
    }
  }

  useEffect(() => {
    refreshQuotaAndPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planForLimits]);

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }, [headers, rows]);

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

  function toUiIssues(result: CsvFixResult): UiIssue[] {
    return (result.issues ?? []).map((i) => ({
      // IMPORTANT: convert rowIndex (0-based) -> row (1-based)
      row: i.rowIndex + 1,
      column: i.column,
      message: i.message,
      severity: i.severity,
      level: i.severity,
    }));
  }

  async function processCsvText(text: string) {
    const parsed = parseCsv(text);
    const fmt = getFormatById(formatId);

    // engine signature: (headers, rows, format)
    const result = applyFormatToParsedCsv(parsed.headers, parsed.rows, fmt);

    // parse errors don't have a row; keep them as banner-ish issues (won't show in manual table)
    const parseIssues: UiIssue[] = (parsed.parseErrors ?? []).map((m) => ({
      message: m,
      level: "error",
      severity: "error",
    }));

    setHeaders(result.fixedHeaders ?? []);
    setRows(result.fixedRows ?? []);
    setIssues([...(toUiIssues(result) ?? []), ...parseIssues]);
    setAutoFixes(result.fixesApplied ?? []);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setErrorBanner(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setLastUploadedText(text);

      await processCsvText(text);
      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to process CSV");
    } finally {
      setBusy(false);
    }
  }

  // If user switches formats after uploading, re-run processing on the same file
  useEffect(() => {
    if (!lastUploadedText) return;
    (async () => {
      try {
        setBusy(true);
        setErrorBanner(null);
        await processCsvText(lastUploadedText);
      } catch (e: any) {
        setErrorBanner(e?.message ?? "Failed to reprocess CSV for selected format");
      } finally {
        setBusy(false);
      }
    })();
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
      a.download = fileName ? fileName.replace(/\.csv$/i, "") + "_fixed.csv" : "fixed.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  }

  // THIS is the key fix:
  // EditableIssuesTable expects issues shaped like:
  // { row: number (1-based), column?: string, message: string, severity: ... }
  const issuesForManualTable = useMemo(() => {
    return (issues ?? [])
      .map((it: any) => {
        const row =
          typeof it.row === "number"
            ? it.row
            : typeof it.rowIndex === "number"
              ? it.rowIndex + 1
              : undefined;

        const column = (it.column ?? it.field ?? "").toString() || undefined;
        const severity = (it.severity ?? it.level ?? "error") as "error" | "warning" | "info";

        return {
          row,
          column,
          message: String(it.message ?? ""),
          severity,
          suggestion: it.suggestion,
        };
      })
      // rows without a row number can't be shown as “manual fix” rows
      .filter((x: any) => typeof x.row === "number" && x.row >= 1);
  }, [issues]);

  const autoFixPreviewCount = 8;
  const autoFixPreview = autoFixes.slice(0, autoFixPreviewCount);
  const autoFixRest = autoFixes.slice(autoFixPreviewCount);
  const autoFixRestCount = Math.max(0, autoFixRest.length);

  const isUnlimited = (subStatus?.plan ?? "free") === "advanced";

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
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
          <div className="font-medium">Monthly exports</div>
          <div>
            {isUnlimited ? (
              <>Unlimited</>
            ) : (
              <>
                {quota?.used ?? 0}/{planLimits?.exportsPerMonth ?? 3} used •{" "}
                {(planLimits?.exportsPerMonth ?? 3) - (quota?.used ?? 0)} left
              </>
            )}
          </div>
          <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
            Plan: {subStatus?.plan ?? "free"} ({subStatus?.status ?? "unknown"})
          </div>
        </div>
      </div>

      {/* FORMAT PICKER */}
      <div className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-sm font-semibold text-[var(--text)]">Format</div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {builtinFormats.map((f) => {
            const active = f.id === formatId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatId(f.id)}
                className={
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm " +
                  (active
                    ? "border-transparent bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]")
                }
              >
                {f.name}
              </button>
            );
          })}
        </div>
        <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
          Built-in formats are available to everyone. Custom formats (Advanced) come next.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Issues</h2>
          <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Click a cell in the table to edit it. Red and yellow highlight errors and warnings.
          </p>

          <div className="mt-4">
            <EditableIssuesTable
              headers={tableHeaders}
              issues={issuesForManualTable as any}
              rows={rows}
              onUpdateRow={onUpdateRow}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
