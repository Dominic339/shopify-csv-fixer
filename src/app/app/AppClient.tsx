"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { validateAndFixShopifyBasic } from "@/lib/shopifyBasic";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

type SubStatus = {
  ok: boolean;
  plan?: "free" | "basic" | "advanced";
  status?: string;
};

type PlanLimits = {
  exportsPerMonth: number;
};

type CsvRow = Record<string, string>;

type UiIssue = {
  row?: number; // 1-based
  column?: string;
  field?: string;
  message: string;
  level?: "error" | "warning" | "info";
  severity?: "error" | "warning" | "info";
};

type CsvIssue = {
  rowIndex: number; // 0-based
  column: string;
  message: string;
  severity: "error" | "warning" | "info";
};

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

  const planForLimits = useMemo(() => {
    return (subStatus?.plan ?? "free") as "free" | "basic" | "advanced";
  }, [subStatus]);

  async function refreshQuotaAndPlan() {
    try {
      // FIX: getPlanLimits requires an argument now
      const [q, s, limits] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status").then((r) => r.json()),
        getPlanLimits(planForLimits),
      ]);
      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch (e: any) {
      // keep UI alive even if quota fetch fails
      setErrorBanner(e?.message ?? "Failed to refresh quota/plan");
    }
  }

  useEffect(() => {
    refreshQuotaAndPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planForLimits]);

  const issuesForTable: CsvIssue[] = useMemo(() => {
    return (issues ?? [])
      .map((it) => {
        const rowIndex =
          typeof (it as any).rowIndex === "number"
            ? (it as any).rowIndex
            : typeof it.row === "number"
              ? Math.max(0, it.row - 1)
              : 0;

        const col = (it.column ?? it.field ?? "").toString();

        const sev =
          (it.severity ?? it.level ?? "error") as "error" | "warning" | "info";

        if (!col) return null;

        return {
          rowIndex,
          column: col,
          message: it.message,
          severity: sev,
        };
      })
      .filter(Boolean) as CsvIssue[];
  }, [issues]);

  const onUpdateRow = useCallback((rowIndex: number, patch: Partial<CsvRow>) => {
    setRows((prev) => {
      const next = [...prev];
      const existing = next[rowIndex] ?? {};
      const cleaned: Record<string, string> = {};

      // prevent undefined values from creeping in
      for (const [k, v] of Object.entries(patch)) {
        if (typeof v === "string") cleaned[k] = v;
        else if (v == null) cleaned[k] = "";
        else cleaned[k] = String(v);
      }

      next[rowIndex] = { ...existing, ...cleaned };
      return next;
    });
  }, []);

  async function handleFile(file: File) {
    setBusy(true);
    setErrorBanner(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const result = validateAndFixShopifyBasic(text);

      setHeaders(result.headers ?? []);
      setRows(result.rows ?? []);
      setIssues(result.issues ?? []);
      setAutoFixes(result.autoFixes ?? []);

      // refresh quota display (optional)
      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to process CSV");
    } finally {
      setBusy(false);
    }
  }

  async function exportFixedCsv() {
    setBusy(true);
    setErrorBanner(null);
    try {
      // consume quota (server-side)
      await consumeExport();

      // export locally (client-side)
      const cols = headers.length ? headers : Object.keys(rows[0] ?? {});
      const escape = (s: string) => {
        const str = s ?? "";
        if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };

      const lines = [
        cols.map(escape).join(","),
        ...rows.map((r) => cols.map((c) => escape(r[c] ?? "")).join(",")),
      ];

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
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
            Upload → auto-normalize what’s safe → fix remaining issues → export.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
          <div className="font-medium">Monthly exports</div>
          <div>
            {quota?.used ?? 0}/{planLimits?.exportsPerMonth ?? 3} used •{" "}
            {(planLimits?.exportsPerMonth ?? 3) - (quota?.used ?? 0)} left
          </div>
          <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
            Plan: {subStatus?.plan ?? "free"} ({subStatus?.status ?? "unknown"})
          </div>
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
                disabled={busy}
              />
            </label>

            <button
              className="rg-btn"
              onClick={() => {
                setHeaders([]);
                setRows([]);
                setIssues([]);
                setAutoFixes([]);
                setFileName(null);
              }}
              disabled={busy}
              type="button"
            >
              Clear
            </button>

            <button className="rg-btn" onClick={exportFixedCsv} disabled={busy || rows.length === 0} type="button">
              Export fixed CSV
            </button>
          </div>

          <div className="mt-6 grid gap-2 text-sm text-[var(--text)]">
            <div className="flex justify-between">
              <span className="text-[color:rgba(var(--muted-rgb),1)]">File</span>
              <span className="font-medium">{fileName ?? "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:rgba(var(--muted-rgb),1)]">Rows</span>
              <span className="font-medium">{rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:rgba(var(--muted-rgb),1)]">Issues</span>
              <span className="font-medium">
                {issuesForTable.filter((i) => i.severity === "error").length} errors •{" "}
                {issuesForTable.filter((i) => i.severity === "warning").length} warnings •{" "}
                {issuesForTable.filter((i) => i.severity === "info").length} info
              </span>
            </div>
          </div>

          {autoFixes.length ? (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-sm font-semibold text-[var(--text)]">Auto fixes applied</div>
              <ul className="list-disc pl-5 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                {autoFixes.map((x, idx) => (
                  <li key={idx}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Preview</h2>
          <p className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Lightweight preview (first 10 rows). Manual fixes table stays visible as you iterate.
          </p>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)]">
            {rows.length ? (
              <table className="min-w-full text-sm">
                <thead className="bg-[color:rgba(var(--bg-rgb),0.35)]">
                  <tr>
                    {headers.slice(0, 10).map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      {headers.slice(0, 10).map((h) => (
                        <td key={h} className="px-3 py-2 text-[var(--text)]">
                          {r[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                Upload a CSV to preview it here.
              </div>
            )}
          </div>

          {rows.length ? (
            <div className="mt-6">
              <EditableIssuesTable headers={headers} rows={rows} issues={issuesForTable} onUpdateRow={onUpdateRow} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
