"use client";

import React, { useMemo, useState } from "react";

/**
 * Accept BOTH shapes:
 * - CsvIssue (requires rowIndex)
 * - UiIssue (often uses row or other fields)
 *
 * We normalize to a single internal shape so AppClient can pass whatever it has.
 */

export type IssueSeverity = "error" | "warning" | "info";

export type CsvIssue = {
  rowIndex: number;
  field?: string;
  message: string;
  severity: IssueSeverity;
  // optional extras you might have
  code?: string;
  value?: string;
  suggestion?: string;
};

export type UiIssue = {
  // some versions use `row` instead of `rowIndex`
  row?: number;
  // some versions use `col` or `path` instead of `field`
  col?: string;
  path?: string;
  field?: string;

  message: string;

  // some versions use `level` instead of `severity`
  level?: IssueSeverity;
  severity?: IssueSeverity;

  // optional extras
  code?: string;
  value?: string;
  suggestion?: string;
};

type IssueLike = CsvIssue | UiIssue;

type NormalizedIssue = {
  id: string;
  rowIndex: number;
  field: string;
  severity: IssueSeverity;
  message: string;
  code?: string;
  value?: string;
  suggestion?: string;
};

function normalizeIssue(issue: IssueLike, idx: number): NormalizedIssue {
  const rowIndex =
    (issue as CsvIssue).rowIndex ??
    (issue as UiIssue).row ??
    -1;

  const severity =
    (issue as CsvIssue).severity ??
    (issue as UiIssue).severity ??
    (issue as UiIssue).level ??
    "info";

  const field =
    (issue as CsvIssue).field ??
    (issue as UiIssue).field ??
    (issue as UiIssue).col ??
    (issue as UiIssue).path ??
    "Unknown";

  const message = issue.message ?? "Issue";

  const id = `${rowIndex}:${field}:${severity}:${message}:${idx}`;

  return {
    id,
    rowIndex,
    field,
    severity,
    message,
    code: (issue as any).code,
    value: (issue as any).value,
    suggestion: (issue as any).suggestion,
  };
}

export type EditableIssuesTableProps = {
  headers: string[];
  rows: Record<string, string>[];
  issues: IssueLike[];

  /**
   * Your AppClient currently declares onUpdateRow as:
   *   (rowIndex: number, patch: Partial<CsvRow>) => void
   *
   * We accept that shape here so you don’t get another TS fight.
   */
  onUpdateRow: (rowIndex: number, patch: Record<string, string>) => void;
};

export function EditableIssuesTable({
  headers,
  rows,
  issues,
  onUpdateRow,
}: EditableIssuesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<IssueSeverity | "all">("all");

  const normalized = useMemo(() => {
    return (issues ?? []).map(normalizeIssue);
  }, [issues]);

  const issuesByRow = useMemo(() => {
    const map = new Map<number, NormalizedIssue[]>();
    for (const it of normalized) {
      if (!map.has(it.rowIndex)) map.set(it.rowIndex, []);
      map.get(it.rowIndex)!.push(it);
    }
    return map;
  }, [normalized]);

  const rowIndexesWithIssues = useMemo(() => {
    const set = new Set<number>();
    for (const it of normalized) set.add(it.rowIndex);
    return Array.from(set).filter((n) => n >= 0).sort((a, b) => a - b);
  }, [normalized]);

  const filteredRowIndexes = useMemo(() => {
    if (filter === "all") return rowIndexesWithIssues;

    return rowIndexesWithIssues.filter((ri) => {
      const list = issuesByRow.get(ri) ?? [];
      return list.some((x) => x.severity === filter);
    });
  }, [filter, rowIndexesWithIssues, issuesByRow]);

  function toggleRow(rowIndex: number) {
    setExpandedRows((p) => ({ ...p, [rowIndex]: !p[rowIndex] }));
  }

  function pillClass(sev: IssueSeverity) {
    if (sev === "error") return "bg-red-500/15 text-red-300 border-red-500/25";
    if (sev === "warning") return "bg-yellow-500/15 text-yellow-200 border-yellow-500/25";
    return "bg-blue-500/15 text-blue-200 border-blue-500/25";
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Manual fixes</div>
          <div className="text-sm text-[var(--muted)]">
            Rows that ever had an issue stay visible so you can keep iterating.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("error")}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === "error" ? "bg-red-500/15 border-red-500/25" : "border-[var(--border)]"
            }`}
          >
            Errors
          </button>
          <button
            type="button"
            onClick={() => setFilter("warning")}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === "warning" ? "bg-yellow-500/15 border-yellow-500/25" : "border-[var(--border)]"
            }`}
          >
            Warnings
          </button>
          <button
            type="button"
            onClick={() => setFilter("info")}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === "info" ? "bg-blue-500/15 border-blue-500/25" : "border-[var(--border)]"
            }`}
          >
            Info
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === "all" ? "bg-white/10" : "border-[var(--border)]"
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filteredRowIndexes.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-white/5 p-4 text-sm text-[var(--muted)]">
            No rows to show for this filter.
          </div>
        ) : null}

        {filteredRowIndexes.map((rowIndex) => {
          const row = rows[rowIndex];
          const list = (issuesByRow.get(rowIndex) ?? []).slice().sort((a, b) => {
            const order: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };
            return order[a.severity] - order[b.severity];
          });

          const isOpen = !!expandedRows[rowIndex];

          return (
            <div key={rowIndex} className="rounded-2xl border border-[var(--border)] bg-white/5">
              <button
                type="button"
                onClick={() => toggleRow(rowIndex)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="font-semibold">Row {rowIndex + 1}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {list.map((it) => (
                      <span
                        key={it.id}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${pillClass(
                          it.severity
                        )}`}
                        title={it.message}
                      >
                        {it.severity.toUpperCase()} • {it.field}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-[var(--muted)]">{isOpen ? "Hide" : "Edit"}</div>
              </button>

              {isOpen ? (
                <div className="border-t border-[var(--border)] p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {headers.map((h) => {
                      const sevForField =
                        list.find((x) => x.field === h)?.severity ??
                        list.find((x) => x.field?.toLowerCase() === h.toLowerCase())?.severity ??
                        null;

                      // IMPORTANT: this does NOT implement your red/yellow/green field coloring yet.
                      // This file is only to fix the compile error and get your build green again.
                      // We can do the per-field color system next once you confirm the correct Issue schema.
                      return (
                        <label key={h} className="block">
                          <div className="mb-1 text-xs font-semibold text-[var(--muted)]">{h}</div>
                          <input
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                            value={row?.[h] ?? ""}
                            onChange={(e) => onUpdateRow(rowIndex, { [h]: e.target.value })}
                          />
                          {sevForField ? (
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {list.find((x) => x.field === h)?.message ?? ""}
                            </div>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EditableIssuesTable;
