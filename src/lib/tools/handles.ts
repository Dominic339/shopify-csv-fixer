// src/lib/tools/handles.ts
// Shopify URL handles from product titles: the same rules the CSV Fixer uses, plus
// "-1", "-2" suffixes so every product gets a different handle, as Shopify does.

import type { CsvRow } from "@/lib/csv";
import { slugifyShopifyHandle } from "@/lib/shopifySchema";

/** Shopify cuts handles at 255 characters. */
const MAX_HANDLE = 255;

function unique(base: string, used: Set<string>): string {
  let h = base;
  for (let n = 1; used.has(h); n++) {
    const suffix = `-${n}`;
    h = base.slice(0, MAX_HANDLE - suffix.length).replace(/-$/, "") + suffix;
  }
  used.add(h);
  return h;
}

/** One handle per title; blank titles give blank handles. */
export function handlesForTitles(titles: string[], opts: { unique: boolean }): string[] {
  const used = new Set<string>();
  return titles.map((t) => {
    const base = slugifyShopifyHandle(t).slice(0, MAX_HANDLE).replace(/-$/, "");
    if (!base) return "";
    return opts.unique ? unique(base, used) : base;
  });
}

export type FillResult = { rows: CsvRow[]; filled: number; headers: string[] };

/**
 * Fill a handle column from a title column. In a Shopify file the variant rows under a
 * product have no title; they get the handle of the product row above them.
 */
export function fillHandles(
  headers: string[],
  rows: CsvRow[],
  opts: { titleColumn: string; handleColumn: string; overwrite: boolean },
): FillResult {
  const { titleColumn, handleColumn, overwrite } = opts;
  const used = new Set<string>();
  if (!overwrite) for (const r of rows) if ((r[handleColumn] ?? "").trim()) used.add(r[handleColumn].trim());

  let filled = 0;
  let last = "";
  const out = rows.map((r) => {
    const o = { ...r };
    const existing = (r[handleColumn] ?? "").trim();
    const title = (r[titleColumn] ?? "").trim();
    if (existing && !overwrite) {
      last = existing;
      return o;
    }
    let h = "";
    if (title) {
      const base = slugifyShopifyHandle(title).slice(0, MAX_HANDLE).replace(/-$/, "");
      h = base ? unique(base, used) : "";
    } else {
      h = last;
    }
    if (h && h !== existing) {
      o[handleColumn] = h;
      filled++;
    }
    last = h || last;
    return o;
  });
  return { rows: out, filled, headers: headers.includes(handleColumn) ? headers : [handleColumn, ...headers] };
}
