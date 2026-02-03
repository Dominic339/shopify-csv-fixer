"use client";

import React, { useEffect, useMemo, useState } from "react";

type Severity = "error" | "warning" | "info";

export type CsvRow = Record<string, string>;

export type CsvIssue = {
  rowIndex: number; // 0-based
  column: string;
  severity: Severity;
  message: string;
};

function worstSeverity(a: Severity, b: Severity): Severity {
  const rank: Record<Severity, number> = { error: 3, warning: 2, info: 1 };
  return rank[a] >= rank[b] ? a : b;
}

function cellKey(rowIndex: number, column: string) {
  return `${rowIndex}::${column}`;
}

function badgeClasses(sev: Severity | "fixed") {
  if (sev === "error") return "bg-red-500/15 text-red-700 dark:text-red-200 border-red-500/30";
  if (sev === "warning") return "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/30";
  if (sev === "info") return "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30";
  return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30";
}

function inputClasses(sev: Severity | "fixed" | null) {
  // null = normal
  if (sev === "error")
    return "border-red-500/60 bg-red-500/10 focus:ring-red-500/30 focus:border-red-500/70";
  if (sev === "warning")
    return "border-yellow-500/60 bg-yellow-500/10 focus:ring-yellow-500/30 focus:border-yellow-500/70";
  if (sev === "fixed")
    return "border-emerald-500/60 bg-emerald-500/10 focus:ring-emerald-500/30 focus:border-emerald-500/70";
  if (sev === "info")
    return "border-blue-500/60 bg-blue-500/10 focus:ring-blue-500/30 focus:border-blue-500/70";
  return "border-[var(--border)] bg-[var(--surface)] focus:ring-blue-500/20 focus:border-blue-500/40";
}

export default function EditableIssuesTable(props: {
  rows: CsvRow[];
  issues: CsvIssue[];
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;
}) {
  const { rows, issues, onUpdateRow } = props;

  // Track cells that ever had an issue so they stay listed even after fixed
  const [seenCells, setSeenCells] = useState<Record<string, Severity>>({});

  // Filter state
  const [filter, setFilter] = useState<"errors" | "warnings" | "all">("errors");

  // Update "seenCells" whenever issues change
  useEffect(() => {
    if (!issues?.length) return;

    setSeenCells((prev) => {
      const next = { ...prev };
      for (const i of issues) {
        const k = cellKey(i.rowIndex, i.column);
        if (!next[k]) next[k] = i.severity;
        else next[k] = worstSeverity(next[k], i.severity);
      }
      return next;
    });
  }, [issues]);

  const currentIssueByCell = useMemo(() => {
    const map: Record<string, CsvIssue> = {};
    for (const i of issues) {
      const k = cellKey(i.rowIndex, i.column);
      // If multiple issues hit same cell, keep worst severity
      if (!map[k]) map[k] = i;
      else {
        const existing = map[k];
        map[k] =
          worstSeverity(existing.severity, i.severity) === existing.severity ? existing : i;
      }
    }
    return map;
  }, [issues]);

  const tableRows = useMemo(() => {
    // Build list of cells that ever had issues
    const allCells = Object.keys(seenCells).map((k) => {
      const [rowIndexStr, column] = k.split("::");
      const rowIndex = Number(rowIndexStr);
      const ever = seenCells[k];
      const current = currentIssueByCell[k]; // undefined if fixed
      const currentSev = current?.severity ?? null;

      // What should the input highlight show?
      // error/warning/info if current issue exists
      // green if no current issue but it had one before
      const highlight: Severity | "fixed" | null =
        currentSev ? currentSev : ever ? "fixed" : null;

      return {
        key: k,
        rowIndex,
        column,
        everSeverity: ever,
        currentIssue: current ?? null,
        highlight,
      };
    });

    // Apply filters:
    // - errors: show cells that currently have error OR previously had error
    // - warnings: show cells that currently have warning OR previously had warning (and not error-only)
    // - all: show all cells ever seen
    const filtered = allCells.filter((c) => {
      if (filter === "all") return true;

      const current = c.currentIssue?.severity ?? null;
      const ever = c.everSeverity;

      if (filter === "errors") {
        return current === "error" || ever === "error";
      }

      if (filter === "warnings") {
        // show warnings (current/ever), but include only if not ever-error
        return (current === "warning" || ever === "warning") && ever !== "error";
      }

      return true;
    });

    // Sort: current issues first, then by row, then column
    filtered.sort((a, b) => {
      const aHasCurrent = a.currentIssue ? 1 : 0;
      const bHasCurrent = b.currentIssue ? 1 : 0;
      if (aHasCurrent !== bHasCurrent) return bHasCurrent - aHasCurrent;
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.column.localeCompare(b.column);
    });

    return filtered;
  }, [seenCells, currentIssueByCell, filter]);

  if (!Object.keys(seenCells).length) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="text-lg font-semibold">Manual fixes</div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          Upload a CSV and any fields needing attention will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Manual fixes</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            Fields stay listed even after you fix them (so you can keep iterating).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              filter === "errors"
                ? "border-[var(--primary)] bg-[var(--surface-2)]"
                : "border-[var(--border)] bg-transparent"
            }`}
            onClick={() => setFilter("errors")}
            type="button"
          >
            Errors
          </button>
          <button
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              filter === "warnings"
                ? "border-[var(--primary)] bg-[var(--surface-2)]"
                : "border-[var(--border)] bg-transparent"
            }`}
            onClick={() => setFilter("warnings")}
            type="button"
          >
            Warnings
          </button>
          <button
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              filter === "all"
                ? "border-[var(--primary)] bg-[var(--surface-2)]"
                : "border-[var(--border)] bg-transparent"
            }`}
            onClick={() => setFilter("all")}
            type="button"
          >
            All
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Row</th>
              <th className="px-4 py-3 font-semibold">Field</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Edit value</th>
              <th className="px-4 py-3 font-semibold">Message</th>
            </tr>
          </thead>

          <tbody>
            {tableRows.map((c) => {
              const row = rows[c.rowIndex] ?? {};
              const value = row[c.column] ?? "";

              const currentSev = c.currentIssue?.severity ?? null;
              const status: Severity | "fixed" =
                currentSev ? currentSev : "fixed";

              const message =
                c.currentIssue?.message ??
                "No current issue. This field stays listed because it previously had an issue.";

              return (
                <tr
                  key={c.key}
                  className="border-t border-[var(--border)] align-top"
                >
                  <td className="px-4 py-3 font-medium">
                    {c.rowIndex + 1}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium">{c.column}</div>
                    <div className="text-xs text-[var(--muted)]">
                      Ever: {c.everSeverity}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClasses(
                        status
                      )}`}
                    >
                      {status === "fixed" ? "Fixed" : status.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      className={`w-full rounded-xl border px-3 py-2 outline-none ring-0 transition focus:ring-2 ${inputClasses(
                        c.highlight
                      )} text-[var(--text)] placeholder:text-[var(--muted)]`}
                      value={value}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        onUpdateRow(c.rowIndex, { [c.column]: nextVal });
                      }}
                    />
                  </td>

                  <td className="px-4 py-3 text-[var(--muted)]">
                    {message}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-[var(--muted)]">
        Color rules: red = current error, yellow = current warning, green = fixed (previous issue).
      </div>
    </div>
  );
}
