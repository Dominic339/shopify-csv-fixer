// src/lib/tools/xlsx.ts
// Read the sheets of an .xlsx workbook as rows of text, the way the cells look in Excel
// rather than how Excel would re-save them: long numbers stay whole (no 1.23E+11), dates
// become YYYY-MM-DD, and text cells keep their leading zeros.
//
// .xlsx is a zip of XML files. Only what CSV needs is read: shared strings, the number
// formats that mark dates, and cell values. Old binary .xls files are not supported.

import { readZip } from "./zip";

export type Sheet = { name: string; rows: string[][] };

const dec = new TextDecoder();

function unescapeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    // Excel's own escape for control characters, e.g. _x000D_ for a carriage return.
    .replace(/_x([0-9a-f]{4})_/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? unescapeXml(m[1]) : undefined;
}

/** Text of every <t> inside a string item (plain or rich text), joined. */
function textOf(xml: string): string {
  let out = "";
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += unescapeXml(m[1]);
  return out;
}

function sharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)].map((m) => (m[1] ? textOf(m[1].replace(/<rPh[\s\S]*?<\/rPh>/g, "")) : ""));
}

// Built-in number formats that are dates or times.
const DATE_FORMAT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function isDateFormatCode(code: string): boolean {
  // Drop quoted text, escaped characters and [colour]/[locale] sections before looking for d/m/y/h/s.
  const bare = code.replace(/"[^"]*"/g, "").replace(/\\./g, "").replace(/\[[^\]]*\]/g, "");
  return /[dmyhs]/i.test(bare) && !/^[#0.,%\s]*$/.test(bare);
}

/** For each cell style index, whether it formats numbers as a date. */
function dateStyles(xml: string | undefined): boolean[] {
  if (!xml) return [];
  const custom = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt\s[^>]*>/g)) {
    const id = Number(attr(m[0], "numFmtId"));
    custom.set(id, attr(m[0], "formatCode") ?? "");
  }
  const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? "";
  return [...xfs.matchAll(/<xf\s[^>]*?\/?>/g)].map((m) => {
    const id = Number(attr(m[0], "numFmtId") ?? 0);
    return DATE_FORMAT_IDS.has(id) || (custom.has(id) && isDateFormatCode(custom.get(id)!));
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

function serialToDate(serial: number, date1904: boolean): string {
  const days = serial + (date1904 ? 1462 : 0);
  // 25569 = days from 1900-01-00 (with Excel's fake 29 Feb 1900) to 1970-01-01.
  const ms = Math.round((days - 25569) * 86400) * 1000;
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const secs = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  if (serial < 1) return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return secs === 0 ? date : `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** A stored number as Excel would display it in General format, without exponents. */
function numberText(v: string): string {
  // Whole numbers are kept digit for digit (Number() would round past 15 digits).
  if (/^-?\d+$/.test(v)) return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  // Stored with an exponent: Excel keeps 15 significant digits, so show those, written out.
  if (Number.isInteger(n) && Math.abs(n) < 1e21) return writeOut(n.toPrecision(15));
  // Excel shows at most 15 significant digits; this also hides float noise like 0.30000000000000004.
  const r = Number(n.toPrecision(15));
  if (Math.abs(r) >= 1e-6) return String(r);
  return r.toFixed(20).replace(/0+$/, "").replace(/\.$/, "");
}

/** "1.23456789012346e+18" → "1234567890123460000" (no binary rounding noise). */
function writeOut(p: string): string {
  const m = /^(-?)(\d)(?:\.(\d+))?e\+(\d+)$/.exec(p);
  if (!m) return String(Number(p));
  const digits = m[2] + (m[3] ?? "");
  const exp = Number(m[4]);
  return m[1] + (digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, "0"));
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return n - 1;
}

function readSheet(xml: string, strings: string[], dates: boolean[], date1904: boolean): string[][] {
  const rows: string[][] = [];
  const data = /<sheetData[^>]*>([\s\S]*?)<\/sheetData>/.exec(xml)?.[1] ?? "";
  let nextRow = 0;
  for (const rm of data.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = attr(rm[1], "r");
    const rowIndex = r ? Number(r) - 1 : nextRow;
    nextRow = rowIndex + 1;
    const cells: string[] = [];
    let nextCol = 0;
    for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cm[1], "r");
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const type = attr(cm[1], "t") ?? "n";
      const style = Number(attr(cm[1], "s") ?? 0);
      const inner = cm[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let text = "";
      if (type === "s") text = strings[Number(v)] ?? "";
      else if (type === "inlineStr") text = textOf(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? "");
      else if (type === "b") text = v === "1" ? "TRUE" : "FALSE";
      else if (v !== undefined) {
        const raw = unescapeXml(v);
        text = type === "n" && dates[style] && raw !== "" ? serialToDate(Number(raw), date1904) : type === "n" ? numberText(raw) : raw;
      }
      cells[col] = text;
    }
    rows[rowIndex] = Array.from(cells, (c) => c ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}

/** Every worksheet in the workbook, in tab order. */
export async function readXlsx(bytes: Uint8Array): Promise<Sheet[]> {
  const files = await readZip(bytes);
  const text = (name: string) => {
    const f = files.get(name);
    return f ? dec.decode(f) : undefined;
  };
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("not an Excel workbook");

  const rels = new Map<string, string>();
  for (const m of (text("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\s[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }

  const strings = sharedStrings(text("xl/sharedStrings.xml"));
  const dates = dateStyles(text("xl/styles.xml"));
  const date1904 = /<workbookPr\s[^>]*date1904="(1|true)"/.test(workbook);

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
    const name = attr(m[0], "name") ?? `Sheet${sheets.length + 1}`;
    const rid = attr(m[0], "r:id");
    const path = rid ? rels.get(rid) : undefined;
    const xml = path ? text(path) : undefined;
    if (xml) sheets.push({ name, rows: readSheet(xml, strings, dates, date1904) });
  }
  return sheets;
}

/** Rows with trailing empty rows removed and every row padded to the same width. */
export function tidyRows(rows: string[][]): string[][] {
  let end = rows.length;
  while (end > 0 && rows[end - 1].every((c) => c.trim() === "")) end--;
  const kept = rows.slice(0, end);
  const width = kept.reduce((w, r) => Math.max(w, r.length), 0);
  return kept.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
}
