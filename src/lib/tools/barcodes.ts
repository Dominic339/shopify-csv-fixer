// src/lib/tools/barcodes.ts
// Repair barcodes (UPC, EAN, GTIN, ISBN) that a spreadsheet turned into numbers.
//
// Excel does two things to a barcode column: it drops leading zeros (012345678905
// becomes 12345678905) and it shows long numbers in scientific notation (1.23457E+11).
// A leading zero is restored only when the padded code has a valid check digit, so the
// fix is provably right. Scientific notation is expanded only when every digit is still
// there; when Excel rounded digits away they cannot be recovered, and the cell is flagged.

import type { CsvRow } from "@/lib/csv";

/** Column names that hold barcodes. */
const BARCODE_HEADER = /(^|[\s_-])(barcode|upc|ean|gtin|isbn|jan)([\s_-]|$)|^variant barcode$|^external[_ -]?product[_ -]?id$/i;

export function detectBarcodeColumns(headers: string[]): string[] {
  return headers.filter((h) => BARCODE_HEADER.test(h.trim()));
}

/** GS1 check digit test for GTIN-8/12/13/14 (ISBN-13 included). */
export function hasValidCheckDigit(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export type BarcodeStatus = "ok" | "fixed" | "lost" | "invalid" | "empty";

export type BarcodeCheck = { value: string; status: BarcodeStatus; reason?: "leading-zero" | "scientific" | "decimal" | "spaces" };

const SCI = /^([+-]?)(\d+)(?:[.,](\d+))?[eE]\+?(\d+)$/;

/**
 * Expand "1.23456789012E+11" to "123456789012". Returns null when the exponent would
 * have to invent trailing digits ("1.23457E+11"): those digits were rounded away.
 */
function expandScientific(v: string): string | null {
  const m = SCI.exec(v);
  if (!m || m[1] === "-") return null;
  const frac = m[3] ?? "";
  if (frac.length !== Number(m[4])) return null;
  return (m[2] + frac).replace(/^0+(?=\d)/, "");
}

/** ISBN-10 check (mod 11; the last character may be X). */
function isIsbn10(code: string): boolean {
  if (!/^\d{9}[\dX]$/i.test(code)) return false;
  const sum = [...code].reduce((s, ch, i) => s + (ch.toUpperCase() === "X" ? 10 : Number(ch)) * (10 - i), 0);
  return sum % 11 === 0;
}

/** Check one barcode cell and repair it when that can be done without guessing. */
export function checkBarcode(raw: string): BarcodeCheck {
  const v = raw.trim();
  if (!v) return { value: raw, status: "empty" };

  // "12345678905.0" from a numeric export.
  const dec = /^(\d+)[.,]0+$/.exec(v);
  if (dec) return withPadding(dec[1], "decimal");

  if (SCI.test(v)) {
    const expanded = expandScientific(v);
    if (expanded) {
      const fixed = withPadding(expanded, "scientific");
      if (fixed.status === "fixed") return fixed;
    }
    return { value: raw, status: "lost", reason: "scientific" };
  }

  const compact = v.replace(/[\s-]/g, "");
  if (/^\d+$/.test(compact) && compact !== v) {
    return withPadding(compact, "spaces");
  }

  if (/^\d+$/.test(v)) return withPadding(v, "leading-zero");
  // Letters or other characters: not a GTIN (an ASIN, an ISBN-10 with X…). Leave it.
  return { value: raw, status: "ok" };
}

function withPadding(digits: string, reason: NonNullable<BarcodeCheck["reason"]>): BarcodeCheck {
  if (hasValidCheckDigit(digits) || isIsbn10(digits)) {
    return reason === "leading-zero" ? { value: digits, status: "ok" } : { value: digits, status: "fixed", reason };
  }
  // A missing leading zero: try the standard lengths, shortest first, and accept the
  // first padded code whose check digit is valid.
  for (const len of [8, 12, 13, 14]) {
    if (len <= digits.length) continue;
    const padded = digits.padStart(len, "0");
    if (hasValidCheckDigit(padded)) return { value: padded, status: "fixed", reason };
  }
  return { value: digits, status: "invalid" };
}

export type BarcodeIssue = { row: number; column: string; before: string; after: string; status: BarcodeStatus; reason?: BarcodeCheck["reason"] };

export type BarcodeRepair = { rows: CsvRow[]; issues: BarcodeIssue[]; counts: Record<BarcodeStatus, number> };

export function repairBarcodes(rows: CsvRow[], columns: string[]): BarcodeRepair {
  const counts: Record<BarcodeStatus, number> = { ok: 0, fixed: 0, lost: 0, invalid: 0, empty: 0 };
  const issues: BarcodeIssue[] = [];
  const out = rows.map((r, i) => {
    const o = { ...r };
    for (const c of columns) {
      const before = r[c] ?? "";
      const res = checkBarcode(before);
      counts[res.status]++;
      if (res.status === "fixed") o[c] = res.value;
      if (res.status === "fixed" || res.status === "lost" || res.status === "invalid") {
        issues.push({ row: i + 1, column: c, before, after: res.status === "fixed" ? res.value : before, status: res.status, reason: res.reason });
      }
    }
    return o;
  });
  return { rows: out, issues, counts };
}
