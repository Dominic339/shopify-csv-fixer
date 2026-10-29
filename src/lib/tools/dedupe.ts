// src/lib/tools/dedupe.ts
// Remove duplicate rows, either rows that are identical in every column or rows that
// share the values of chosen key columns (for example SKU).

import type { CsvRow } from "@/lib/csv";

export type DedupeOptions = {
  /** Columns that make two rows "the same"; empty means every column. */
  keys: string[];
  keep: "first" | "last";
  /** Compare ignoring case and surrounding spaces. */
  loose: boolean;
  /** Rows whose key columns are all empty are never treated as duplicates. */
  skipBlankKeys: boolean;
};

export type DedupeResult = {
  kept: CsvRow[];
  removed: CsvRow[];
  /** 1-based data row numbers of the removed rows, in file order. */
  removedRowNumbers: number[];
  /** How many distinct values had more than one row. */
  duplicateGroups: number;
};

/** Columns that are usually unique per row and make a good key. */
const KEY_HINTS = ["Variant SKU", "SKU", "sku", "ID", "id", "Item ID", "item_sku", "seller-sku", "Listing ID", "GTIN", "Barcode", "Variant Barcode", "Email"];

export function suggestKey(headers: string[]): string {
  return KEY_HINTS.find((k) => headers.includes(k)) ?? "";
}

export function dedupeRows(headers: string[], rows: CsvRow[], opts: DedupeOptions): DedupeResult {
  const cols = opts.keys.length > 0 ? opts.keys : headers;
  const norm = (v: string) => (opts.loose ? v.trim().toLowerCase() : v);
  const keyOf = (r: CsvRow) => cols.map((c) => norm(r[c] ?? "")).join("\u0000");
  const blank = (r: CsvRow) => cols.every((c) => (r[c] ?? "").trim() === "");

  // Index of the row to keep for each key.
  const winner = new Map<string, number>();
  const counts = new Map<string, number>();
  rows.forEach((r, i) => {
    if (opts.skipBlankKeys && blank(r)) return;
    const k = keyOf(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (opts.keep === "last" || !winner.has(k)) winner.set(k, i);
  });

  const kept: CsvRow[] = [];
  const removed: CsvRow[] = [];
  const removedRowNumbers: number[] = [];
  rows.forEach((r, i) => {
    if (opts.skipBlankKeys && blank(r)) return void kept.push(r);
    if (winner.get(keyOf(r)) === i) kept.push(r);
    else {
      removed.push(r);
      removedRowNumbers.push(i + 1);
    }
  });

  let duplicateGroups = 0;
  for (const n of counts.values()) if (n > 1) duplicateGroups++;
  return { kept, removed, removedRowNumbers, duplicateGroups };
}
