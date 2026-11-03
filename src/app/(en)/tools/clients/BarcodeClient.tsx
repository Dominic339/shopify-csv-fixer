// src/app/tools/clients/BarcodeClient.tsx
"use client";

import { useMemo, useState } from "react";

import { fmt } from "@/lib/i18n/fmt";
import { detectBarcodeColumns, repairBarcodes, type BarcodeIssue } from "@/lib/tools/barcodes";
import { FileBar, ResultActions, UploadBox, baseName, card, label, muted, useCsvUpload, type ToolStrings } from "../ToolKit";

const STATUS_STYLE: Record<string, string> = {
  fixed: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  lost: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  invalid: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
};

export default function BarcodeClient({ t }: { t: ToolStrings }) {
  const s = t.tools.barcodes;
  const { file, error, onFile, reset } = useCsvUpload(t);
  const [picked, setPicked] = useState<string[] | null>(null);

  const detected = useMemo(() => (file ? detectBarcodeColumns(file.headers) : []), [file]);
  const columns = picked ?? detected;
  const result = useMemo(() => (file ? repairBarcodes(file.rows, columns) : null), [file, columns]);

  if (!file || !result) return <UploadBox t={t} error={error} onFile={(f) => { setPicked(null); void onFile(f); }} />;

  const toggle = (h: string) => setPicked((cur) => {
    const list = cur ?? detected;
    return list.includes(h) ? list.filter((c) => c !== h) : [...list, h];
  });
  const reasonText = (i: BarcodeIssue) =>
    i.status === "lost" ? s.lost : i.status === "invalid" ? s.invalid
      : i.reason === "scientific" ? s.reasonScientific : i.reason === "decimal" ? s.reasonDecimal : i.reason === "spaces" ? s.reasonSpaces : s.reasonLeadingZero;
  const { fixed, lost, invalid } = result.counts;

  return (
    <div className="space-y-6">
      <FileBar name={file.name} info={fmt(t.fileInfo, { rows: file.rows.length, cols: file.headers.length })} onReset={reset} t={t} />

      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{s.columns}</h2>
        {detected.length === 0 && <p className={`mt-2 text-sm ${muted}`}>{s.noColumns}</p>}
        <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {file.headers.map((h) => (
            <label
              key={h}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${columns.includes(h) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]" : "border-[var(--border)] text-[var(--muted)]"}`}
            >
              <input type="checkbox" className="sr-only" checked={columns.includes(h)} onChange={() => toggle(h)} />
              {h}
            </label>
          ))}
        </div>
      </section>

      {columns.length > 0 && (
        <section className={`${card} p-5 sm:p-6`}>
          <h2 className="text-lg font-semibold text-[var(--text)]">{t.result}</h2>
          <p className="mt-2 text-base text-[var(--text)]">{fixed + lost + invalid ? fmt(s.summary, { fixed, lost, invalid }) : s.allGood}</p>

          {result.issues.length > 0 && (
            <div className="mt-5 data-table-wrap">
              <div className="max-h-96 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.row}</th>
                      <th>{t.column}</th>
                      <th>{t.before}</th>
                      <th>{t.after}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {result.issues.slice(0, 200).map((i, n) => (
                      <tr key={n}>
                        <td>{i.row}</td>
                        <td className="max-w-[10rem] truncate">{i.column}</td>
                        <td className="font-mono">{i.before}</td>
                        <td className="font-mono">{i.status === "fixed" ? i.after : "–"}</td>
                        <td>
                          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[i.status]}`}>{reasonText(i)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(lost > 0 || invalid > 0) && (
            <ul className={`mt-4 space-y-2 text-sm ${muted}`}>
              {lost > 0 && <li><span className={label}>{s.lost}:</span> {s.lostHelp}</li>}
              {invalid > 0 && <li><span className={label}>{s.invalid}:</span> {s.invalidHelp}</li>}
            </ul>
          )}

          <ResultActions t={t} fileName={`${baseName(file.name)}_barcodes.csv`} headers={file.headers} rows={result.rows} primaryLabel={s.downloadFixed} />
          <p className={`mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm ${muted}`}>{s.tip}</p>
        </section>
      )}
    </div>
  );
}
