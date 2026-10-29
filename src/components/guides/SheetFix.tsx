// src/components/guides/SheetFix.tsx
// The before/after mini spreadsheet on issue guides: the broken rows with the problem
// cells in red, then the same rows fixed with the changed cells in green.

import type { SheetExample } from "@/lib/guides/sheetExamples";

type Labels = { title: string; before: string; after: string; empty: string };

type Cell = { value: string; changed: boolean };

/**
 * Lines the two tables up by column name and, when the fix adds rows above, by
 * counting from the bottom, then marks every cell whose value differs.
 */
function diff(ex: SheetExample) {
  const colsAfter = ex.colsAfter ?? ex.cols;
  const offset = Math.max(0, ex.after.length - ex.before.length);
  const valueAt = (rows: string[][], cols: string[], r: number, col: string) => {
    const i = cols.indexOf(col);
    return i < 0 || !rows[r] ? undefined : rows[r][i];
  };
  const flagged = new Set((ex.flag ?? []).map(([r, c]) => `${r}:${c}`));
  const before: Cell[][] = ex.before.map((row, r) =>
    row.map((value, c) => ({ value, changed: flagged.has(`${r}:${c}`) || valueAt(ex.after, colsAfter, r + offset, ex.cols[c]) !== value })),
  );
  const after: Cell[][] = ex.after.map((row, r) =>
    row.map((value, c) => ({ value, changed: r < offset || valueAt(ex.before, ex.cols, r - offset, colsAfter[c]) !== value })),
  );
  const newCols = new Set(colsAfter.filter((c) => !ex.cols.includes(c)));
  // On phones, columns that never change (other than the first, which names the row)
  // are hidden so the problem column stays on screen.
  const changing = (cols: string[], rows: Cell[][]) => new Set(cols.filter((_, c) => rows.some((row) => row[c]?.changed)));
  const keep = new Set([...changing(ex.cols, before), ...changing(colsAfter, after), ...newCols, ex.cols[0], colsAfter[0]]);
  return { before, after, colsAfter, newCols, keep };
}

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path d="M5 10.5l3.2 3.2L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
    </svg>
  );
}

function Sheet({
  cols,
  rows,
  ok,
  label,
  empty,
  keep,
  newCols,
}: {
  cols: string[];
  rows: Cell[][];
  ok: boolean;
  label: string;
  empty: string;
  keep: Set<string>;
  newCols?: Set<string>;
}) {
  const narrow = (c: string) => (keep.has(c) ? "" : "hidden sm:table-cell");
  const hit = ok
    ? "bg-green-50 text-green-900 ring-1 ring-inset ring-green-300 dark:bg-green-900/25 dark:text-green-200 dark:ring-green-800"
    : "bg-red-50 text-red-900 ring-1 ring-inset ring-red-300 dark:bg-red-900/25 dark:text-red-200 dark:ring-red-800";
  return (
    <figure className="min-w-0">
      <figcaption className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
        <Mark ok={ok} />
        {label}
      </figcaption>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-[var(--surface-2)]">
              <th className="w-8 border-b border-r border-[var(--border)] px-2 py-1.5 text-center font-normal text-[var(--muted)]" aria-hidden="true" />
              {cols.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className={`whitespace-nowrap border-b border-r border-[var(--border)] px-3 py-1.5 text-left font-semibold text-[var(--text)] last:border-r-0 ${narrow(c)} ${newCols?.has(c) ? hit : ""}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-[var(--border)] last:border-b-0">
                <th scope="row" className="border-r border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-center font-normal text-[var(--muted)]">
                  {r + 2}
                </th>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`max-w-[16rem] truncate border-r border-[var(--border)] px-3 py-1.5 last:border-r-0 ${narrow(cols[c])} ${cell.changed ? hit : "text-[var(--text)]"}`}
                    title={cell.value}
                  >
                    {cell.value || (cell.changed ? <span className="italic opacity-70">{empty}</span> : "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function SheetFix({ example, labels }: { example: SheetExample; labels: Labels }) {
  const { before, after, colsAfter, newCols, keep } = diff(example);
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text)]">{labels.title}</h2>
      <div className="mt-4 grid gap-3">
        <Sheet cols={example.cols} rows={before} ok={false} label={labels.before} empty={labels.empty} keep={keep} />
        <div className="flex justify-center text-[var(--muted)]" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <Sheet cols={colsAfter} rows={after} ok label={labels.after} empty={labels.empty} keep={keep} newCols={newCols} />
      </div>
    </div>
  );
}
