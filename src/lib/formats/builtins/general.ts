import type { CsvFormat } from "../types";
import { normalizeRowsSafe } from "../engine";

export const generalCsvFormat: CsvFormat = {
  id: "general_csv",
  name: "General CSV",
  description: "Light cleanup and a clean export. No platform-specific rules.",
  category: "General",
  source: "builtin",
  apply: (headers, rows) => {
    // Keep exactly what was uploaded, just normalize and trim safely
    return normalizeRowsSafe(headers, rows);
  },
};
