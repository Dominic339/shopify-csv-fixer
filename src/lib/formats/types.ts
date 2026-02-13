export type CsvRow = Record<string, string>;

export type CsvIssue = {
  rowIndex: number; // 0-based, use -1 for file-level issues
  column: string;
  message: string;
  severity: "error" | "warning" | "info";

  // Optional structured metadata used by the Shopify optimizer + tooltips/scoring.
  // Safe: existing UI/logic can ignore these.
  code?: string;
  suggestion?: string;
};

export type CsvFixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: CsvIssue[];
  fixesApplied: string[];
};

// Categories are useful for preset directory grouping + SEO clusters.
export type CsvFormatCategory =
  | "General"
  | "Ecommerce"
  | "Marketing"
  | "CRM"
  | "Accounting"
  | "Shipping"
  | "Support";

// Keep compatibility with your older "user" label.
// (Some parts of the app may still call this "user" rather than "custom".)
export type CsvFormatSource = "builtin" | "user";

export type CsvFormat = {
  id: string;
  name: string;
  description: string;
  category: CsvFormatCategory;
  source: CsvFormatSource;

  apply: (headers: string[], rows: CsvRow[]) => CsvFixResult;
};
