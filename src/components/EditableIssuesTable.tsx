"use client";

import React, { useEffect, useMemo, useState } from "react";

type CsvRow = Record<string, string>;

export type CsvIssue = {
  rowIndex: number; // 0-based
  column: string;
  message: string;
  severity: "error" | "warning" | "info";
};

type Props = {
  headers: string[];
  rows: CsvRow[];
  issues: CsvIssue[];
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;
};

type FieldKey = string; // `${rowIndex}::${column}`
type SeenMap = Record<FieldKey, true>;

function keyOf(rowIndex: number, column: string) {
  return `${rowIndex}::${column}`;
}

export function EditableIssuesTable({ headers, rows, issues, onUpdateRow }: Props) {
  const [seen, setSeen] = useState<SeenMap>({});

  // Remember fields that EVER had an issue (so we can show green once fixed)
  useEffect(() => {
    if (!issues?.length) return;
    setSeen((prev) => {
      const next = { ...prev };
      for (const it of issues) {
        next[keyOf(it.rowIndex, it.column)] = true;
      }
      return next;
    });
  }, [issues]);

  const issuesByRow = useMemo(() => {
    const map = new Map<number, CsvIssue[]>();
    for (const it of issues) {
      const arr = map.get(it.rowIndex) ?? [];
      arr.push(it);
      map.set(it.rowIndex, arr);
    }
    return map;
  }, [issues]);

  const issuesByField = useMemo(() => {
    const map = new Map<string, CsvIssue[]>();
    for (const it of issues) {
      const k = keyOf(it.rowIndex, it.column);
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    return map;
  }, [issues]);

  const affectedRowIndexes = useMemo(() => {
    const set = new Set<number>();
    for (const it of issues) set.add(it.rowIndex);
    // include rows from "seen" even if currently fixed
    for (const k of Object.keys(seen)) {
      const [rowStr] = k.split("::");
      const idx = Number(rowStr);
      if (!Number.isNaN(idx)) set.add(idx);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [issues, seen]);

  const fieldStyle = (rowIndex: number, col: string) => {
    const k = keyOf(rowIndex, col);
    const current = issuesByField.get(k) ?? [];
    const hasError = current.some((x) => x.severity === "error");
    const hasWarn = current.some((x) => x.severity === "warning");
    const hadBefore = !!seen[k];

    // Priority: error > warning > fixed-green > normal
    if (hasError) {
      return "border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-500/30";
    }
    if (hasWarn) {
      return "border-yellow-500 bg-yellow-500/10 focus:ring-2 focus:ring-yellow-500/30";
    }
    if (hadBefore) {
      return "border-green-500 bg-green-500/10 focus:ring-2 focus:ring-green-500/30";
    }
    return "border-[var(--border)] bg-transparent focus:ring-2 focus:ring-[var(--border)]";
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-2 text-lg font-semibold text-[var(--text)]">Manual fixes</div>
      <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">
        Edit values directly. Fields highlight red (error), yellow (warning), green (fixed).
      </div>

      {!affectedRowIndexes.length ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] p-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          No manual fixes needed.
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {affectedRowIndexes.map((rowIndex) => {
          const row = rows[rowIndex] ?? {};
          const rowIssues = issuesByRow.get(rowIndex) ?? [];

          return (
            <div key={rowIndex} className="rounded-2xl border border-[var(--border)] bg-[color:rgba(var(--bg-rgb),0.18)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--text)]">Row {rowIndex + 1}</div>
                <div className="text-xs text-[color:rgba(var(--muted-rgb),1)]">
                  {rowIssues.filter((x) => x.severity === "error").length} errors •{" "}
                  {rowIssues.filter((x) => x.severity === "warning").length} warnings
                </div>
              </div>

              {rowIssues.length ? (
                <div className="mb-4 space-y-2">
                  {rowIssues.slice(0, 6).map((it, idx) => (
                    <div key={idx} className="text-sm text-[var(--text)]">
                      <span className="font-semibold">{it.column}:</span>{" "}
                      <span className="text-[color:rgba(var(--muted-rgb),1)]">{it.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                  No current issues on this row. It stays visible because it previously had an issue.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {headers.map((col) => {
                  const value = row[col] ?? "";
                  return (
                    <label key={col} className="block">
                      <div className="mb-1 text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">{col}</div>
                      <input
                        value={value}
                        onChange={(e) => onUpdateRow(rowIndex, { [col]: e.target.value })}
                        className={[
                          "w-full rounded-xl border px-3 py-2 text-sm text-[var(--text)] outline-none",
                          fieldStyle(rowIndex, col),
                        ].join(" ")}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
