import type { CsvFormat, CsvRow } from "../types";

export const generalCsvFormat: CsvFormat = {
  id: "general_csv",
  name: "General CSV",
  description: "Light cleanup and a clean export. No platform-specific rules.",
  category: "General",
  source: "builtin",
  apply: (headers: string[], rows: CsvRow[]) => {
    return {
      fixedHeaders: headers,
      fixedRows: rows,
      issues: [],
      fixesApplied: [],
    };
  },
};
