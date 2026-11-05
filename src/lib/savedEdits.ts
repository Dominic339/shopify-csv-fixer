// src/lib/savedEdits.ts
// Saved fixes: cell edits made in the fixer are remembered per format, keyed by each row's
// product identity (not its row number), so they can be applied again to next month's export
// of the same store. Everything stays in this browser (localStorage); nothing is uploaded.

import type { CsvRow } from "@/lib/csv";

const STORAGE_KEY = "striveformats_saved_edits_v1";
/** Rows remembered per format; the oldest are dropped beyond this. */
const MAX_ROWS = 5000;

/** Columns that identify a row, per format: all of them together, or the first one that is filled. */
const IDENTITY: Record<string, { all?: string[]; first?: string[] }> = {
  // A Shopify variant is its handle plus its option values (the SKU is often what gets fixed).
  shopify_products: { all: ["URL handle", "Option1 value", "Option2 value", "Option3 value"] },
  woocommerce_products: { first: ["ID", "SKU", "Name"] },
  woocommerce_variable_products: { first: ["ID", "SKU", "Name"] },
  etsy_listings: { first: ["SKU", "TITLE"] },
  ebay_listings: { first: ["CustomLabel", "*Title", "Title"] },
  ebay_variations: { first: ["CustomLabel", "*Title", "Title"] },
  amazon_inventory_loader: { first: ["sku", "item_sku", "seller-sku"] },
  google_merchant_center: { first: ["id"] },
  meta_catalog: { first: ["id"] },
  tiktok_catalog: { first: ["sku_id", "id"] },
};

export type SavedEdits = Record<string, Record<string, string>>; // rowKey -> column -> value
type Store = Record<string, { updatedAt: number; edits: SavedEdits }>;

/** A stable key for a row, or "" when the row has nothing to identify it by. */
export function rowKey(formatId: string, row: CsvRow): string {
  const id = IDENTITY[formatId];
  const val = (c: string) => String(row[c] ?? "").trim();
  if (id?.all) {
    const parts = id.all.map(val);
    return parts[0] ? id.all.map((c, i) => `${c}=${parts[i]}`).join("|") : "";
  }
  // Custom formats and anything unlisted: the first column of the row.
  const cols = id?.first ?? Object.keys(row).slice(0, 1);
  for (const c of cols) if (val(c)) return `${c}=${val(c)}`;
  return "";
}

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked (private mode): saved fixes are a convenience, so carry on.
  }
}

export function loadSavedEdits(formatId: string): SavedEdits {
  if (typeof window === "undefined") return {};
  return readStore()[formatId]?.edits ?? {};
}

/** Remember the new values of an edited row's cells. */
export function recordEdit(formatId: string, key: string, patch: Record<string, string>) {
  if (typeof window === "undefined" || !key) return;
  const store = readStore();
  const entry = store[formatId] ?? { updatedAt: 0, edits: {} };
  // Re-insert the row so the most recently edited rows are kept when the cap is reached.
  const row = { ...(entry.edits[key] ?? {}), ...patch };
  delete entry.edits[key];
  entry.edits[key] = row;
  const keys = Object.keys(entry.edits);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ROWS))) delete entry.edits[k];
  entry.updatedAt = Date.now();
  store[formatId] = entry;
  writeStore(store);
}

export function forgetSavedEdits(formatId: string) {
  if (typeof window === "undefined") return;
  const store = readStore();
  delete store[formatId];
  writeStore(store);
}

/**
 * Apply saved edits to rows. `keys` are the rows' keys as the file was loaded (so a row whose
 * key column was itself edited is still found). Only cells that would change are counted.
 */
export function applySavedEdits(rows: CsvRow[], keys: string[], edits: SavedEdits): { rows: CsvRow[]; cells: number; matchedRows: number } {
  let cells = 0;
  let matchedRows = 0;
  const out = rows.map((r, i) => {
    const patch = keys[i] ? edits[keys[i]] : undefined;
    if (!patch) return r;
    let changed = false;
    const next = { ...r };
    for (const [col, value] of Object.entries(patch)) {
      if (!(col in r) || (r[col] ?? "") === value) continue;
      next[col] = value;
      cells++;
      changed = true;
    }
    if (changed) matchedRows++;
    return changed ? next : r;
  });
  return { rows: out, cells, matchedRows };
}
