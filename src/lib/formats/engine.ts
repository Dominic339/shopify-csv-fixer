// src/lib/formats/engine.ts
import type { CsvFixResult, CsvRow, CsvFormat } from "./types";
import { shapeShopifyOutput } from "@/lib/shopifyOutput";

export function applyFormatToParsedCsv(headers: string[], rows: CsvRow[], format: CsvFormat): CsvFixResult {
  const res = format.apply(headers, rows);

  // Shopify: emit the official column names/order, but only the columns this file uses.
  if (format.id === "shopify_products") {
    const out = shapeShopifyOutput(headers, res.fixedHeaders ?? headers, res.fixedRows ?? rows);
    return {
      ...res,
      fixedHeaders: out.headers,
      fixedRows: out.rows,
      issues: (res.issues ?? []).map((it) => ({ ...it, column: out.renameColumn(it.column) })),
    };
  }

  return res;
}

// Safe general cleanup used by multiple formats
export function normalizeRowsSafe(headers: string[], rows: CsvRow[]) {
  const fixesApplied: string[] = [];
  const fixedRows: CsvRow[] = rows.map((r) => {
    const out: CsvRow = {};
    for (const h of headers) {
      const v = r?.[h];
      out[h] = typeof v === "string" ? v : v == null ? "" : String(v);
    }
    return out;
  });

  // Trim whitespace everywhere (safe default)
  let trimmedCount = 0;
  for (const r of fixedRows) {
    for (const h of headers) {
      const before = r[h] ?? "";
      const after = (before ?? "").toString().trim();
      if (after !== before) {
        r[h] = after;
        trimmedCount++;
      }
    }
  }
  if (trimmedCount) fixesApplied.push("Trimmed whitespace in cells");

  return { fixedRows, fixesApplied };
}
