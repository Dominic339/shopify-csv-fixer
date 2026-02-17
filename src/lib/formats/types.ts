// src/lib/formats/types.ts

export type CsvRow = Record<string, string>;

export type CsvIssue = {
  rowIndex: number; // 0-based, use -1 for file-level issues
  column: string;
  message: string;
  severity: "error" | "warning" | "info";

  // Optional structured metadata used by:
  // - tooltips (plain English explanations)
  // - scoring category mapping
  // - fix-all eligibility
  // Safe: older code can ignore these.
  code?: string;
  suggestion?: string;
};

export type CsvFixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: CsvIssue[];
  fixesApplied: string[];
};

/**
 * Categories are used for:
 * - Grouping presets in UI
 * - SEO cluster pages (Ecommerce/CRM/etc.)
 * - Future pricing gates by category
 *
 * "Custom" is for user-defined formats and should be excluded from SEO preset landing generation.
 */
export type CsvFormatCategory =
  | "General"
  | "Ecommerce"
  | "Marketing"
  | "CRM"
  | "Accounting"
  | "Shipping"
  | "Support"
  | "Custom";

export type CsvFormatSource = "builtin" | "user";

export type CsvFormat = {
  id: string;
  name: string;
  description: string;

  category: CsvFormatCategory;
  source: CsvFormatSource;

  apply: (headers: string[], rows: CsvRow[]) => CsvFixResult;
};
