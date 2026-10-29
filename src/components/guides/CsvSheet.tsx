// src/components/guides/CsvSheet.tsx
// A CSV code block in a guide, shown the way it looks in a spreadsheet: header row,
// numbered rows, one cell per value.

import Papa from "papaparse";

/**
 * Rows of a code block when it is plainly comma-separated data (2+ lines, same width,
 * 2+ columns), else null. Blocks with quotes stay as text: they show CSV syntax.
 */
export function parseCsvBlock(text: string): string[][] | null {
  const trimmed = text.replace(/\n+$/, "");
  const lines = trimmed.split("\n");
  if (lines.length < 2 || trimmed.includes('"') || lines.some((l) => /^\s*=/.test(l))) return null;
  const res = Papa.parse<string[]>(trimmed, { delimiter: ",", skipEmptyLines: false });
  if (res.errors.length) return null;
  const rows = res.data;
  const width = rows[0]?.length ?? 0;
  if (width < 2 || rows.some((r) => r.length !== width)) return null;
  // Prose with commas ("Note: a, b, c") would have spaces after most commas.
  const spaced = (trimmed.match(/, /g) ?? []).length;
  const commas = (trimmed.match(/,/g) ?? []).length;
  if (spaced > commas / 2) return null;
  return rows;
}

export function CsvSheet({ rows, label }: { rows: string[][]; label: string }) {
  const [header, ...body] = rows;
  return (
    <figure className="min-w-0">
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-[var(--surface-2)]">
              <th className="w-8 border-b border-r border-[var(--border)] px-2 py-1.5 text-center font-normal text-[var(--muted)]">1</th>
              {header.map((h, i) => (
                <th key={i} scope="col" className="whitespace-nowrap border-b border-r border-[var(--border)] px-3 py-1.5 text-left font-semibold text-[var(--text)] last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-b border-[var(--border)] last:border-b-0">
                <th scope="row" className="border-r border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-center font-normal text-[var(--muted)]">
                  {r + 2}
                </th>
                {row.map((cell, c) => (
                  <td key={c} className="max-w-[18rem] truncate whitespace-nowrap border-r border-[var(--border)] px-3 py-1.5 text-[var(--text)] last:border-r-0" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-1.5 text-xs text-[var(--muted)]">{label}</figcaption>
    </figure>
  );
}
