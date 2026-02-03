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

type SeenLevel = 0 | 1 | 2; // 0 none, 1 warning, 2 error

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
  const STICKY_LEFT_WIDTH = 92;

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

  const [showMode, setShowMode] = useState<ShowMode>("errors");
  const [manualPinnedRows, setManualPinnedRows] = useState<PinnedRow[]>([]);

  // Track cells that have EVER had an error/warning so we can turn them green once fixed
  const [seenCells, setSeenCells] = useState<Record<string, SeenLevel>>({});

  function keyFor(rowIndex: number, col: string) {
    return `${rowIndex}:${col}`;
  }

  function issuesForRow(rowIndex: number) {
    const oneBased = rowIndex + 1;
    return issues.filter((i) => i.row === oneBased);
  }

  function hasBlockingError(rowIndex: number) {
    return issuesForRow(rowIndex).some((i) => i.severity === "error");
  }

  function cellCurrentLevel(rowIndex: number, col: string): SeenLevel {
    const oneBased = rowIndex + 1;
    let level: SeenLevel = 0;

    for (const i of issues) {
      if (i.row !== oneBased) continue;
      if (i.column !== col) continue;

      if (i.severity === "error") return 2;
      if (i.severity === "warning") level = 1;
    }

    return level;
  }

  // Whenever issues change, mark any error/warning cells as "seen"
  useEffect(() => {
    if (!issues || issues.length === 0) return;

    setSeenCells((prev) => {
      const next = { ...prev };

      for (const i of issues) {
        if (!i.row || !i.column) continue;
        if (i.severity !== "error" && i.severity !== "warning") continue;

        const rowIndex = i.row - 1;
        const col = i.column;

        const k = keyFor(rowIndex, col);
        const incoming: SeenLevel = i.severity === "error" ? 2 : 1;

        // Keep the highest severity ever seen
        const existing = next[k] ?? 0;
        next[k] = (incoming > existing ? incoming : existing) as SeenLevel;
      }

      return next;
    });
  }, [issues]);

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

  const autoRows = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (rowMatchesFilter(i)) out.push(i);
    }
    return out;
  }, [rows.length, issues, showMode]);

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

  function pinRow(rowIndex: number) {
    setManualPinnedRows((prev) => {
      if (prev.some((p) => p.rowIndex === rowIndex)) return prev;
      return [...prev, { rowIndex }];
    });
  }

  useEffect(() => {
    setManualPinnedRows((prev) => prev.filter((p) => p.rowIndex >= 0 && p.rowIndex < rows.length));
  }, [rows.length]);

  function inputClassForCell(rowIndex: number, col: string) {
    const base =
      "w-[130px] min-w-[130px] rounded-lg px-2 py-1 text-xs focus:w-[240px] focus:min-w-[240px] transition-[width] duration-150 outline-none";

    const current = cellCurrentLevel(rowIndex, col);
    const seen = seenCells[keyFor(rowIndex, col)] ?? 0;

    // Current error -> red
    if (current === 2) {
      return `${base} border border-red-500 bg-red-500/10 ring-2 ring-red-500/25 text-[var(--text)]`;
    }

    // Current warning -> yellow
    if (current === 1) {
      return `${base} border border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 text-[var(--text)]`;
    }

    // Previously had error/warning but now clean -> green
    if (seen > 0) {
      return `${base} border border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 text-[var(--text)]`;
    }

    // Normal
    return `${base} border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]`;
  }

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
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
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
              <th
                className="sticky left-0 z-20 bg-[var(--surface-2)] px-3 py-2 align-middle whitespace-nowrap font-semibold"
                style={{ width: 40 }}
              >
                Row
              </th>

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

              <th className="align-middle whitespace-nowrap px-2 py-2 font-semibold" style={{ paddingLeft: STICKY_LEFT_WIDTH }}>
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
                  <td
                    className="sticky left-0 z-20 whitespace-nowrap bg-[var(--surface)] px-3 py-2 text-[var(--muted)]"
                    style={{ width: 40 }}
                  >
                    {idx + 1}
                  </td>

                  <td
                    className="sticky z-20 whitespace-nowrap bg-[var(--surface)] px-3 py-2"
                    style={{ left: 40, width: STICKY_LEFT_WIDTH - 40 }}
                  >
                    {resolved ? (
                      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">
                        Needs fixes
                      </span>
                    )}
                  </td>

                  {editableCols.map((col) => (
                    <td key={col} className="px-2 py-2" style={{ paddingLeft: STICKY_LEFT_WIDTH }}>
                      <input
                        className={inputClassForCell(idx, col)}
                        value={(r[col] ?? "") as string}
                        placeholder={col}
                        onFocus={() => pinRow(idx)}
                        onChange={(e) => {
                          pinRow(idx);
                          onUpdateRow(idx, { [col]: e.target.value });
                        }}
                      />
                    </td>
                  ))}

                  <td
                    className="sticky right-0 z-10 max-w-[420px] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--muted)]"
                    style={{ paddingLeft: STICKY_LEFT_WIDTH }}
                  >
                    {blocking.length === 0 && warnings.length === 0 && info.length === 0 ? (
                      <span className="text-emerald-400">No issues on this row.</span>
                    ) : (
                      <div className="space-y-2">
                        {blocking.length > 0 ? (
                          <div>
                            <p className="font-semibold text-red-500">Errors</p>
                            <ul className="list-disc pl-5 text-red-500/90">
                              {blocking.map((it, n) => (
                                <li key={`e-${n}`}>{it.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {warnings.length > 0 ? (
                          <div>
                            <p className="font-semibold text-amber-500">Warnings</p>
                            <ul className="list-disc pl-5 text-amber-500/90">
                              {warnings.map((it, n) => (
                                <li key={`w-${n}`}>{it.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {info.length > 0 ? (
                          <div>
                            <p className="font-semibold text-sky-500">Info</p>
                            <ul className="list-disc pl-5 text-sky-500/90">
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
        Tip: Errors block export. Warnings/info don’t.
      </p>
    </div>
  );
}
