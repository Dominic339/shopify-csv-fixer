// src/lib/validation/fixAllShopify.ts
import type { CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeShopifyInventoryPolicy } from "@/lib/shopifySchema";

type FixAllResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  fixesApplied: string[];
};

const COL = {
  title: "Title",
  handle: "URL handle",
  published: "Published on online store",
  price: "Price",
  compareAt: "Compare-at price",
  inventoryQty: "Inventory quantity",
  continueSelling: "Continue selling when out of stock",
  requiresShipping: "Requires shipping",
  chargeTax: "Charge tax",
};

// Legacy fallbacks (in case file has old headers)
const LEGACY = {
  handle: ["Handle"],
  published: ["Published"],
  price: ["Variant Price"],
  compareAt: ["Variant Compare At Price"],
  inventoryQty: ["Variant Inventory Qty"],
  continueSelling: ["Variant Inventory Policy"], // "continue" means true
  requiresShipping: ["Variant Requires Shipping"],
  chargeTax: ["Variant Taxable"],
};

function getCell(row: CsvRow, primary: string, fallbacks: string[] = []) {
  if (primary in row) return row[primary] ?? "";
  for (const fb of fallbacks) if (fb in row) return row[fb] ?? "";
  return "";
}

function setCell(row: CsvRow, primary: string, value: string) {
  row[primary] = value;
}

function normalizeBoolStrict(v: string): string | null {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (!s) return null;
  if (["true", "t", "yes", "y", "1"].includes(s)) return "true";
  if (["false", "f", "no", "n", "0"].includes(s)) return "false";
  if (s === "published") return "true";
  if (s === "unpublished") return "false";
  return null;
}

function normalizeMoneyStrict(v: string): string | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const cleaned = s.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return cleaned;
}

function normalizeIntegerStrict(v: string): string | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  if (!/^-?\d+$/.test(s)) return null;
  return s;
}

/**
 * Applies ONLY safe deterministic fixes that are truly "auto-fixable".
 * Uses issues list to decide what’s blocking, but stays conservative.
 */
export function fixAllShopifyBlocking(headers: string[], rows: CsvRow[], issues: CsvIssue[]): FixAllResult {
  const fixedRows = rows.map((r) => ({ ...r }));
  const fixesApplied: string[] = [];

  // If there are no issues, bail early
  if (!issues?.length) return { fixedHeaders: headers, fixedRows, fixesApplied };

  // We only attempt fixes on rows that have issues
  const targetRowSet = new Set<number>();
  for (const it of issues) if (it.rowIndex >= 0) targetRowSet.add(it.rowIndex);

  for (const rowIndex of targetRowSet) {
    const row = fixedRows[rowIndex];
    if (!row) continue;

    // Published on online store
    const pubRaw = getCell(row, COL.published, LEGACY.published);
    const pubFixed = normalizeBoolStrict(pubRaw);
    if (pubFixed != null && pubFixed !== pubRaw) {
      setCell(row, COL.published, pubFixed);
      fixesApplied.push(`Normalized "${COL.published}" to "${pubFixed}" on row ${rowIndex + 1}`);
    }

    // Continue selling when out of stock:
    // Shopify's column represents an inventory policy: deny | continue.
    // We accept boolean-ish inputs and normalize deterministically to deny/continue.
    // IMPORTANT: Keep this consistent with shopifyBasic + strict validator to avoid "flip-flop" logs.
    const contRaw = getCell(row, COL.continueSelling, LEGACY.continueSelling);
    const contNorm = normalizeShopifyInventoryPolicy(contRaw);
    if (contNorm && contNorm !== (contRaw ?? "").toString().trim()) {
      setCell(row, COL.continueSelling, contNorm);
      fixesApplied.push(`Normalized "${COL.continueSelling}" to "${contNorm}" on row ${rowIndex + 1}`);
    }

    // Requires shipping
    const shipRaw = getCell(row, COL.requiresShipping, LEGACY.requiresShipping);
    const shipFixed = normalizeBoolStrict(shipRaw);
    if (shipFixed != null && shipFixed !== shipRaw) {
      setCell(row, COL.requiresShipping, shipFixed);
      fixesApplied.push(`Normalized "${COL.requiresShipping}" to "${shipFixed}" on row ${rowIndex + 1}`);
    }

    // Charge tax
    const taxRaw = getCell(row, COL.chargeTax, LEGACY.chargeTax);
    const taxFixed = normalizeBoolStrict(taxRaw);
    if (taxFixed != null && taxFixed !== taxRaw) {
      setCell(row, COL.chargeTax, taxFixed);
      fixesApplied.push(`Normalized "${COL.chargeTax}" to "${taxFixed}" on row ${rowIndex + 1}`);
    }

    // Price
    const priceRaw = getCell(row, COL.price, LEGACY.price);
    const priceFixed = normalizeMoneyStrict(priceRaw);
    if (priceFixed != null && priceFixed !== priceRaw) {
      setCell(row, COL.price, priceFixed);
      fixesApplied.push(`Normalized "${COL.price}" to "${priceFixed}" on row ${rowIndex + 1}`);
    }

    // Compare-at price
    const caRaw = getCell(row, COL.compareAt, LEGACY.compareAt);
    const caFixed = normalizeMoneyStrict(caRaw);
    if (caFixed != null && caFixed !== caRaw) {
      setCell(row, COL.compareAt, caFixed);
      fixesApplied.push(`Normalized "${COL.compareAt}" to "${caFixed}" on row ${rowIndex + 1}`);
    }

    // Inventory quantity
    const qtyRaw = getCell(row, COL.inventoryQty, LEGACY.inventoryQty);
    const qtyFixed = normalizeIntegerStrict(qtyRaw);
    if (qtyFixed != null && qtyFixed !== qtyRaw) {
      setCell(row, COL.inventoryQty, qtyFixed);
      fixesApplied.push(`Normalized "${COL.inventoryQty}" to "${qtyFixed}" on row ${rowIndex + 1}`);
    }
  }

  return { fixedHeaders: headers, fixedRows, fixesApplied };
}
