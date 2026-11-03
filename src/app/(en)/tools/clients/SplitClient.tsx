// src/app/tools/clients/SplitClient.tsx
"use client";

import { useMemo, useState } from "react";

import { fmt } from "@/lib/i18n/fmt";
import { detectGroupColumn, splitCsv } from "@/lib/tools/splitCsv";
import { makeZip } from "@/lib/tools/zip";
import { FileBar, UploadBox, baseName, card, download, formatBytes, input, label, muted, useCsvUpload, type ToolStrings } from "../ToolKit";

/** Shopify rejects product CSVs over 15 MB. */
const SHOPIFY_MAX_BYTES = 15 * 1024 * 1024;

export default function SplitClient({ t }: { t: ToolStrings }) {
  const s = t.tools.split;
  const { file, error, onFile, reset } = useCsvUpload(t);
  const [rowsPerFile, setRowsPerFile] = useState(1000);
  const [limitSize, setLimitSize] = useState(false);
  const [groupBy, setGroupBy] = useState<string | null>(null);

  const group = groupBy ?? (file ? detectGroupColumn(file.headers) : "");
  const parts = useMemo(
    () => (file ? splitCsv(file.headers, file.rows, { rowsPerFile, groupBy: group, maxBytes: limitSize ? SHOPIFY_MAX_BYTES : undefined }) : []),
    [file, rowsPerFile, group, limitSize],
  );

  if (!file) return <UploadBox t={t} onFile={(f) => { setGroupBy(null); void onFile(f); }} error={error} />;

  const base = baseName(file.name);
  const partName = (i: number) => `${base}_part${String(i + 1).padStart(String(parts.length).length, "0")}.csv`;
  const enc = new TextEncoder();

  return (
    <div className="space-y-6">
      <FileBar name={file.name} info={fmt(t.fileInfo, { rows: file.rows.length, cols: file.headers.length })} onReset={reset} t={t} />

      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.options}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{s.rowsPerFile}</span>
            <input
              type="number"
              min={1}
              className={`${input} mt-2 block w-full`}
              value={rowsPerFile}
              onChange={(e) => setRowsPerFile(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <label className="block">
            <span className={label}>{s.groupBy}</span>
            <select className={`${input} mt-2 block w-full`} value={group} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="">{s.noGrouping}</option>
              {file.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className={`mt-1 block text-xs ${muted}`}>{s.groupHint}</span>
          </label>
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm text-[var(--text)]">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={limitSize} onChange={(e) => setLimitSize(e.target.checked)} />
          {s.maxSize}
        </label>
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">{fmt(s.resultTitle, { count: parts.length })}</h2>
          {parts.length > 1 && (
            <button
              type="button"
              className="rg-btn px-5 py-2.5"
              onClick={() => download(`${base}_split.zip`, makeZip(parts.map((p, i) => ({ name: partName(i), data: enc.encode(p.csv) }))), "application/zip")}
            >
              {s.downloadZip}
            </button>
          )}
        </div>
        <ul className="mt-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {parts.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text)]">{fmt(s.part, { n: i + 1 })}</p>
                <p className={`text-xs ${muted}`}>{fmt(s.partInfo, { rows: p.rows.length, size: formatBytes(p.bytes) })}</p>
              </div>
              <button type="button" className="rgb-btn px-3 py-1.5 text-sm" onClick={() => download(partName(i), p.csv)}>
                {s.download}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
