// src/app/tools/clients/EncodingClient.tsx
"use client";

import { useMemo, useState } from "react";

import { fmt } from "@/lib/i18n/fmt";
import { repairTable } from "@/lib/tools/mojibake";
import { FileBar, ResultActions, UploadBox, baseName, card, muted, useCsvUpload, type ToolStrings } from "../ToolKit";

export default function EncodingClient({ t }: { t: ToolStrings }) {
  const s = t.tools.encoding;
  const { file, error, onFile, reset } = useCsvUpload(t);
  const [bom, setBom] = useState(false);
  const result = useMemo(() => (file ? repairTable(file.headers, file.rows) : null), [file]);

  if (!file || !result) return <UploadBox t={t} error={error} onFile={(f) => void onFile(f)} />;

  const encodingName =
    file.encoding === "windows-1252" ? s.encWin1252 : file.encoding.startsWith("utf-16") ? s.encUtf16 : file.hadBom ? s.encUtf8Bom : s.encUtf8;

  return (
    <div className="space-y-6">
      <FileBar name={file.name} info={fmt(t.fileInfo, { rows: file.rows.length, cols: file.headers.length })} onReset={reset} t={t} />

      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.result}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <dt className={`text-xs ${muted}`}>{s.detected}</dt>
            <dd className="mt-1 font-semibold text-[var(--text)]">{encodingName}</dd>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <dt className={`text-xs ${muted}`}>{s.garbled}</dt>
            <dd className="mt-1 font-semibold text-[var(--text)]">{result.changedCells ? fmt(s.repaired, { count: result.changedCells }) : s.clean}</dd>
          </div>
        </dl>

        {result.changes.length > 0 && (
          <div className="mt-5 data-table-wrap">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.row}</th>
                    <th>{t.column}</th>
                    <th>{t.before}</th>
                    <th>{t.after}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.changes.slice(0, 20).map((c, i) => (
                    <tr key={i}>
                      <td>{c.row || "–"}</td>
                      <td className="max-w-[10rem] truncate">{c.column}</td>
                      <td className="max-w-[16rem] truncate text-red-700 dark:text-red-400" title={c.before}>
                        {c.before}
                      </td>
                      <td className="max-w-[16rem] truncate text-green-700 dark:text-green-400" title={c.after}>
                        {c.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <label className="mt-5 flex items-start gap-3 text-sm text-[var(--text)]">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={bom} onChange={(e) => setBom(e.target.checked)} />
          {s.bom}
        </label>

        <ResultActions t={t} fileName={`${baseName(file.name)}_utf8.csv`} headers={result.headers} rows={result.rows} primaryLabel={s.downloadFixed} bom={bom} />
      </section>
    </div>
  );
}
