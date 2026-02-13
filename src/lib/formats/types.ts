export type CsvIssue = {
  rowIndex: number; // 0-based
  column: string;
  message: string;
  severity: "error" | "warning" | "info";

  // Optional structured metadata for richer UX (tooltips, scoring, fix-all)
  // Backwards compatible: existing code can ignore these.
  code?: string;
  suggestion?: string;
};

export type CsvFixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: CsvIssue[];
  fixesApplied: string[];
};

export type CsvFormat = {
  id: string;
  name: string;
  description: string;
  apply: (headers: string[], rows: CsvRow[]) => CsvFixResult;
};

export type CsvRow = Record<string, string>;
