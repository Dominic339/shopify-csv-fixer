"use client";

import { useEffect, useMemo, useState } from "react";
import { parseCsv, toCsv, CsvRow } from "@/lib/csv";
import { validateAndFixShopifyBasic } from "@/lib/shopifyBasic";
import { consumeExport, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

type Mode = "upload-fix";

export default function AppPage() {
  const [mode] = useState<Mode>("upload-fix");
  const [fileName, setFileName] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [rowsPreview, setRowsPreview] = useState<number>(20);

  const parsed = useMemo(() => {
    if (!rawText) return null;
    return parseCsv(rawText);
  }, [rawText]);

  // Editable copy of parsed rows (lets user fix errors in-app)
  const [editableRows, setEditableRows] = useState<CsvRow[] | null>(null);

  useEffect(() => {
    if (parsed?.rows) setEditableRows(parsed.rows);
  }, [parsed?.rows]);

  const fixed = useMemo(() => {
    if (!parsed) return null;
    return validateAndFixShopifyBasic(parsed.headers, editableRows ?? parsed.rows);
  }, [parsed, editableRows]);

  // Hydration-safe quota: load after mount
  const [quota, setQuota] = useState<ReturnType<typeof getQuota> | null>(null);

  useEffect(() => {
    setQuota(getQuota(3));
  }, []);

  const canExport = useMemo(() => {
    if (!quota) return false;
    if (!fixed) return false;
    const hasFatal = fixed.issues.some((i) => i.severity === "error");
    return quota.remaining > 0 && !hasFatal;
  }, [quota, fixed]);

  function onPickFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function updateRow(rowIndex: number, patch: Partial<CsvRow>) {
    setEditableRows((prev) => {
      const base = prev ? [...prev] : [...(parsed?.rows ?? [])];
      if (!base[rowIndex]) return base;
      base[rowIndex] = { ...base[rowIndex], ...patch };
      return base;
    });
  }

  function downloadFixed() {
    if (!fixed) return;
    if (!canExport) return;

    const afterQuota = consumeExport();
    setQuota(afterQuota);

    const csv = toCsv(fixed.fixedHeaders, fixed.fixedRows);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = fileName ? fileName.replace(/\.csv$/i, "") : "shopify-fixed";
    a.href = url;
    a.download = `${base}-fixed.csv`;
    a.click();
    URL.revokeObjectURL(url);

    alert(`Exported! Remaining exports this month: ${afterQuota.remaining}/${afterQuota.limitPerMonth}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CSV Fixer</h1>
          <p className="text-sm text-[var(--muted)]">
            Upload → Diagnose → Auto-fix safe issues → Export Shopify-ready CSV.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="font-semibold">Free exports:</span>{" "}
          <span className="text-[var(--muted)]">
            {quota ? `${quota.remaining}/${quota.limitPerMonth} remaining` : "Loading…"}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">1) Upload CSV</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">We process files locally in your browser.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="block w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"
            />
            <button
              className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              disabled={!fixed || !canExport}
              onClick={downloadFixed}
              title={
                !canExport
                  ? "Fix errors before exporting (and ensure you have free exports remaining)."
                  : "Download fixed CSV"
              }
            >
              Export fixed CSV
            </button>
          </div>

          {parsed?.parseErrors?.length ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
              <p className="font-semibold text-red-800">Parse issues</p>
              <ul className="mt-2 list-disc pl-5 text-red-800">
                {parsed.parseErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6">
            <h2 className="text-lg font-semibold">2) Preview</h2>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-[var(--muted)]">Rows:</label>
              <select
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={rowsPreview}
                onChange={(e) => setRowsPreview(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 overflow-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    {(fixed?.fixedHeaders ?? parsed?.headers ?? []).slice(0, 12).map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(fixed?.fixedRows ?? parsed?.rows ?? []).slice(0, rowsPreview).map((r, idx) => (
                    <tr key={idx} className="border-t border-[var(--border)]">
                      {(fixed?.fixedHeaders ?? parsed?.headers ?? []).slice(0, 12).map((h) => (
                        <td key={h} className="max-w-[260px] truncate px-3 py-2 text-[var(--muted)]">
                          {r[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-xs text-[var(--muted)]">
              Showing first 12 columns for readability. Export includes all columns.
            </p>
          </div>

          {/* Editor for blocking error rows */}
          {fixed ? (
            <div className="mt-6">
              <EditableIssuesTable
                headers={fixed.fixedHeaders}
                rows={fixed.fixedRows}
                issues={fixed.issues}
                onUpdateRow={updateRow}
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Diagnostics</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Errors must be fixed before export. Warnings are usually safe.</p>

          <div className="mt-4 space-y-2">
            {!fixed ? (
              <div className="rounded-2xl bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                Upload a CSV to see diagnostics.
              </div>
            ) : (
              <>
                {fixed.fixesApplied.length ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    <p className="font-semibold text-emerald-900">Auto-fixes applied</p>
                    <ul className="mt-2 list-disc pl-5 text-emerald-900">
                      {fixed.fixesApplied.slice(0, 8).map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {fixed.fixesApplied.length > 8 ? (
                      <p className="mt-2 text-emerald-900">…and {fixed.fixesApplied.length - 8} more.</p>
                    ) : null}
                  </div>
                ) : null}

                <IssueList issues={fixed.issues} />
              </>
            )}
          </div>

          {!canExport && fixed ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Export locked</p>
              <p className="mt-1">
                {fixed.issues.some((i) => i.severity === "error")
                  ? "Fix the errors listed above, then export."
                  : "You’ve used your free exports for this month on this device."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 text-xs text-[var(--muted)]">
        Current mode: <span className="font-semibold">Shopify Product CSV (Basic)</span> — we’ll add more formats next.
      </div>

      {/* not used yet, but fine to keep for future */}
      <div className="hidden">{mode}</div>
    </div>
  );
}

function IssueList({
  issues,
}: {
  issues: { severity: string; code: string; message: string; row?: number; column?: string; suggestion?: string }[];
}) {
  const sorted = [...issues].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));

  const counts = {
    error: sorted.filter((i) => i.severity === "error").length,
    warning: sorted.filter((i) => i.severity === "warning").length,
    info: sorted.filter((i) => i.severity === "info").length,
  };

  if (!sorted.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">No issues detected</p>
        <p className="mt-1">You should be safe to export.</p>
      </div>
    );
  }

  return (
    <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <summary className="cursor-pointer select-none list-none">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            Issues <span className="text-[var(--muted)]">({sorted.length})</span>
          </p>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 font-semibold text-red-800">
              Errors {counts.error}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
              Warnings {counts.warning}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">
              Info {counts.info}
            </span>
          </div>
        </div>

        <p className="mt-1 text-xs text-[var(--muted)]">Click to expand. Fix errors before exporting.</p>
      </summary>

      <div className="mt-4 space-y-3">
        {sorted.slice(0, 50).map((i, idx) => (
          <details key={`${i.code}-${idx}`} className="rounded-xl bg-[var(--surface)] p-3">
            <summary className="cursor-pointer select-none list-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    <Badge severity={i.severity as any} />
                    <span className="ml-2">{i.message}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {i.row ? `Row ${i.row}` : "Header/General"}
                    {i.column ? ` • Column: ${i.column}` : ""}
                  </p>
                </div>

                <span className="text-xs text-[var(--muted)]">Details</span>
              </div>
            </summary>

            {i.suggestion ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--muted)]">
                {i.suggestion}
              </div>
            ) : (
              <div className="mt-3 text-sm text-[var(--muted)]">No suggestion provided.</div>
            )}
          </details>
        ))}

        {sorted.length > 50 ? <p className="text-xs text-[var(--muted)]">Showing first 50 issues.</p> : null}
      </div>
    </details>
  );
}

function sevRank(s: string) {
  if (s === "error") return 0;
  if (s === "warning") return 1;
  return 2;
}

function Badge({ severity }: { severity: "error" | "warning" | "info" }) {
  const cls =
    severity === "error"
      ? "bg-red-100 text-red-800 border-red-200"
      : severity === "warning"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-sky-100 text-sky-800 border-sky-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {severity.toUpperCase()}
    </span>
  );
}
