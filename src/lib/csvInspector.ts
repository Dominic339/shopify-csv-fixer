// src/lib/csvInspector.ts
// Free CSV inspection/analysis tool — no plan gating.

export type InspectorInconsistentRow = {
  row: number; // 1-based row number (data rows, not header)
  expected: number;
  found: number;
};

export type InspectorResult = {
  rowCount: number;
  columnCount: number;
  delimiterGuess: string;
  duplicateHeaders: string[];
  blankRows: number[]; // 1-based row numbers
  emptyColumns: string[];
  inconsistentColumnCounts: InspectorInconsistentRow[];
  suspiciousEncodingHints: string[];
  warnings: string[];
};

/**
 * Sniff the most likely delimiter from the raw CSV text.
 */
function guessDelimiter(text: string): string {
  const sample = text.slice(0, 4096);
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  for (const ch of sample) {
    if (ch in counts) counts[ch]++;
  }
  let best = ",";
  let bestCount = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  }
  return best;
}

/**
 * Split a CSV row respecting basic quoting (double quotes).
 * Not a full RFC 4180 parser — good enough for delimiter counting.
 */
function splitRow(line: string, delim: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === delim && !inQuote) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

/**
 * Heuristic check for suspicious encoding artifacts.
 */
function detectEncodingHints(text: string): string[] {
  const hints: string[] = [];
  // BOM
  if (text.charCodeAt(0) === 0xfeff) {
    hints.push("UTF-8 BOM detected at start of file — may cause issues in some tools.");
  }
  // Replacement character (U+FFFD)
  if (text.includes("\ufffd")) {
    hints.push("Unicode replacement character (\uFFFD) found — file may have encoding issues.");
  }
  // Common mojibake patterns (e.g., Ã©, Ã¨ from latin-1 as utf-8)
  if (/Ã[\u00c0-\u00ff]/.test(text)) {
    hints.push("Possible mojibake detected (e.g., 'Ã©' instead of 'é') — file may have been saved with wrong encoding.");
  }
  // Windows-1252 smart quotes encoded oddly
  if (/[\x80-\x9F]/.test(text)) {
    hints.push("Windows-1252 control-range characters detected — file may not be valid UTF-8.");
  }
  return hints;
}

/**
 * Inspect a raw CSV text and return analysis results.
 * This is pure analysis — it never modifies the data.
 */
export function inspectCsv(rawText: string): InspectorResult {
  const warnings: string[] = [];

  if (!rawText || !rawText.trim()) {
    return {
      rowCount: 0,
      columnCount: 0,
      delimiterGuess: ",",
      duplicateHeaders: [],
      blankRows: [],
      emptyColumns: [],
      inconsistentColumnCounts: [],
      suspiciousEncodingHints: [],
      warnings: ["File appears to be empty."],
    };
  }

  const delimiterGuess = guessDelimiter(rawText);

  // Split lines (handle \r\n and \n)
  const allLines = rawText.split(/\r?\n/);

  // Remove at most ONE trailing empty line (the final newline artifact common in CSV files).
  // Do not strip more, as multiple trailing empty lines should be reported as blank rows.
  if (allLines.length > 0 && allLines[allLines.length - 1]?.trim() === "") {
    allLines.pop();
  }

  if (allLines.length === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      delimiterGuess,
      duplicateHeaders: [],
      blankRows: [],
      emptyColumns: [],
      inconsistentColumnCounts: [],
      suspiciousEncodingHints: detectEncodingHints(rawText),
      warnings: ["File appears to be empty after removing blank lines."],
    };
  }

  // Parse header row
  const headerLine = allLines[0] ?? "";
  const rawHeaders = splitRow(headerLine, delimiterGuess).map((h) => h.trim());
  const columnCount = rawHeaders.length;

  // Detect duplicate headers
  const headerCounts = new Map<string, number>();
  for (const h of rawHeaders) {
    const lower = h.toLowerCase();
    headerCounts.set(lower, (headerCounts.get(lower) ?? 0) + 1);
  }
  const duplicateHeaders: string[] = [];
  for (const [h, count] of headerCounts.entries()) {
    if (count > 1) duplicateHeaders.push(rawHeaders.find((x) => x.toLowerCase() === h) ?? h);
  }

  const dataLines = allLines.slice(1);
  const rowCount = dataLines.length;

  // Detect blank rows and inconsistent column counts
  const blankRows: number[] = [];
  const inconsistentColumnCounts: InspectorInconsistentRow[] = [];

  // Track which columns are entirely empty
  const colEmptyCounts = new Array<number>(columnCount).fill(0);

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i] ?? "";
    const rowNum = i + 1; // 1-based

    if (line.trim() === "") {
      blankRows.push(rowNum);
      // Count all cells as empty for this row
      for (let c = 0; c < columnCount; c++) colEmptyCounts[c]++;
      continue;
    }

    const cells = splitRow(line, delimiterGuess);

    if (cells.length !== columnCount) {
      inconsistentColumnCounts.push({
        row: rowNum,
        expected: columnCount,
        found: cells.length,
      });
    }

    // Track empty cells per column
    for (let c = 0; c < columnCount; c++) {
      const val = (cells[c] ?? "").trim();
      if (val === "") colEmptyCounts[c]++;
    }
  }

  // Identify columns that are empty in ALL data rows (excluding blank rows)
  const nonBlankRowCount = rowCount - blankRows.length;
  const emptyColumns: string[] = [];
  if (nonBlankRowCount > 0) {
    for (let c = 0; c < columnCount; c++) {
      // A column is considered "empty" if all non-blank rows have no value in it.
      // We check: emptyCount === rowCount (i.e., every row, including blank rows, is empty)
      if (colEmptyCounts[c] === rowCount) {
        emptyColumns.push(rawHeaders[c] ?? `Column ${c + 1}`);
      }
    }
  }

  // Cap inconsistentColumnCounts for display
  const inconsistentCapped = inconsistentColumnCounts.slice(0, 20);
  if (inconsistentColumnCounts.length > 20) {
    warnings.push(
      `${inconsistentColumnCounts.length} rows have inconsistent column counts (showing first 20).`
    );
  }

  if (duplicateHeaders.length > 0) {
    warnings.push(
      `Duplicate headers found: ${duplicateHeaders.join(", ")}. This may cause data loss.`
    );
  }

  if (blankRows.length > 0) {
    warnings.push(
      `${blankRows.length} blank row(s) found.`
    );
  }

  if (emptyColumns.length > 0) {
    warnings.push(
      `${emptyColumns.length} column(s) appear completely empty.`
    );
  }

  const encodingHints = detectEncodingHints(rawText);

  return {
    rowCount,
    columnCount,
    delimiterGuess,
    duplicateHeaders,
    blankRows: blankRows.slice(0, 50), // cap display
    emptyColumns,
    inconsistentColumnCounts: inconsistentCapped,
    suspiciousEncodingHints: encodingHints,
    warnings,
  };
}
