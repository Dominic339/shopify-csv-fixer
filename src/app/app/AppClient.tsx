"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { validateAndFixShopifyBasic } from "@/lib/shopifyBasic";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

type SubStatus = {
  ok: boolean;
  plan: "free" | "basic" | "advanced";
  status?: string;
  current_period_end?: string | null;
};

type PlanLimit = {
  plan: "free" | "basic" | "advanced";
  monthlyExports: number;
};

type Quota = {
  used: number;
  limit: number;
  remaining: number;
  plan: "free" | "basic" | "advanced";
  label: string;
};

type CsvRow = Record<string, string>;

type FixApplied = {
  row: number;
  message: string;
};

type UiIssue = {
  severity: "error" | "warning" | "info";
  code?: string;
  message: string;

  // 1-based (matches user-facing “Row 1, Row 2…”)
  row?: number;

  // 0-based (array indexing / UI state maps)
  rowIndex?: number;

  // Column name / key
  column?: string;

  suggestion?: string;
};

function safeString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

// Ensures we never write undefined into a CsvRow
function toStringPatch(patch: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) out[k] = safeString(v);
  return out;
}

export default function AppClient() {
  const [loading, setLoading] = useState(false);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [fieldHistory, setFieldHistory] = useState<Record<string, "error" | "warning">>({});

  const [fixesApplied, setFixesApplied] = useState<FixApplied[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const [quota, setQuota] = useState<Quota | null>(null);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [planLimits, setPlanLimits] = useState<Record<string, PlanLimit> | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const dirtyTickRef = useRef(0);
  const [dirtyTick, setDirtyTick] = useState(0);

  const [autoFixNotes, setAutoFixNotes] = useState<string[]>([]);

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  function bumpDirty() {
    dirtyTickRef.current += 1;
    setDirtyTick(dirtyTickRef.current);
  }

  async function refreshQuotaAndPlan() {
    try {
      const [q, s, limits] = await Promise.all([getQuota(), fetch("/api/subscription/status").then((r) => r.json()), getPlanLimits()]);
      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch (e: any) {
      // don't hard fail UI if quota endpoints hiccup
      console.warn("refreshQuotaAndPlan failed:", e?.message ?? e);
    }
  }

  useEffect(() => {
    refreshQuotaAndPlan();
  }, []);

  async function onPickFile(file: File) {
    setLoading(true);
    setToast(null);

    try {
      const text = await file.text();
      setFileName(file.name);

      // Validation/lib handles parsing and fixes
      const result = validateAndFixShopifyBasic(text);

      const libAutoNotes = result.fixesApplied.map((f) => `Row ${f.row}: ${f.message}`);

      const libIssues = result.issues.map((i) => {
        const row =
          typeof (i as any).row === "number"
            ? (i as any).row
            : typeof (i as any).rowIndex === "number"
              ? (i as any).rowIndex + 1
              : undefined;

        const rowIndex =
          typeof (i as any).rowIndex === "number"
            ? (i as any).rowIndex
            : typeof (i as any).row === "number"
              ? Math.max(0, (i as any).row - 1)
              : undefined;

        const column =
          typeof (i as any).column === "string"
            ? (i as any).column
            : typeof (i as any).columnKey === "string"
              ? (i as any).columnKey
              : undefined;

        return {
          severity: i.severity,
          code: (i as any).code,
          message: i.message,
          row,
          rowIndex,
          column,
          suggestion: (i as any).suggestion,
        };
      }) as UiIssue[];

      setHeaders(result.fixedHeaders);
      setRows(result.fixedRows);
      setIssues(libIssues);

      // Remember every field that EVER had an error/warning so it becomes green when fixed.
      setFieldHistory((prev) => {
        const next = { ...prev };
        for (const it of libIssues) {
          if (typeof it.rowIndex !== "number" || !it.column) continue;
          if (it.severity !== "error" && it.severity !== "warning") continue;

          const k = `${it.rowIndex}::${it.column}`;
          const existing = next[k];
          if (existing === "error") continue;
          if (existing === "warning" && it.severity === "warning") continue;
          next[k] = it.severity;
        }
        return next;
      });

      setFixesApplied(result.fixesApplied);
      setAutoFixNotes(libAutoNotes);

      bumpDirty();
    } catch (e: any) {
      setToast(e?.message ?? "Failed to read file");
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setIssues([]);
    setFixesApplied([]);
    setAutoFixNotes([]);
    // keep fieldHistory or clear it? better to clear on new session
    setFieldHistory({});
    setToast(null);
  }

  function onUpdateRow(rowIndex: number, patch: Partial<CsvRow>) {
    setRows((prev) => {
      const next = [...prev];
      const existing = next[rowIndex] ?? {};
      const cleaned = toStringPatch(patch as Record<string, unknown>);
      next[rowIndex] = { ...existing, ...cleaned };
      return next;
    });

    bumpDirty();
  }

  async function onExport() {
    if (!rows.length || !headers.length) return;
    setLoading(true);
    setToast(null);

    try {
      // quota + consumption
      const q = await getQuota();
      if (q.remaining <= 0) {
        setToast("No exports remaining for this period.");
        setLoading(false);
        return;
      }

      const csv = buildCsv(headers, rows);

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Export failed");
      }

      const data = (await res.json()) as { ok: boolean; url?: string };
      if (data.url) {
        window.location.href = data.url;
      }

      await consumeExport(); // record usage
      await refreshQuotaAndPlan();
    } catch (e: any) {
      setToast(e?.message ?? "Export failed");
    } finally {
      setLoading(false);
    }
  }

  // Re-run validation when user edits.
  // Auto-fixes are applied again, but the table stays visible and keeps any “previously had issues” rows present.
  useEffect(() => {
    if (!rows.length || !headers.length) return;

    const handle = setTimeout(() => {
      try {
        const csv = buildCsv(headers, rows);
        const result = validateAndFixShopifyBasic(csv);

        const libAutoNotes = result.fixesApplied.map((f) => `Row ${f.row}: ${f.message}`);

        const libIssues = result.issues.map((i) => {
          const row =
            typeof (i as any).row === "number"
              ? (i as any).row
              : typeof (i as any).rowIndex === "number"
                ? (i as any).rowIndex + 1
                : undefined;

          const rowIndex =
            typeof (i as any).rowIndex === "number"
              ? (i as any).rowIndex
              : typeof (i as any).row === "number"
                ? Math.max(0, (i as any).row - 1)
                : undefined;

          const column =
            typeof (i as any).column === "string"
              ? (i as any).column
              : typeof (i as any).columnKey === "string"
                ? (i as any).columnKey
                : undefined;

          return {
            severity: i.severity,
            code: (i as any).code,
            message: i.message,
            row,
            rowIndex,
            column,
            suggestion: (i as any).suggestion,
          };
        }) as UiIssue[];

        setHeaders(result.fixedHeaders);
        setRows(result.fixedRows);
        setIssues(libIssues);

        setFieldHistory((prev) => {
          const next = { ...prev };
          for (const it of libIssues) {
            if (typeof it.rowIndex !== "number" || !it.column) continue;
            if (it.severity !== "error" && it.severity !== "warning") continue;

            const k = `${it.rowIndex}::${it.column}`;
            const existing = next[k];
            if (existing === "error") continue;
            if (existing === "warning" && it.severity === "warning") continue;
            next[k] = it.severity;
          }
          return next;
        });

        setFixesApplied(result.fixesApplied);
        setAutoFixNotes(libAutoNotes);
      } catch (e) {
        // ignore background validation errors
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [dirtyTick, rows.length, headers.length]);

  const issueCounts = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let info = 0;
    for (const i of issues) {
      if (i.severity === "error") errors += 1;
      else if (i.severity === "warning") warnings += 1;
      else info += 1;
    }
    return { errors, warnings, info };
  }, [issues]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
      {toast ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--text)]">
          {toast}
        </div>
      ) : null}

      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">CSV Fixer</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Upload → auto-normalize what’s safe → fix remaining issues → export a Shopify-ready CSV.
          </p>
        </div>

        {quota ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
            <div className="font-medium">Monthly exports</div>
            <div className="mt-1">
              {quota.used}/{quota.limit} used • {quota.remaining} left
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">{quota.label}</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Upload CSV</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            We’ll auto-fix safe issues. Anything risky stays in the table for manual edits.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-black shadow-sm">
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                }}
              />
            </label>

            <button
              onClick={onClear}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
              type="button"
            >
              Clear
            </button>

            <button
              onClick={onExport}
              disabled={!rows.length || !headers.length || loading}
              className="rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
              type="button"
            >
              Export fixed CSV
            </button>
          </div>

          <div className="mt-5 space-y-1 text-sm text-[var(--text)]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">File</span>
              <span className="font-medium">{fileName ?? "None"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Rows</span>
              <span className="font-medium">{rows.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Issues</span>
              <span className="font-medium">
                {issueCounts.errors} errors • {issueCounts.warnings} warnings • {issueCounts.info} info
              </span>
            </div>
          </div>

          {autoFixNotes.length ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Auto fixes applied</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
                {autoFixNotes.slice(0, 8).map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 text-xs text-[var(--muted)]">Want more exports? Upgrade.</div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Preview</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Lightweight preview (first 10 rows). Manual fixes table stays visible as you iterate.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {previewRows.length ? (
              <div className="max-h-[260px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[var(--surface)]">
                    <tr className="border-b border-[var(--border)]">
                      {headers.slice(0, 8).map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold text-[var(--text)]">
                          {h}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-semibold text-[var(--text)]">…</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr key={idx} className="border-b border-[var(--border)] last:border-b-0">
                        {headers.slice(0, 8).map((h) => (
                          <td key={h} className="px-3 py-2 text-[var(--text)]">
                            {r[h]}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-[var(--muted)]">…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-10 text-sm text-[var(--muted)]">Upload a CSV to preview it here.</div>
            )}
          </div>

          {rows.length && headers.length ? (
            <div className="mt-6">
              <EditableIssuesTable
                headers={headers}
                rows={rows}
                issues={issues}
                onUpdateRow={onUpdateRow}
                fieldHistory={fieldHistory}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function escapeCsvValue(v: string) {
  const needsQuotes = v.includes(",") || v.includes("\n") || v.includes('"');
  if (!needsQuotes) return v;
  return `"${v.replaceAll('"', '""')}"`;
}

function buildCsv(headers: string[], rows: CsvRow[]) {
  const head = headers.map(escapeCsvValue).join(",");
  const body = rows
    .map((r) => headers.map((h) => escapeCsvValue(r[h] ?? "")).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}
