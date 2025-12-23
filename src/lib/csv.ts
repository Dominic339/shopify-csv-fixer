import Papa from "papaparse";

export type CsvRow = Record<string, string>;

export type ParseResult = {
  headers: string[];
  rows: CsvRow[];
  parseErrors: string[];
};

export function parseCsv(text: string): ParseResult {
  const parseErrors: string[] = [];

  const res = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transform: (value) => (typeof value === "string" ? value : String(value ?? "")),
  });

  if (res.errors?.length) {
    for (const e of res.errors) {
      parseErrors.push(`${e.code}: ${e.message} (row ${e.row ?? "?"})`);
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

  return { headers, rows: data, parseErrors };
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
