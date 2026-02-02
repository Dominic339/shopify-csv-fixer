"use client";

import { useEffect, useMemo, useState } from "react";

type Issue = {
  severity: "error" | "warning" | "info";
  code?: string;
  message: string;
  row?: number;
  column?: string;
  suggestion?: string;
};

type CsvRow = Record<string, string>;

type Props = {
  headers: string[];
  rows: CsvRow[];
  issues: Issue[];
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;
};

type PinnedRow = { rowIndex: number };

export function EditableIssuesTable({ headers, rows, issues, onUpdateRow }: Props) {
  const [showMode, setShowMode] = useState<"errors" | "warnings" | "all">("errors");
  const [manualPinnedRows, setManualPinnedRows] = useState<PinnedRow[]>([]);

  // Auto-pin any row that ever had an issue so it stays visible even after you fix it.
  // This matches the "don't immediately drop rows" requirement.
  useEffect(() => {
    const rowsWithIssues = new Set<number>();
    for (const i of issues) {
      if (typeof i.row === "number") rowsWithIssues.add(i.row - 1);
    }
    if (rowsWithIssues.size === 0) return;
    setManualPinnedRows((prev) => {
      const next = [...prev];
      for (const rowIndex of rowsWithIssues) {
        if (rowIndex < 0 || rowIndex >= rows.length) continue;
        if (next.some((p) => p.rowIndex === rowIndex)) continue;
        next.push({ rowIndex });
      }
      return next;
    });
  }, [issues, rows.length]);

  const issuesByRow = useMemo(() => {
    const map = new Map<number, Issue[]>();
    for (const i of issues) {
      if (typeof i.row !== "number") continue;
      const idx = i.row - 1;
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(i);
    }
    return map;
  }, [issues]);

  const rowsToShow = useMemo(() => {
    const set = new Set<number>();

    for (const [rowIndex, rowIssues] of issuesByRow.entries()) {
      const anyError = rowIssues.some((x) => x.severity === "error");
      const anyWarning = rowIssues.some((x) => x.severity === "warning");
      if (showMode === "errors" && anyError) set.add(rowIndex);
      else if (showMode === "warnings" && anyWarning) set.add(rowIndex);
      else if (showMode === "all") set.add(rowIndex);
    }

    for (const p of manualPinnedRows) set.add(p.rowIndex);

    return [...set].sort((a, b) => a - b);
  }, [issuesByRow, manualPinnedRows, showMode]);

  function togglePin(rowIndex: number) {
    setManualPinnedRows((prev) => {
      if (prev.some((p) => p.rowIndex === rowIndex)) return prev.filter((p) => p.rowIndex !== rowIndex);
      return [...prev, { rowIndex }];
    });
  }

  function rowLabel(rowIndex: number) {
    return `Row ${rowIndex + 1}`;
  }

  function cell(value: string | undefined) {
    return value ?? "";
  }

  const severityChip = (s: Issue["severity"]) => {
    const cls =
      s === "error"
        ? "bg-red-500/15 text-red-300 border-red-500/30"
        : s === "warning"
          ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
          : "bg-blue-500/15 text-blue-200 border-blue-500/30";

    return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>{s}</span>;
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Manual fixes</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Edit values directly. Rows that ever had an issue stay visible so you can keep iterating.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`rounded-xl border px-3 py-2 text-xs ${
              showMode === "errors" ? "bg-[var(--surface-2)]" : "bg-transparent"
            }`}
            onClick={() => setShowMode("errors")}
            type="button"
          >
            Errors
          </button>
          <button
            className={`rounded-xl border px-3 py-2 text-xs ${
              showMode === "warnings" ? "bg-[var(--surface-2)]" : "bg-transparent"
            }`}
            onClick={() => setShowMode("warnings")}
            type="button"
          >
            Warnings
          </button>
          <button
            className={`rounded-xl border px-3 py-2 text-xs ${
              showMode === "all" ? "bg-[var(--surface-2)]" : "bg-transparent"
            }`}
            onClick={() => setShowMode("all")}
            type="button"
          >
            All
          </button>
        </div>
      </div>

      {rowsToShow.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
          No rows to show yet. Upload a CSV to see issues here.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {rowsToShow.slice(0, 50).map((rowIndex) => {
            const row = rows[rowIndex];
            const rowIssues = issuesByRow.get(rowIndex) ?? [];
            const pinned = manualPinnedRows.some((p) => p.rowIndex === rowIndex);

            return (
              <div key={rowIndex} className="rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-2)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold">{rowLabel(rowIndex)}</div>
                    {pinned ? (
                      <span className="text-[10px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[var(--muted)]">
                        Pinned
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      type="button"
                      onClick={() => togglePin(rowIndex)}
                    >
                      {pinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                </div>

                {rowIssues.length > 0 ? (
                  <div className="border-t border-[var(--border)] p-4">
                    <div className="mb-2 text-xs font-semibold text-[var(--muted)]">Issues</div>
                    <div className="space-y-2">
                      {rowIssues.slice(0, 8).map((i, idx) => (
                        <div key={idx} className="flex flex-wrap items-start gap-3 text-xs">
                          {severityChip(i.severity)}
                          <div className="flex-1 text-[var(--text)]">
                            <span className="font-semibold">{i.column ? `${i.column}: ` : ""}</span>
                            {i.message}
                            {i.suggestion ? <div className="mt-1 text-[var(--muted)]">{i.suggestion}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[var(--border)] p-4 text-xs text-[var(--muted)]">
                    No current issues on this row. It stays visible because it previously had an issue.
                  </div>
                )}

                <div className="border-t border-[var(--border)] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {headers.slice(0, 12).map((h) => (
                      <label key={h} className="block">
                        <div className="mb-1 text-[10px] font-semibold text-[var(--muted)]">{h}</div>
                        <input
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs outline-none"
                          value={cell(row[h])}
                          onChange={(e) => onUpdateRow(rowIndex, { [h]: e.target.value })}
                        />
                      </label>
                    ))}
                    {headers.length > 12 ? (
                      <div className="text-xs text-[var(--muted)]">
                        Showing the first 12 columns. Expand this later if you want every column editable here.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {rowsToShow.length > 50 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
              Showing the first 50 rows in the manual fix table to keep the UI fast.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
