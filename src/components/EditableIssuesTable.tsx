"use client";

import { useEffect, useMemo, useState } from "react";

type RawIssue = {
  // New shape (engine)
  rowIndex?: number; // 0-based
  column?: string;

  // Old shape (legacy)
  row?: number; // 1-based
  field?: string;

  // Common
  message: string;
  suggestion?: string;

  // Some code paths used level instead of severity
  severity?: "error" | "warning" | "info";
  level?: "error" | "warning" | "info";

  code?: string;
};

type NormalizedIssue = {
  rowIndex: number; // 0-based
  column?: string;
  message: string;
  suggestion?: string;
  severity: "error" | "warning" | "info";
};

type CsvRow = Record<string, string>;

type Props = {
  headers: string[];
  rows: CsvRow[];
  issues: RawIssue[];
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;

  // Changing this value clears pinned rows (useful when switching formats)
  resetKey?: string;
};

type PinnedRow = { rowIndex: number };

export function EditableIssuesTable({ headers, rows, issues, onUpdateRow, resetKey }: Props) {
  const [showMode, setShowMode] = useState<"errors" | "warnings" | "all">("errors");
  const [manualPinnedRows, setManualPinnedRows] = useState<PinnedRow[]>([]);

  // Clear pins when switching formats (or any parent-driven reset)
  useEffect(() => {
    if (!resetKey) return;
    setManualPinnedRows([]);
    setShowMode("errors");
  }, [resetKey]);

  // Normalize issues so both old + new formats work
  const normalizedIssues: NormalizedIssue[] = useMemo(() => {
    return (issues ?? [])
      .map((it) => {
        const rowIndex =
          typeof it.rowIndex === "number"
            ? it.rowIndex
            : typeof it.row === "number"
              ? Math.max(0, it.row - 1)
              : null;

        if (rowIndex == null) return null;

        const column = (it.column ?? it.field ?? "").toString() || undefined;

        const severity = (it.severity ?? it.level ?? "error") as "error" | "warning" | "info";

        return {
          rowIndex,
          column,
          message: it.message,
          suggestion: it.suggestion,
          severity,
        };
      })
      .filter(Boolean) as NormalizedIssue[];
  }, [issues]);

  // Auto-pin rows that ever had an issue
  useEffect(() => {
    const rowsWithIssues = new Set<number>();
    for (const i of normalizedIssues) rowsWithIssues.add(i.rowIndex);

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
  }, [normalizedIssues, rows.length]);

  // Map issues by row
  const issuesByRow = useMemo(() => {
    const map = new Map<number, NormalizedIssue[]>();
    for (const i of normalizedIssues) {
      if (!map.has(i.rowIndex)) map.set(i.rowIndex, []);
      map.get(i.rowIndex)!.push(i);
    }
    return map;
  }, [normalizedIssues]);

  // Per-cell highlighting
  const issueByCellSeverity = useMemo(() => {
    const map = new Map<string, "error" | "warning" | "info">();
    for (const i of normalizedIssues) {
      if (!i.column) continue;
      const key = `${i.rowIndex}|||${i.column}`;

      const prev = map.get(key);
      if (prev === "error") continue;
      if (prev === "warning" && i.severity === "info") continue;

      map.set(key, i.severity);
    }
    return map;
  }, [normalizedIssues]);

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

  const severityChip = (s: NormalizedIssue["severity"]) => {
    const cls =
      s === "error"
        ? "bg-red-500/15 text-red-300 border-red-500/30"
        : s === "warning"
          ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
          : "bg-blue-500/15 text-blue-200 border-blue-500/30";

    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>
        {s}
      </span>
    );
  };

  function issueBoxClass(sev: NormalizedIssue["severity"]) {
    if (sev === "error") return "issue-box error";
    if (sev === "warning") return "issue-box warning";
    return "issue-box info";
  }

  function inputToneClass(rowIndex: number, col: string) {
    const sev = issueByCellSeverity.get(`${rowIndex}|||${col}`);
    if (sev === "error") return "input-error";
    if (sev === "warning") return "input-warning";
    return "";
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Manual fixes</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Edit values directly. Only the specific fields with issues are highlighted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`pill-btn pill-error ${showMode === "errors" ? "is-active" : ""}`}
            onClick={() => setShowMode("errors")}
            type="button"
          >
            Errors
          </button>
          <button
            className={`pill-btn pill-warning ${showMode === "warnings" ? "is-active" : ""}`}
            onClick={() => setShowMode("warnings")}
            type="button"
          >
            Warnings
          </button>
          <button
            className={`pill-btn pill-all ${showMode === "all" ? "is-active" : ""}`}
            onClick={() => setShowMode("all")}
            type="button"
          >
            All
          </button>
        </div>
      </div>

      {rowsToShow.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
          No rows to show yet. Upload a CSV to see issues here.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rowsToShow.map((rowIndex) => {
            const rowIssues = issuesByRow.get(rowIndex) ?? [];
            const row = rows[rowIndex] ?? {};

            const anyError = rowIssues.some((x) => x.severity === "error");
            const anyWarning = rowIssues.some((x) => x.severity === "warning");

            if (showMode === "errors" && !anyError && !manualPinnedRows.some((p) => p.rowIndex === rowIndex)) return null;
            if (showMode === "warnings" && !anyWarning && !manualPinnedRows.some((p) => p.rowIndex === rowIndex)) return null;

            return (
              <div key={rowIndex} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--text)]">{rowLabel(rowIndex)}</div>
                    {rowIssues.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {rowIssues.slice(0, 3).map((x, i) => (
                          <span key={i}>{severityChip(x.severity)}</span>
                        ))}
                        {rowIssues.length > 3 ? (
                          <span className="text-[10px] text-[var(--muted)]">+{rowIssues.length - 3} more</span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--muted)]">Pinned</div>
                    )}
                  </div>

                  <button
                    className="pill-btn"
                    onClick={() => togglePin(rowIndex)}
                    type="button"
                    title="Pin or unpin this row"
                  >
                    {manualPinnedRows.some((p) => p.rowIndex === rowIndex) ? "Unpin" : "Pin"}
                  </button>
                </div>

                {rowIssues.length ? (
                  <div className="mt-3 space-y-2">
                    {rowIssues.map((iss, i) => (
                      <div key={i} className={issueBoxClass(iss.severity)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-[var(--text)]">
                            {iss.column ? iss.column : "Row issue"}
                          </div>
                          {severityChip(iss.severity)}
                        </div>
                        <div className="mt-1 text-sm text-[var(--text)]">{iss.message}</div>
                        {iss.suggestion ? (
                          <div className="mt-1 text-xs text-[var(--muted)]">{iss.suggestion}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {headers.map((h) => (
                    <div key={h}>
                      <div className="mb-1 text-xs font-semibold text-[var(--muted)]">{h}</div>
                      <input
                        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none ${inputToneClass(rowIndex, h)}`}
                        value={cell(row[h])}
                        onChange={(e) => onUpdateRow(rowIndex, { [h]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
