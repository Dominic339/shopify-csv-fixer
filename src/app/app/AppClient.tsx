// src/app/app/AppClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { parseCsv, toCsv, CsvRow } from "@/lib/csv";
import { validateAndFixShopifyBasic } from "@/lib/shopifyBasic";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

type SubStatus = {
  ok: boolean;
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  exportsUsed: number;
  limit: number;
};

type UiIssue = {
  severity: "error" | "warning" | "info";
  code?: string;
  message: string;
  row?: number;
  column?: string;
  suggestion?: string;
};

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(original: string | null | undefined) {
  const base = (original || "shopify-fixed.csv").trim();
  if (!base.toLowerCase().endsWith(".csv")) return `${base}.csv`;
  return base;
}

// IMPORTANT: return type is Record<string, string> (no undefined)
// so the merge stays compatible with CsvRow (Record<string, string>).
function cleanPatch(patch: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

export default function AppClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(3);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [fixesApplied, setFixesApplied] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const [tableKey, setTableKey] = useState(0);

  const [dirtyTick, setDirtyTick] = useState(0);
  const validateTimer = useRef<number | null>(null);

  async function refreshSubStatus() {
    try {
      const r = await fetch("/api/quota/status", { cache: "no-store" });
      const j = (await r.json()) as SubStatus;
      setSub(j);

      if (!j.signedIn) {
        const q = getQuota(3);
        setQuotaUsed(q.exportsUsed);
        setQuotaLimit(q.limitPerMonth);
      } else {
        setQuotaUsed(j.exportsUsed ?? 0);
        setQuotaLimit(j.limit ?? getPlanLimits(j.plan).exportsPerMonth);
      }
    } catch {
      setSub(null);
      const q = getQuota(3);
      setQuotaUsed(q.exportsUsed);
      setQuotaLimit(q.limitPerMonth);
    }
  }

  useEffect(() => {
    refreshSubStatus();
  }, []);

  const remaining = Math.max(0, quotaLimit - quotaUsed);

  const issueCounts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const i of issues) c[i.severity]++;
    return c;
  }, [issues]);

  function resetFileState() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setIssues([]);
    setFixesApplied([]);
    setParseErrors([]);
    setStatusMsg("");
    setTableKey((k) => k + 1);
  }

  async function handleFile(f: File) {
    setStatusMsg("");
    setFileName(f.name);

    const text = await f.text();
    const parsed = parseCsv(text);

    setParseErrors(parsed.parseErrors);

    if (parsed.parseErrors.length > 0) {
      setStatusMsg("Your file parsed with warnings. Review the errors before exporting.");
    }

    const result = validateAndFixShopifyBasic(parsed.headers, parsed.rows);

    const libIssues = result.issues.map((i) => ({
      severity: i.severity,
      code: i.code,
      message: i.message,
      row: i.row,
      column: i.column,
      suggestion: i.suggestion,
    })) as UiIssue[];

    setHeaders(result.fixedHeaders);
    setRows(result.fixedRows);
    setIssues(libIssues);
    setFixesApplied(result.fixesApplied);
    setTableKey((k) => k + 1);
  }

  function onPickFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    handleFile(f).catch((err) => setStatusMsg(err?.message ?? "Could not read file."));
  }

  // EditableIssuesTable calls with { [header]: string } only, never undefined.
  function onUpdateRow(rowIndex: number, patch: Record<string, string>) {
    const cleaned = cleanPatch(patch);

    setRows((prev) => {
      const next = [...prev];
      const existing: CsvRow = next[rowIndex] ?? ({} as CsvRow);
      const merged: CsvRow = { ...existing, ...cleaned };
      next[rowIndex] = merged;
      return next;
    });

    setDirtyTick((t) => t + 1);
  }

  useEffect(() => {
    if (headers.length === 0 || rows.length === 0) return;

    if (validateTimer.current) window.clearTimeout(validateTimer.current);

    validateTimer.current = window.setTimeout(() => {
      const result = validateAndFixShopifyBasic(headers, rows);

      const libIssues = result.issues.map((i) => ({
        severity: i.severity,
        code: i.code,
        message: i.message,
        row: i.row,
        column: i.column,
        suggestion: i.suggestion,
      })) as UiIssue[];

      setHeaders(result.fixedHeaders);
      setRows(result.fixedRows);
      setIssues(libIssues);
      setFixesApplied(result.fixesApplied);
    }, 300);

    return () => {
      if (validateTimer.current) window.clearTimeout(validateTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyTick]);

  async function consumeOneExport(): Promise<{ ok: boolean; error?: string }> {
    if (sub?.signedIn) {
      const r = await fetch("/api/quota/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: j?.error ?? "Quota unavailable." };
      await refreshSubStatus();
      return { ok: true };
    }

    const q = getQuota(3);
    if (q.remaining <= 0) return { ok: false, error: "Monthly free export limit reached for this device." };
    consumeExport();
    const q2 = getQuota(3);
    setQuotaUsed(q2.exportsUsed);
    setQuotaLimit(q2.limitPerMonth);
    return { ok: true };
  }

  async function onExport() {
    setStatusMsg("");

    if (headers.length === 0 || rows.length === 0) {
      setStatusMsg("Upload a CSV first.");
      return;
    }

    if (remaining <= 0) {
      setStatusMsg("No exports remaining this month.");
      return;
    }

    if (issueCounts.error > 0) {
      const proceed = window.confirm(
        `There are still ${issueCounts.error} error(s). Export anyway?\n\nTip: Fix errors in the table first for best Shopify results.`
      );
      if (!proceed) return;
    }

    const consumed = await consumeOneExport();
    if (!consumed.ok) {
      setStatusMsg(consumed.error ?? "Could not export.");
      return;
    }

    const csv = toCsv(headers, rows);
    const outName = safeName(fileName ? fileName.replace(/\.csv$/i, "") + "-fixed.csv" : "shopify-fixed.csv");
    downloadTextFile(outName, csv);

    setTableKey((k) => k + 1);
    setStatusMsg("Exported successfully.");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">CSV Fixer</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Upload → auto-normalize what’s safe → fix remaining issues → export a Shopify-ready CSV.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <div className="text-xs text-[var(--muted)]">Monthly exports</div>
          <div className="mt-1 font-semibold text-[var(--text)]">
            {quotaLimit - remaining}/{quotaLimit} used • {remaining} left
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {sub?.signedIn ? `Plan: ${sub.plan} (${sub.status || "none"})` : "Free device quota (no account required)"}
          </div>
        </div>
      </div>

      {statusMsg ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          {statusMsg}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Upload CSV</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            We’ll auto-fix safe issues. Anything risky stays in the table for manual edits.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
              onClick={onPickFile}
            >
              Choose file
            </button>

            <button
              type="button"
              className="rgb-btn bg-[var(--surface-2)] px-5 py-3 text-sm"
              onClick={resetFileState}
              disabled={!fileName}
            >
              Clear
            </button>

            <button
              type="button"
              className="rgb-btn bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              onClick={onExport}
              disabled={!fileName || headers.length === 0 || rows.length === 0 || remaining <= 0}
            >
              Export fixed CSV
            </button>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">File</span>
              <span className="font-medium text-[var(--text)]">{fileName ?? "None"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Rows</span>
              <span className="font-medium text-[var(--text)]">{rows.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Issues</span>
              <span className="font-medium text-[var(--text)]">
                {issueCounts.error} errors • {issueCounts.warning} warnings • {issueCounts.info} info
              </span>
            </div>
          </div>

          {parseErrors.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs">
              <div className="font-semibold">CSV parse warnings</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {parseErrors.slice(0, 6).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {parseErrors.length > 6 ? <li>…and {parseErrors.length - 6} more</li> : null}
              </ul>
            </div>
          ) : null}

          {fixesApplied.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs">
              <div className="font-semibold">Auto fixes applied</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
                {fixesApplied.slice(0, 8).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
                {fixesApplied.length > 8 ? <li>…and {fixesApplied.length - 8} more</li> : null}
              </ul>
            </div>
          ) : null}

          <p className="mt-5 text-xs text-[var(--muted)]">
            Want more exports?{" "}
            <Link className="underline" href="/#pricing">
              Upgrade
            </Link>
            .
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Lightweight preview (first 10 rows). Manual fixes table stays visible as you iterate.
          </p>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)]">
            {rows.length === 0 ? (
              <div className="p-6 text-sm text-[var(--muted)]">Upload a CSV to preview it here.</div>
            ) : (
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    {headers.slice(0, 8).map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                    {headers.length > 8 ? <th className="px-3 py-2 font-semibold">…</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, idx) => (
                    <tr key={idx} className="border-t border-[var(--border)]">
                      {headers.slice(0, 8).map((h) => (
                        <td key={h} className="px-3 py-2 text-[var(--muted)]">
                          {r[h] || ""}
                        </td>
                      ))}
                      {headers.length > 8 ? <td className="px-3 py-2 text-[var(--muted)]">…</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {rows.length > 0 ? (
            <div className="mt-6">
              <EditableIssuesTable
                key={tableKey}
                headers={headers}
                rows={rows}
                issues={issues}
                onUpdateRow={onUpdateRow}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
