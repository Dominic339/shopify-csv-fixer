import type { CsvFormat } from "../types";

export const generalCsvFormat: CsvFormat = {
  id: "general_csv",
  name: "General CSV",
  description: "Light cleanup and a clean export. No platform-specific rules.",
  category: "General",
  source: "builtin",
  apply: (headers, rows) => {
    // Universal cleanup is applied in the engine for ALL formats.
    // General CSV simply passes through without platform-specific rules.
    return { fixedHeaders: headers, fixedRows: rows, issues: [], fixesApplied: [] };
  },
};
