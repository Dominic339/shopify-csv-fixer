export type CsvRow = Record<string, string>;

export type CsvIssue = {
  rowIndex: number; // 0-based, use -1 for file-level issues
  column: string;
  message: string;
  severity: "error" | "warning" | "info";

  code?: string;
  suggestion?: string;
};

export type CsvFixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: CsvIssue[];
  fixesApplied: string[];
};

export type CsvFormatCategory =
  | "General"
  | "Ecommerce"
  | "Marketing"
  | "CRM"
  | "Accounting"
  | "Shipping"
  | "Support";

export type CsvFormatSource = "builtin" | "user";

export type CsvFormat = {
  id: string;
  name: string;
  description: string;

  category: CsvFormatCategory;
  source: CsvFormatSource;

  apply: (headers: string[], rows: CsvRow[]) => CsvFixResult;
};
