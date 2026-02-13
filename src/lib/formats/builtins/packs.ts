import type { CsvFixResult, CsvFormat, CsvFormatCategory, CsvRow, CsvIssue } from "../types";

type FormatSpec = {
  id: string;
  name: string;
  description: string;
  category: CsvFormatCategory;
  expectedHeaders: string[];
  requiredHeaders: string[];
  emailHeaders?: string[];
  numericHeaders?: string[];
};

function normHeader(s: string) {
  return s.trim().toLowerCase();
}

function isBlank(v: unknown) {
  return v == null || String(v).trim() === "";
}

export function buildSimpleFormat(spec: FormatSpec): CsvFormat {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    source: "builtin",

    apply: (headers: string[], rows: CsvRow[]): CsvFixResult => {
      const inHeaders = headers ?? [];
      const inRows = rows ?? [];

      const issues: CsvIssue[] = [];
      const fixesApplied: string[] = [];

      // Map expected headers to actual headers (case-insensitive match)
      const actualByNorm = new Map<string, string>();
      for (const h of inHeaders) actualByNorm.set(normHeader(h), h);

      const fixedHeaders = [...spec.expectedHeaders];

      // Build rows with exactly the expected headers
      const fixedRows: CsvRow[] = inRows.map((r) => {
        const out: CsvRow = {};
        for (const expected of spec.expectedHeaders) {
          const actual = actualByNorm.get(normHeader(expected));
          out[expected] = actual ? (r?.[actual] ?? "") : "";
        }
        return out;
      });

      // File-level: missing required columns
      for (const required of spec.requiredHeaders) {
        const actual = actualByNorm.get(normHeader(required));
        if (!actual) {
          issues.push({
            rowIndex: -1,
            column: required,
            severity: "error",
            message: `Missing required column "${required}".`,
            code: `${spec.id}/missing_required_column`,
            suggestion: `Add the "${required}" column header.`,
          });
        }
      }

      // Row-level: required field blank
      // Cap to avoid huge issue lists
      const MAX_ROW_ISSUES = 800;
      let rowIssueCount = 0;

      for (let i = 0; i < fixedRows.length && rowIssueCount < MAX_ROW_ISSUES; i++) {
        const row = fixedRows[i];

        for (const required of spec.requiredHeaders) {
          const v = row?.[required];
          if (isBlank(v)) {
            issues.push({
              rowIndex: i,
              column: required,
              severity: "error",
              message: `Required field "${required}" is blank.`,
              code: `${spec.id}/required_blank`,
              suggestion: `Fill in "${required}".`,
            });
            rowIssueCount++;
            if (rowIssueCount >= MAX_ROW_ISSUES) break;
          }
        }
      }

      // Validators: email columns
      if (spec.emailHeaders?.length) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

        for (let i = 0; i < fixedRows.length; i++) {
          for (const col of spec.emailHeaders) {
            const v = String(fixedRows[i]?.[col] ?? "").trim();
            if (!v) continue;
            if (!emailRe.test(v)) {
              issues.push({
                rowIndex: i,
                column: col,
                severity: "warning",
                message: `Invalid email format: "${v}".`,
                code: `${spec.id}/invalid_email`,
                suggestion: "Fix the email formatting (example: name@domain.com).",
              });
            }
          }
        }
      }

      // Validators: numeric columns
      if (spec.numericHeaders?.length) {
        for (let i = 0; i < fixedRows.length; i++) {
          for (const col of spec.numericHeaders) {
            const raw = String(fixedRows[i]?.[col] ?? "").trim();
            if (!raw) continue;

            const cleaned = raw.replace(/[$,]/g, "").trim();
            const n = Number(cleaned);

            if (!Number.isFinite(n)) {
              issues.push({
                rowIndex: i,
                column: col,
                severity: "warning",
                message: `Not a valid number: "${raw}".`,
                code: `${spec.id}/invalid_number`,
                suggestion: "Use a plain numeric value (no currency symbols).",
              });
            }
          }
        }
      }

      return {
        fixedHeaders,
        fixedRows,
        issues,
        fixesApplied,
      };
    },
  };
}
