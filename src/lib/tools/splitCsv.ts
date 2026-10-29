// src/lib/tools/splitCsv.ts
// Split a CSV into several files, each with the header row. Rows that belong to the
// same product (Shopify variants share a Handle, WooCommerce variations point at a
// Parent) are never separated, because importing half a product breaks it.

import { toCsv, type CsvRow } from "@/lib/csv";

export type SplitOptions = {
  /** Most data rows per file (a product group can push a file slightly over). */
  rowsPerFile: number;
  /** Optional size cap in bytes per file, e.g. Shopify's 15 MB import limit. */
  maxBytes?: number;
  /** Column that ties rows of one product together; "" splits row by row. */
  groupBy: string;
};

export type SplitPart = { rows: CsvRow[]; csv: string; bytes: number };

/** Candidate grouping columns, most specific first. */
const GROUP_COLUMNS = ["Handle", "handle", "Parent", "parent", "Parent SKU", "parent_sku", "Parent ID", "parent_id"];

/** The column to keep product rows together by, or "" when the file has none. */
export function detectGroupColumn(headers: string[]): string {
  return GROUP_COLUMNS.find((c) => headers.includes(c)) ?? "";
}

const encoder = new TextEncoder();
const byteLength = (s: string) => encoder.encode(s).length;

/**
 * Consecutive rows with the same group value form a block. WooCommerce variations name
 * their parent's SKU or ID in "Parent", and the parent row itself has it empty, so a row
 * with an empty Parent starts a new block and its variations join it.
 */
function blocks(rows: CsvRow[], groupBy: string): CsvRow[][] {
  if (!groupBy) return rows.map((r) => [r]);
  const isParentColumn = /parent/i.test(groupBy);
  const out: CsvRow[][] = [];
  let key: string | null = null;
  for (const r of rows) {
    const v = (r[groupBy] ?? "").trim();
    const continues = isParentColumn ? v !== "" && out.length > 0 : v !== "" && v === key;
    if (continues) out[out.length - 1].push(r);
    else out.push([r]);
    if (!isParentColumn) key = v;
  }
  return out;
}

export function splitCsv(headers: string[], rows: CsvRow[], opts: SplitOptions): SplitPart[] {
  const rowsPerFile = Math.max(1, Math.floor(opts.rowsPerFile));
  const headerBytes = byteLength(toCsv(headers, [])) + 2;
  const parts: CsvRow[][] = [];
  let current: CsvRow[] = [];
  let currentBytes = headerBytes;

  for (const block of blocks(rows, opts.groupBy)) {
    const blockBytes = byteLength(toCsv(headers, block)) - headerBytes + 2;
    const tooManyRows = current.length + block.length > rowsPerFile;
    const tooBig = opts.maxBytes !== undefined && currentBytes + blockBytes > opts.maxBytes;
    if (current.length > 0 && (tooManyRows || tooBig)) {
      parts.push(current);
      current = [];
      currentBytes = headerBytes;
    }
    current.push(...block);
    currentBytes += blockBytes;
  }
  if (current.length > 0 || parts.length === 0) parts.push(current);

  return parts.map((p) => {
    const csv = toCsv(headers, p);
    return { rows: p, csv, bytes: byteLength(csv) };
  });
}
