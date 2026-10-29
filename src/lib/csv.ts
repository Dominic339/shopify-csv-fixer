import Papa from "papaparse";

export type CsvRow = Record<string, string>;

/** A structural problem the CSV parser found, as an issue the fixer can show. */
export type ParseIssue = {
  rowIndex: number; // 0-based data row, or -1 for the whole file
  column: string;
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type ParseResult = {
  headers: string[];
  rows: CsvRow[];
  parseErrors: string[];
  parseIssues: ParseIssue[];
  /** Lines above the header that were set aside (eBay's "#INFO" lines), to write back on export. */
  preamble: string[];
};

/**
 * eBay's Seller Hub templates start with lines like "#INFO,Version=1.0.0,Template=..." above
 * the real header row. eBay needs the first of them on upload, so they are set aside rather
 * than read as the header. Excel on a Mac can put stray characters before "INFO" on the first
 * line, which breaks the upload, so those are dropped.
 */
export function splitPreamble(text: string): { preamble: string[]; body: string } {
  const preamble: string[] = [];
  let rest = text;
  for (;;) {
    const end = rest.search(/\r?\n/);
    const line = end < 0 ? rest : rest.slice(0, end);
    const cleaned = line.replace(/^[^#A-Za-z"]+/, "");
    if (!/^"?#?INFO\b/i.test(cleaned)) break;
    preamble.push(cleaned);
    if (end < 0) {
      rest = "";
      break;
    }
    rest = rest.slice(end).replace(/^\r?\n/, "");
  }
  return { preamble, body: rest };
}

/**
 * Rows are rebuilt from the header on export, so extra cells are dropped and missing ones
 * come out empty: worth a warning. Broken quoting means cells ran together: that is an error.
 */
function toParseIssue(e: Papa.ParseError): ParseIssue {
  const rowIndex = typeof e.row === "number" ? e.row : -1;
  const row = rowIndex + 1;
  const onRow = rowIndex >= 0;
  // Whole sentences per case, so each one can be translated (see src/lib/i18n/messages.ts).
  switch (e.code) {
    case "TooManyFields":
      return {
        rowIndex, column: "(file)", severity: "warning", code: "csv/too_many_fields",
        message: onRow
          ? `Row ${row} has more cells than there are headers. The extra cells are dropped on export.`
          : "A row has more cells than there are headers. The extra cells are dropped on export.",
      };
    case "TooFewFields":
      return {
        rowIndex, column: "(file)", severity: "warning", code: "csv/too_few_fields",
        message: onRow
          ? `Row ${row} has fewer cells than there are headers. The missing cells are exported empty; check the values didn't shift into the wrong columns.`
          : "A row has fewer cells than there are headers. The missing cells are exported empty; check the values didn't shift into the wrong columns.",
      };
    case "MissingQuotes":
    case "InvalidQuotes":
      return {
        rowIndex, column: "(file)", severity: "error", code: "csv/broken_quotes",
        message: onRow
          ? `Row ${row} has a quote that is never closed, so the following cells ran together. Fix the quoting in the source file and upload it again.`
          : "The file has a quote that is never closed, so the following cells ran together. Fix the quoting in the source file and upload it again.",
      };
    default:
      return {
        rowIndex, column: "(file)", severity: "error", code: "csv/parse_error",
        message: onRow ? `Row ${row} could not be read: ${e.message}` : `The file could not be read: ${e.message}`,
      };
  }
}

export function parseCsv(text: string): ParseResult {
  const parseErrors: string[] = [];
  const parseIssues: ParseIssue[] = [];

  const { preamble, body } = splitPreamble(text);
  const res = Papa.parse<Record<string, unknown>>(body, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transform: (value) => (typeof value === "string" ? value : String(value ?? "")),
  });

  if (res.errors?.length) {
    for (const e of res.errors) {
      parseErrors.push(`${e.code}: ${e.message} (row ${e.row ?? "?"})`);
      // "UndetectableDelimiter" just means a one-column file; not a problem.
      if (e.code !== "UndetectableDelimiter") parseIssues.push(toParseIssue(e));
    }
  }

  const data = (res.data ?? []).map((row) => {
    const out: CsvRow = {};
    for (const [k, v] of Object.entries(row ?? {})) {
      out[String(k)] = typeof v === "string" ? v : String(v ?? "");
    }
    return out;
  });

  const headers =
    (res.meta?.fields?.map((h) => String(h)) ?? []).filter((h) => h.trim().length > 0);

  return { headers, rows: data, parseErrors, parseIssues, preamble };
}

/**
 * Tab-delimited text, the format Amazon's upload page takes for Inventory Loader and
 * category files. Cells aren't quoted, so tabs and line breaks inside a cell become spaces.
 */
export function toTsv(headers: string[], rows: CsvRow[]): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, " ");
  return [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))].map((cells) => cells.map(clean).join("\t")).join("\r\n");
}

/**
 * Amazon formats download as tab-delimited .txt; everything else as quoted CSV, with any
 * lines that sat above the header (eBay's "#INFO" lines) put back on top.
 */
export function exportFileFor(formatId: string | null | undefined, headers: string[], rows: CsvRow[], preamble: string[] = []) {
  if (formatId?.startsWith("amazon_")) {
    return { text: toTsv(headers, rows), extension: "txt", type: "text/tab-separated-values;charset=utf-8" };
  }
  const top = preamble.length ? preamble.join("\r\n") + "\r\n" : "";
  return { text: top + toCsv(headers, rows), extension: "csv", type: "text/csv;charset=utf-8" };
}

export function toCsv(headers: string[], rows: CsvRow[]): string {
  return Papa.unparse(
    rows.map((r) => {
      const out: Record<string, string> = {};
      for (const h of headers) out[h] = r[h] ?? "";
      return out;
    }),
    { columns: headers, quotes: true, skipEmptyLines: "greedy" }
  );
}
