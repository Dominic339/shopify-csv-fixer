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

  // Optional machine-readable context for richer UI (e.g., duplicate previews).
  // Keep this flexible so individual validators can attach structured details.
  details?: Record<string, unknown>;
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

  /**
   * Optional template metadata used by preset landing pages.
   *
   * - expectedHeaders: canonical header list for the format/template
   * - exampleRow: a representative row showing typical values
   * - seo: long-form content blocks for the preset detail page
   */
  expectedHeaders?: string[];
  exampleRow?: CsvRow;
  seo?: {
    /** One or more paragraphs (plain text). */
    longDescription?: string[];
    /** Short step list describing how the fixer works. */
    howItWorks?: string[];
    /** Bullet list of common fixes this preset makes. */
    commonFixes?: string[];
    /** FAQ entries for SEO + trust. */
    faq?: Array<{ q: string; a: string }>;
  };

  apply: (headers: string[], rows: CsvRow[]) => CsvFixResult;
};
