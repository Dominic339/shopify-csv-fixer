// src/app/tools/clients/ExcelClient.tsx
"use client";

import { useMemo, useState } from "react";

import type { CsvRow } from "@/lib/csv";
import { fmt } from "@/lib/i18n/fmt";
import { readXlsx, tidyRows, type Sheet } from "@/lib/tools/xlsx";
import { FileBar, Preview, ResultActions, UploadBox, baseName, card, input, label, muted, type ToolStrings } from "../ToolKit";

/** The first row as column names: blanks get "Column N", repeats get " (2)". */
function headerRow(cells: string[]): string[] {
  const seen = new Map<string, number>();
  return cells.map((c, i) => {
    const name = c.trim() || `Column ${i + 1}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return n === 1 ? name : `${name} (${n})`;
  });
}

export default function ExcelClient({ t }: { t: ToolStrings }) {
  const s = t.tools.excel;
  const [book, setBook] = useState<{ name: string; sheets: Sheet[] } | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onFile(f: File) {
    if (/\.xls$/i.test(f.name)) return setError(s.xlsOnly);
    try {
      const sheets = await readXlsx(new Uint8Array(await f.arrayBuffer()));
      if (sheets.length === 0) return setError(s.notWorkbook);
      setError(null);
      setSheetIndex(0);
      setBook({ name: f.name, sheets });
    } catch {
      setError(/\.xlsx$/i.test(f.name) ? t.readError : s.notWorkbook);
    }
  }

  const table = useMemo(() => {
    const sheet = book?.sheets[sheetIndex];
    if (!sheet) return null;
    const rows = tidyRows(sheet.rows);
    if (rows.length === 0) return { headers: [] as string[], rows: [] as CsvRow[] };
    const headers = headerRow(rows[0]);
    return {
      headers,
      rows: rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])) as CsvRow),
    };
  }, [book, sheetIndex]);

  if (!book || !table) {
    return (
      <UploadBox
        t={t}
        title={t.dropTitleExcel}
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        acceptName={/\.xlsx?$/i}
        onFile={(f) => void onFile(f)}
        error={error}
      />
    );
  }

  const sheet = book.sheets[sheetIndex];
  const outName = `${baseName(book.name)}${book.sheets.length > 1 ? `_${sheet.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}` : ""}.csv`;

  return (
    <div className="space-y-6">
      <FileBar
        name={book.name}
        info={fmt(s.rowsCols, { rows: table.rows.length, cols: table.headers.length })}
        onReset={() => setBook(null)}
        t={t}
      />

      <section className={`${card} p-5 sm:p-6`}>
        {book.sheets.length > 1 && (
          <label className="mb-5 flex flex-wrap items-center gap-3">
            <span className={label}>{s.sheet}</span>
            <select className={input} value={sheetIndex} onChange={(e) => setSheetIndex(Number(e.target.value))}>
              {book.sheets.map((sh, i) => (
                <option key={i} value={i}>
                  {sh.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {table.headers.length === 0 ? (
          <p className={`text-sm ${muted}`}>{s.emptySheet}</p>
        ) : (
          <>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">{t.preview}</h2>
            <Preview t={t} headers={table.headers} rows={table.rows} />
            <ResultActions t={t} fileName={outName} headers={table.headers} rows={table.rows} />
          </>
        )}
      </section>
    </div>
  );
}
