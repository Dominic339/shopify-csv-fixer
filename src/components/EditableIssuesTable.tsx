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

  // Rows that currently have blocking errors
  const errorRows = useMemo(() => {
    return Array.from(
      new Set(
        issues
          .filter((i) => i.severity === "error" && typeof i.row === "number")
          .map((i) => (i.row as number) - 1)
      )
    ).filter((i) => i >= 0 && i < rows.length);
  }, [issues, rows.length]);

  // --- Sticky / pinned rows ---
  const [pinnedRows, setPinnedRows] = useState<PinnedRow[]>([]);

  // When new errors appear, automatically pin those rows (so they persist)
  useEffect(() => {
    if (errorRows.length === 0) return;
    setPinnedRows((prev) => {
      const seen = new Set(prev.map((p) => p.rowIndex));
      const next = [...prev];
      for (const ri of errorRows) {
        if (!seen.has(ri)) next.push({ rowIndex: ri });
      }
      return next;
    });
  }, [errorRows]);

  // The table should show:
  // - any currently errored rows
  // - plus any pinned rows (even if resolved now)
  const rowsToShow = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];

    for (const i of errorRows) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }

    for (const p of pinnedRows) {
      if (p.rowIndex >= 0 && p.rowIndex < rows.length && !seen.has(p.rowIndex)) {
        seen.add(p.rowIndex);
        out.push(p.rowIndex);
      }
    }

    out.sort((a, b) => a - b);
    return out;
  }, [errorRows, pinnedRows, rows.length]);

  if (rowsToShow.length === 0) return null;

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
    return issues.some(
      (i) => i.severity === "error" && i.row === oneBased && i.column === col
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Fix errors here</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Rows stay visible while you work. “Resolved” rows will remain until you export or upload a new file.
          </p>
        </div>

        <div className="text-xs text-[var(--muted)]">
          Showing <span className="font-semibold">{Math.min(rowsToShow.length, 25)}</span> rows
          {rowsToShow.length > 25 ? " (first 25)" : ""}.
        </div>
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)]">
        {/* Compact text to reduce width */}
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[var(--surface-2)]">
            <tr className="h-10">
              <th className="sticky left-0 z-10 bg-[var(--surface-2)] px-2 py-2 font-semibold">
                Row
              </th>
              <th className="sticky left-[52px] z-10 bg-[var(--surface-2)] px-2 py-2 font-semibold">
                Status
              </th>

              {editableCols.map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-2 font-semibold">
                  {h}
                </th>
              ))}

              <th className="px-2 py-2 align-middle whitespace-nowrap font-semibold leading-none">
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
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-[var(--surface)] px-2 py-2 text-[var(--muted)]">
                    {idx + 1}
                  </td>

                  {/* Sticky Status */}
                  <td className="sticky left-[52px] z-10 whitespace-nowrap bg-[var(--surface)] px-2 py-2">
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
                    const errStyle =
                      "border border-red-400 bg-red-50/10 ring-2 ring-red-500/30";

                    return (
                      <td key={col} className="px-2 py-2">
                        <input
                          className={`${baseInput} ${hasErr ? errStyle : okStyle}`}
                          value={(r[col] ?? "") as string}
                          placeholder={col}
                          onFocus={() => {
                            // Pin row as soon as user interacts with it
                            setPinnedRows((prev) => {
                              if (prev.some((p) => p.rowIndex === idx)) return prev;
                              return [...prev, { rowIndex: idx }];
                            });
                          }}
                          onChange={(e) => {
                            // also pin on change (extra safety)
                            setPinnedRows((prev) => {
                              if (prev.some((p) => p.rowIndex === idx)) return prev;
                              return [...prev, { rowIndex: idx }];
                            });

                            onUpdateRow(idx, { [col]: e.target.value });
                          }}
                        />
                      </td>
                    );
                  })}

                  {/* Sticky Notes */}
                  <td className="sticky right-0 z-10 max-w-[420px] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--muted)]">
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
                            <p className="font-semibold text-amber-200">Warnings</p>
                            <ul className="list-disc pl-5 text-amber-100">
                              {warnings.map((it, n) => (
                                <li key={`w-${n}`}>{it.message}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {info.length > 0 ? (
                          <div>
                            <p className="font-semibold text-sky-200">Info</p>
                            <ul className="list-disc pl-5 text-sky-100">
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
        Tip: Fix errors first. Warnings/info won’t block export (unless your export logic treats them as blocking).
      </p>
    </div>
  );
}
