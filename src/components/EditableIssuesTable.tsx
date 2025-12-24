"use client";

import { useEffect, useMemo, useState } from "react";
import { CsvRow } from "@/lib/csv";

type Issue = {
  severity: string; // "error" | "warning" | "info"
  row?: number; // 1-based
  column?: string;
  message: string;
};

type PinnedRow = {
  rowIndex: number; // 0-based
};

type ShowMode = "errors" | "errors_warnings" | "all";

export function EditableIssuesTable({
  headers,
  rows,
  issues,
  onUpdateRow,
}: {
  headers: string[];
  rows: CsvRow[];
  issues: Issue[];
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;
}) {
  // Space reserved for the sticky Row + Status columns so other columns don't get clipped underneath.
  const STICKY_LEFT_WIDTH = 92; // px (tweak 84–110 if you want)

  const editableCols = [
    "Handle",
    "Title",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Variant SKU",
    "Variant Price",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
  ];

  // Filter control for what qualifies a row to appear automatically
  const [showMode, setShowMode] = useState<ShowMode>("errors");

  // --- Manual pinned rows ---
  // These rows stay visible until export/new upload (because the user interacted with them).
  const [manualPinnedRows, setManualPinnedRows] = useState<PinnedRow[]>([]);

  // Notes for each row: show CURRENT errors/warnings/info on that row
  function issuesForRow(rowIndex: number) {
    const oneBased = rowIndex + 1;
    return issues.filter((i) => i.row === oneBased);
  }

  function hasBlockingError(rowIndex: number) {
    return issuesForRow(rowIndex).some((i) => i.severity === "error");
  }

  // Highlight ONLY the specific cells that currently have errors
  function cellHasError(rowIndex: number, col: string) {
    const oneBased = rowIndex + 1;
    return issues.some((i) => i.severity === "error" && i.row === oneBased && i.column === col);
  }

  function rowMatchesFilter(rowIndex: number) {
    const rowIssues = issuesForRow(rowIndex);
    if (rowIssues.length === 0) return false;

    const hasErr = rowIssues.some((i) => i.severity === "error");
    const hasWarn = rowIssues.some((i) => i.severity === "warning");
    const hasInfo = rowIssues.some((i) => i.severity === "info");

    if (showMode === "errors") return hasErr;
    if (showMode === "errors_warnings") return hasErr || hasWarn;
    return hasErr || hasWarn || hasInfo;
  }

  // Rows that match the CURRENT filter (these are NOT permanently pinned)
  const autoRows = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (rowMatchesFilter(i)) out.push(i);
    }
    return out;
  }, [rows.length, issues, showMode]);

  // Rows to actually show:
  // - all rows matching the current filter
  // - plus any MANUALLY pinned rows (until export/new upload)
  const rowsToShow = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];

    for (const i of autoRows) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }

    for (const p of manualPinnedRows) {
      if (p.rowIndex >= 0 && p.rowIndex < rows.length && !seen.has(p.rowIndex)) {
        seen.add(p.rowIndex);
        out.push(p.rowIndex);
      }
    }

    out.sort((a, b) => a - b);
    return out;
  }, [autoRows, manualPinnedRows, rows.length]);

  if (rowsToShow.length === 0) return null;

  // Pin a row manually (on focus/change)
  function pinRow(rowIndex: number) {
    setManualPinnedRows((prev) => {
      if (prev.some((p) => p.rowIndex === rowIndex)) return prev;
      return [...prev, { rowIndex }];
    });
  }

  // Optional: if rows array changes (new upload), clear pins automatically
  // (Usually you handle this by remounting or changing key, but this makes it resilient.)
  useEffect(() => {
    // If the file changes and row count shrinks, drop pins out of bounds
    setManualPinnedRows((prev) => prev.filter((p) => p.rowIndex >= 0 && p.rowIndex < rows.length));
  }, [rows.length]);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Fix issues here</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Switch the filter to focus on errors only, or include warnings/info. Rows you interact with stay visible
            until you export or upload a new file.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--muted)]">Show:</label>
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
            value={showMode}
            onChange={(e) => setShowMode(e.target.value as ShowMode)}
          >
            <option value="errors">Errors</option>
            <option value="errors_warnings">Errors + warnings</option>
            <option value="all">All issues</option>
          </select>

          <div className="text-xs text-[var(--muted)]">
            Showing <span className="font-semibold">{Math.min(rowsToShow.length, 25)}</span> rows
            {rowsToShow.length > 25 ? " (first 25)" : ""}.
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[var(--surface-2)]">
            <tr className="h-10">
              {/* Sticky Row */}
              <th
                className="sticky left-0 z-20 bg-[var(--surface-2)] px-3 py-2 align-middle whitespace-nowrap font-semibold"
                style={{ width: 40 }}
              >
                Row
              </th>

              {/* Sticky Status */}
              <th
                className="sticky z-20 bg-[var(--surface-2)] px-3 py-2 align-middle whitespace-nowrap font-semibold"
                style={{ left: 40, width: STICKY_LEFT_WIDTH - 40 }}
              >
                Status
              </th>

              {editableCols.map((h) => (
                <th
                  key={h}
                  className="align-middle whitespace-nowrap px-2 py-2 font-semibold"
                  style={{ paddingLeft: STICKY_LEFT_WIDTH }}
                >
                  {h}
                </th>
              ))}

              <th
                className="align-middle whitespace-nowrap px-2 py-2 font-semibold"
                style={{ paddingLeft: STICKY_LEFT_WIDTH }}
              >
                Notes (live)
              </th>
            </tr>
          </thead>

          <tbody>
            {rowsToShow.slice(0, 25).map((idx) => {
              const r = rows[idx];
              const rowIssues = issuesForRow(idx);

              const blocking = rowIssues.filter((i) => i.severity === "error");
              const warnings = rowIssues.filter((i) => i.severity === "warning");
              const info = rowIssues.filter((i) => i.severity === "info");

              const resolved = !hasBlockingError(idx);

              return (
                <tr key={idx} className="border-t border-[var(--border)] align-top">
                  {/* Sticky Row number */}
                  <td
                    className="sticky left-0 z-20 whitespace-nowrap bg-[var(--surface)] px-3 py-2 text-[var(--muted)]"
                    style={{ width: 40 }}
                  >
                    {idx + 1}
                  </td>

                  {/* Sticky Status */}
                  <td
                    className="sticky z-20 whitespace-nowrap bg-[var(--surface)] px-3 py-2"
                    style={{ left: 40, width: STICKY_LEFT_WIDTH - 40 }}
                  >
                    {resolved ? (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-900">
                        Needs fixes
                      </span>
                    )}
                  </td>

                  {/* Editable cells */}
                  {editableCols.map((col) => {
                    const hasErr = cellHasError(idx, col);

                    const baseInput =
                      "w-[130px] min-w-[130px] rounded-lg px-2 py-1 text-xs focus:w-[240px] focus:min-w-[240px] transition-[width] duration-150";

                    const okStyle = "border border-[var(--border)] bg-[var(--surface-2)]";
                    const errStyle = "border border-red-400 bg-red-50/10 ring-2 ring-red-500/30";

                    return (
                      <td
                        key={col}
                        className="px-2 py-2"
                        style={{ paddingLeft: STICKY_LEFT_WIDTH }}
                      >
                        <input
                          className={`${baseInput} ${hasErr ? errStyle : okStyle}`}
                          value={(r[col] ?? "") as string}
                          placeholder={col}
                          onFocus={() => pinRow(idx)}
                          onChange={(e) => {
                            pinRow(idx);
                            onUpdateRow(idx, { [col]: e.target.value });
                          }}
                        />
                      </td>
                    );
                  })}

                  {/* Notes */}
                  <td
                    className="sticky right-0 z-10 max-w-[420px] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--muted)]"
                    style={{ paddingLeft: STICKY_LEFT_WIDTH }}
                  >
                    {blocking.length === 0 && warnings.length === 0 && info.length === 0 ? (
                      <span className="text-emerald-200">No issues on this row.</span>
                    ) : (
                      <div className="space-y-2">
                        {blocking.length > 0 ? (
                          <div>
                            <p className="font-semibold text-red-900">Errors</p>
                            <ul className="list-disc pl-5 text-red-900">
                              {blocking.map((it, n) => (
                                <li key={`e-${n}`}>{it.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {warnings.length > 0 ? (
                          <div>
                            {/* FIX: better warning contrast for light + dark */}
                            <p className="font-semibold text-amber-900 dark:text-amber-200">Warnings</p>
                            <ul className="list-disc pl-5 text-amber-800 dark:text-amber-100">
                              {warnings.map((it, n) => (
                                <li key={`w-${n}`}>{it.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {info.length > 0 ? (
                          <div>
                            <p className="font-semibold text-sky-900 dark:text-sky-200">Info</p>
                            <ul className="list-disc pl-5 text-sky-800 dark:text-sky-100">
                              {info.map((it, n) => (
                                <li key={`i-${n}`}>{it.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Tip: “Errors” block export. Warnings/info don’t (unless you decide to treat them as blocking later).
      </p>
    </div>
  );
}
