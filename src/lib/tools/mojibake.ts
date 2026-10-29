// src/lib/tools/mojibake.ts
// Repair "mojibake": text that was UTF-8, got read as Windows-1252 somewhere along the
// way, and was saved again. "Café" turns into "CafÃ©" and "don’t" into "donâ€™t".
//
// Each garbled run is turned back into its bytes and decoded as UTF-8. Only runs that
// form a valid UTF-8 sequence are changed, so correctly written accents are left alone.

import { CP1252_HIGH } from "@/lib/textFile";
import type { CsvRow } from "@/lib/csv";

const HIGH_BYTE = new Map<string, number>([...CP1252_HIGH].map((ch, i) => [ch, 0x80 + i]));

/** The Windows-1252 byte for a character, or -1 when it has none. */
function cp1252Byte(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) return code;
  return HIGH_BYTE.get(ch) ?? -1;
}

const utf8 = new TextDecoder("utf-8", { fatal: true });

/** Number of continuation bytes a UTF-8 lead byte needs, or 0 if it is not a lead byte. */
function trailBytes(b: number): number {
  if (b >= 0xc2 && b <= 0xdf) return 1;
  if (b >= 0xe0 && b <= 0xef) return 2;
  if (b >= 0xf0 && b <= 0xf4) return 3;
  return 0;
}

function repairOnce(text: string): string {
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const lead = cp1252Byte(chars[i]);
    const n = lead >= 0 ? trailBytes(lead) : 0;
    if (n > 0 && i + n < chars.length) {
      const bytes = [lead];
      for (let j = 1; j <= n; j++) {
        const b = cp1252Byte(chars[i + j]);
        if (b < 0x80 || b > 0xbf) break;
        bytes.push(b);
      }
      if (bytes.length === n + 1) {
        try {
          out += utf8.decode(new Uint8Array(bytes));
          i += n;
          continue;
        } catch {
          // Not a valid sequence: keep the original characters.
        }
      }
    }
    out += chars[i];
  }
  return out;
}

/** Repair garbled text. Text that was garbled twice is repaired twice. */
export function repairMojibake(text: string): string {
  let cur = text;
  for (let pass = 0; pass < 3; pass++) {
    const next = repairOnce(cur);
    if (next === cur) break;
    cur = next;
  }
  return cur;
}

export type CellChange = { row: number; column: string; before: string; after: string };

export type RepairResult = { headers: string[]; rows: CsvRow[]; changes: CellChange[]; changedCells: number };

/** Repair every header and cell; `changes` lists up to `sampleLimit` examples. */
export function repairTable(headers: string[], rows: CsvRow[], sampleLimit = 50): RepairResult {
  const changes: CellChange[] = [];
  let changedCells = 0;
  const headerMap = new Map(headers.map((h) => [h, repairMojibake(h)]));
  headers.forEach((h) => {
    const after = headerMap.get(h)!;
    if (after !== h) {
      changedCells++;
      if (changes.length < sampleLimit) changes.push({ row: 0, column: h, before: h, after });
    }
  });

  const out = rows.map((r, i) => {
    const o: CsvRow = {};
    for (const h of headers) {
      const before = r[h] ?? "";
      const after = repairMojibake(before);
      if (after !== before) {
        changedCells++;
        if (changes.length < sampleLimit) changes.push({ row: i + 1, column: headerMap.get(h)!, before, after });
      }
      o[headerMap.get(h)!] = after;
    }
    return o;
  });
  return { headers: headers.map((h) => headerMap.get(h)!), rows: out, changes, changedCells };
}
