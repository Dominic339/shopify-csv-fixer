// src/lib/csvInspector.ts
// Free CSV inspection/analysis tool — no plan gating. Pure analysis: never modifies the data.
// Returns codes and numbers only; the page turns them into (translated) text.

export type InspectorInconsistentRow = {
  row: number; // 1-based data row number (header excluded)
  expected: number;
  found: number;
};

export type EncodingHint = "bom" | "replacement" | "mojibake" | "cp1252";

export type DetectedPlatform =
  | "shopify_products"
  | "woocommerce_products"
  | "etsy_listings"
  | "ebay_listings"
  | "amazon_inventory_loader";

export type InspectorResult = {
  rowCount: number;
  columnCount: number;
  delimiterGuess: string;
  duplicateHeaders: string[];
  /** Header cells that are empty. 1-based column numbers. */
  emptyHeaderColumns: number[];
  /** Headers with spaces at the start or end (many importers won't match them). */
  paddedHeaders: string[];
  blankRows: number[]; // 1-based, capped at BLANK_ROWS_CAP
  blankRowCount: number;
  emptyColumns: string[];
  inconsistentColumnCounts: InspectorInconsistentRow[]; // capped at INCONSISTENT_CAP
  inconsistentRowCount: number;
  /** A quote was opened and never closed, so the rest of the file was read as one cell. */
  unclosedQuote: boolean;
  suspiciousEncodingHints: EncodingHint[];
  /** Which platform's export this looks like, if any. */
  detectedPlatform: DetectedPlatform | null;
};

export const BLANK_ROWS_CAP = 50;
export const INCONSISTENT_CAP = 20;
const DELIMITERS = [",", ";", "\t", "|"] as const;

/** Count each candidate delimiter in the first record, ignoring quoted text. */
function guessDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  let inQuote = false;
  for (let i = 0; i < text.length && i < 64 * 1024; i++) {
    const ch = text[i];
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && (ch === "\n" || ch === "\r")) break;
    else if (!inQuote && ch in counts) counts[ch]++;
  }
  let best = ",";
  for (const d of DELIMITERS) if (counts[d] > counts[best]) best = d;
  return best;
}

/** RFC 4180 parse: quoted cells may contain delimiters, doubled quotes and line breaks. */
function parseRecords(text: string, delim: string): { records: string[][]; unclosedQuote: boolean } {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // Last record (no trailing newline). A file ending in a newline leaves nothing here.
  if (cell !== "" || row.length > 0 || inQuote) {
    row.push(cell);
    records.push(row);
  }
  return { records, unclosedQuote: inQuote };
}

function detectEncodingHints(text: string): EncodingHint[] {
  const hints: EncodingHint[] = [];
  if (text.charCodeAt(0) === 0xfeff) hints.push("bom");
  if (text.includes("�")) hints.push("replacement");
  // UTF-8 read as Latin-1/Windows-1252: "Ã©" instead of "é", "â€™" instead of "’".
  if (/Ã[\u0080-¿]|â€[\u0080-¿™œ\u009d]/.test(text)) hints.push("mojibake");
  if (/[\u0080-\u009f]/.test(text)) hints.push("cp1252");
  return hints;
}

/** Guess which platform exported the file from its headers. */
export function detectPlatform(headers: string[]): DetectedPlatform | null {
  const h = new Set(headers.map((x) => x.trim().toLowerCase()));
  const has = (...names: string[]) => names.every((n) => h.has(n));

  if (headers.some((x) => /^\*?action\(/i.test(x.trim()))) return "ebay_listings";
  if (has("sku", "product-id", "product-id-type")) return "amazon_inventory_loader";
  if ((h.has("handle") || h.has("url handle")) && (h.has("title") || h.has("option1 name"))) return "shopify_products";
  if (has("type", "sku") && (h.has("regular price") || h.has("parent") || h.has("published"))) return "woocommerce_products";
  if (has("title", "description", "price", "quantity") && (h.has("tags") || h.has("image1") || h.has("materials"))) {
    return "etsy_listings";
  }
  return null;
}

const EMPTY: Omit<InspectorResult, "delimiterGuess" | "suspiciousEncodingHints"> = {
  rowCount: 0,
  columnCount: 0,
  duplicateHeaders: [],
  emptyHeaderColumns: [],
  paddedHeaders: [],
  blankRows: [],
  blankRowCount: 0,
  emptyColumns: [],
  inconsistentColumnCounts: [],
  inconsistentRowCount: 0,
  unclosedQuote: false,
  detectedPlatform: null,
};

/** Inspect raw CSV text and return analysis results. */
export function inspectCsv(rawText: string): InspectorResult {
  const encodingHints = rawText ? detectEncodingHints(rawText) : [];
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const delimiterGuess = guessDelimiter(text);

  if (!text.trim()) return { ...EMPTY, delimiterGuess, suspiciousEncodingHints: encodingHints };

  const { records, unclosedQuote } = parseRecords(text, delimiterGuess);
  const rawHeaders = records[0] ?? [];
  const headers = rawHeaders.map((x) => x.trim());
  const columnCount = headers.length;
  const dataRows = records.slice(1);
  const rowCount = dataRows.length;

  // Duplicate headers (case-insensitive), keeping the first spelling.
  const seen = new Map<string, number>();
  for (const name of headers) {
    if (!name) continue;
    const key = name.toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateHeaders = [...seen.entries()]
    .filter(([, n]) => n > 1)
    .map(([key]) => headers.find((x) => x.toLowerCase() === key) ?? key);

  const emptyHeaderColumns = headers.flatMap((name, i) => (name ? [] : [i + 1]));
  const paddedHeaders = rawHeaders.filter((x) => x.trim() && x !== x.trim()).map((x) => x.trim());

  const blankRows: number[] = [];
  const inconsistent: InspectorInconsistentRow[] = [];
  const filled = new Array<boolean>(columnCount).fill(false);

  dataRows.forEach((cells, i) => {
    const rowNum = i + 1;
    if (cells.every((c) => c.trim() === "")) {
      blankRows.push(rowNum);
      return;
    }
    if (cells.length !== columnCount) inconsistent.push({ row: rowNum, expected: columnCount, found: cells.length });
    for (let c = 0; c < columnCount; c++) if (!filled[c] && (cells[c] ?? "").trim() !== "") filled[c] = true;
  });

  const emptyColumns =
    rowCount - blankRows.length > 0
      ? headers.flatMap((name, c) => (filled[c] ? [] : [name || `Column ${c + 1}`]))
      : [];

  return {
    rowCount,
    columnCount,
    delimiterGuess,
    duplicateHeaders,
    emptyHeaderColumns,
    paddedHeaders,
    blankRows: blankRows.slice(0, BLANK_ROWS_CAP),
    blankRowCount: blankRows.length,
    emptyColumns,
    inconsistentColumnCounts: inconsistent.slice(0, INCONSISTENT_CAP),
    inconsistentRowCount: inconsistent.length,
    unclosedQuote,
    suspiciousEncodingHints: encodingHints,
    detectedPlatform: detectPlatform(headers),
  };
}
