"use client";

import { CsvRow } from "@/lib/csv";

type Issue = {
  severity: string;
  row?: number;
  column?: string;
  message: string;
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
  const errorRows = Array.from(
    new Set(issues.filter((i) => i.severity === "error" && typeof i.row === "number").map((i) => (i.row as number) - 1))
  ).filter((i) => i >= 0 && i < rows.length);

  if (errorRows.length === 0) return null;

  const editableCols = ["Handle", "Published", "Variant Price", "Variant Inventory Qty"];

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Fix errors here</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        These rows have blocking errors. Edit the fields below, then export.
      </p>

      <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Row</th>
              {editableCols.map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {errorRows.slice(0, 25).map((idx) => {
              const r = rows[idx];
              const rowIssues = issues.filter((i) => i.severity === "error" && i.row === idx + 1);
              return (
                <tr key={idx} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--muted)]">{idx + 1}</td>

                  {editableCols.map((col) => (
                    <td key={col} className="px-3 py-2">
                      <input
                        className="w-[220px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                        value={(r[col] ?? "") as string}
                        onChange={(e) => onUpdateRow(idx, { [col]: e.target.value })}
                        placeholder={col}
                      />
                    </td>
                  ))}

                  <td className="max-w-[420px] px-3 py-2 text-xs text-[var(--muted)]">
                    <ul className="list-disc pl-5">
                      {rowIssues.map((it, n) => (
                        <li key={n}>{it.message}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Showing up to 25 error rows. Fix them and re-export.
      </p>
    </div>
  );
}
