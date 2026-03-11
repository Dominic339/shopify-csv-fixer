// src/lib/mergeCsv.ts
// CSV merging utilities: append and deduplicate two CSV files.

import type { Plan } from "@/lib/quota";

export type CsvRow = Record<string, string>;

export type MergeMode = "append" | "dedupe";
export type ConflictRule = "keep_first" | "keep_second" | "prefer_nonempty";

export type MergeOptions = {
  mode: MergeMode;
  dedupeKey?: string;
  conflictRule?: ConflictRule;
  plan?: Plan;
};

export type MergeResult = {
  headers: string[];
  rows: CsvRow[];
  rowsA: number;
  rowsB: number;
  duplicatesFound: number;
  rowsOutput: number;
  warnings: string[];
  truncated: boolean;
};

// ---------------------------------------------------------------------------
// Row limits by plan
// ---------------------------------------------------------------------------

export function getMergeRowLimit(plan: Plan = "free"): number | null {
  if (plan === "advanced") return null;
  if (plan === "basic") return 2000;
  return 200;
}

// ---------------------------------------------------------------------------
// Core merge logic
// ---------------------------------------------------------------------------

/**
 * Original simple merge (kept for backwards compatibility).
 */
export function mergeCsvFiles(
  headers1: string[],
  rows1: CsvRow[],
  headers2: string[],
  rows2: CsvRow[]
) {
  const allHeaders = Array.from(new Set([...headers1, ...headers2]));

  function normalizeRows(rows: CsvRow[]): CsvRow[] {
    return rows.map((r) => {
      const obj: CsvRow = {};
      for (const h of allHeaders) {
        obj[h] = r[h] ?? "";
      }
      return obj;
    });
  }

  return {
    headers: allHeaders,
    rows: [...normalizeRows(rows1), ...normalizeRows(rows2)],
  };
}

/**
 * Full merge with optional deduplication and conflict handling.
 */
export function mergeCsvFilesAdvanced(
  headers1: string[],
  rows1: CsvRow[],
  headers2: string[],
  rows2: CsvRow[],
  options: MergeOptions = { mode: "append" }
): MergeResult {
  const { mode, dedupeKey, conflictRule = "keep_first", plan = "free" } = options;
  const warnings: string[] = [];

  // Detect header mismatches
  const setA = new Set(headers1);
  const setB = new Set(headers2);
  const onlyInA = headers1.filter((h) => !setB.has(h));
  const onlyInB = headers2.filter((h) => !setA.has(h));

  if (onlyInA.length > 0 || onlyInB.length > 0) {
    const parts: string[] = [];
    if (onlyInA.length > 0) parts.push(`only in file A: ${onlyInA.slice(0, 5).join(", ")}`);
    if (onlyInB.length > 0) parts.push(`only in file B: ${onlyInB.slice(0, 5).join(", ")}`);
    warnings.push(`Headers differ between files (${parts.join("; ")}). Missing columns will be filled with empty values.`);
  }

  const allHeaders = Array.from(new Set([...headers1, ...headers2]));

  // Normalize rows to the union of headers
  function normalizeRow(row: CsvRow): CsvRow {
    const out: CsvRow = {};
    for (const h of allHeaders) {
      out[h] = row[h] ?? "";
    }
    return out;
  }

  const normA = rows1.map(normalizeRow);
  const normB = rows2.map(normalizeRow);

  // Apply row limit
  const totalInputRows = normA.length + normB.length;
  const limit = getMergeRowLimit(plan);
  let truncated = false;

  let workingA = normA;
  let workingB = normB;

  if (limit !== null && totalInputRows > limit) {
    truncated = true;
    warnings.push(
      `Total input rows (${totalInputRows}) exceeds your plan limit (${limit}). Only the first ${limit} combined rows were processed. Upgrade to process larger files.`
    );
    // Take proportional slices
    const ratioA = normA.length / totalInputRows;
    const limitA = Math.max(1, Math.round(limit * ratioA));
    const limitB = limit - limitA;
    workingA = normA.slice(0, limitA);
    workingB = normB.slice(0, limitB);
  }

  if (mode === "append") {
    const merged = [...workingA, ...workingB];
    return {
      headers: allHeaders,
      rows: merged,
      rowsA: workingA.length,
      rowsB: workingB.length,
      duplicatesFound: 0,
      rowsOutput: merged.length,
      warnings,
      truncated,
    };
  }

  // Dedupe mode
  if (!dedupeKey) {
    warnings.push("No dedupe key specified; falling back to append mode.");
    const merged = [...workingA, ...workingB];
    return {
      headers: allHeaders,
      rows: merged,
      rowsA: workingA.length,
      rowsB: workingB.length,
      duplicatesFound: 0,
      rowsOutput: merged.length,
      warnings,
      truncated,
    };
  }

  if (!allHeaders.includes(dedupeKey)) {
    warnings.push(
      `Dedupe key "${dedupeKey}" not found in either file. Falling back to append mode.`
    );
    const merged = [...workingA, ...workingB];
    return {
      headers: allHeaders,
      rows: merged,
      rowsA: workingA.length,
      rowsB: workingB.length,
      duplicatesFound: 0,
      rowsOutput: merged.length,
      warnings,
      truncated,
    };
  }

  // Build a map from key value → row for file A
  const mapA = new Map<string, CsvRow>();
  for (const row of workingA) {
    const keyVal = (row[dedupeKey] ?? "").trim();
    if (keyVal) mapA.set(keyVal, row);
  }

  let duplicatesFound = 0;
  const resultMap = new Map<string, CsvRow>(mapA);

  for (const rowB of workingB) {
    const keyVal = (rowB[dedupeKey] ?? "").trim();
    if (!keyVal) {
      // No key value — always include
      resultMap.set(`__nokey__${Math.random()}`, rowB);
      continue;
    }

    const existing = resultMap.get(keyVal);

    if (!existing) {
      resultMap.set(keyVal, rowB);
      continue;
    }

    // Duplicate found
    duplicatesFound++;

    if (conflictRule === "keep_second") {
      resultMap.set(keyVal, rowB);
    } else if (conflictRule === "prefer_nonempty") {
      const merged: CsvRow = {};
      for (const h of allHeaders) {
        const va = (existing[h] ?? "").trim();
        const vb = (rowB[h] ?? "").trim();
        merged[h] = va !== "" ? va : vb;
      }
      resultMap.set(keyVal, merged);
    }
    // keep_first: leave existing unchanged
  }

  const outputRows = Array.from(resultMap.values());

  return {
    headers: allHeaders,
    rows: outputRows,
    rowsA: workingA.length,
    rowsB: workingB.length,
    duplicatesFound,
    rowsOutput: outputRows.length,
    warnings,
    truncated,
  };
}
