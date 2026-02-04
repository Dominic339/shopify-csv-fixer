export type CsvRow = Record<string, string>;

export type CsvIssue = {
  rowIndex: number; // 0-based
  column: string;
  message: string;
  severity: "error" | "warning" | "info";
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
  category: string;
  source: "builtin" | "user";
  apply: (headers: string[], rows: CsvRow[]) => CsvFixResult;
};
