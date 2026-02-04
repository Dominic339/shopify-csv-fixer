import type { CsvFixResult, CsvRow, CsvIssue, CsvFormat } from "./types";

export function applyFormatToParsedCsv(headers: string[], rows: CsvRow[], format: CsvFormat): CsvFixResult {
  return format.apply(headers, rows);
}

// Safe general cleanup used by multiple formats
export function normalizeRowsSafe(headers: string[], rows: CsvRow[]) {
  const fixesApplied: string[] = [];
  const fixedRows: CsvRow[] = rows.map((r) => {
    const out: CsvRow = {};
    for (const h of headers) {
      const v = r?.[h];
      out[h] = typeof v === "string" ? v : v == null ? "" : String(v);
    }
    return out;
  });

  // Trim whitespace everywhere (safe default)
  let trimmedCount = 0;
  for (const r of fixedRows) {
    for (const h of headers) {
      const before = r[h] ?? "";
      const after = before.trim();
      if (after !== before) {
        r[h] = after;
        trimmedCount++;
      }
    }
  }
  if (trimmedCount > 0) fixesApplied.push("Trimmed whitespace in cells");

  const issues: CsvIssue[] = [];
  return { fixedHeaders: headers, fixedRows, issues, fixesApplied };
}
