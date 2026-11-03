// src/app/tools/clients/DedupeClient.tsx
"use client";

import { useMemo, useState } from "react";

import { toCsv } from "@/lib/csv";
import { fmt } from "@/lib/i18n/fmt";
import { dedupeRows, suggestKey } from "@/lib/tools/dedupe";
import { FileBar, Preview, ResultActions, UploadBox, baseName, card, download, input, label, useCsvUpload, type ToolStrings } from "../ToolKit";

export default function DedupeClient({ t }: { t: ToolStrings }) {
  const s = t.tools.dedupe;
  const { file, error, onFile, reset } = useCsvUpload(t);
  const [byColumns, setByColumns] = useState(false);
  const [keys, setKeys] = useState<string[]>([]);
  const [keep, setKeep] = useState<"first" | "last">("first");
  const [loose, setLoose] = useState(true);
  const [skipBlank, setSkipBlank] = useState(true);

  const result = useMemo(
    () => (file ? dedupeRows(file.headers, file.rows, { keys: byColumns ? keys : [], keep, loose, skipBlankKeys: byColumns && skipBlank }) : null),
    [file, byColumns, keys, keep, loose, skipBlank],
  );

  if (!file || !result) {
    return <UploadBox t={t} error={error} onFile={(f) => void onFile(f)} />;
  }

  const chooseColumns = () => {
    setByColumns(true);
    if (keys.length === 0) {
      const k = suggestKey(file.headers);
      setKeys(k ? [k] : [file.headers[0]]);
    }
  };
  const toggleKey = (h: string) => setKeys((ks) => (ks.includes(h) ? ks.filter((k) => k !== h) : [...ks, h]));
  const handleOnly = byColumns && keys.length === 1 && keys[0] === "Handle";
  const base = baseName(file.name);

  return (
    <div className="space-y-6">
      <FileBar name={file.name} info={fmt(t.fileInfo, { rows: file.rows.length, cols: file.headers.length })} onReset={reset} t={t} />

      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.options}</h2>
        <fieldset className="mt-4">
          <legend className={label}>{s.compare}</legend>
          <div className="mt-2 space-y-2 text-sm text-[var(--text)]">
            <label className="flex items-center gap-3">
              <input type="radio" name="dedupe-mode" checked={!byColumns} onChange={() => setByColumns(false)} />
              {s.wholeRow}
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="dedupe-mode" checked={byColumns} onChange={chooseColumns} />
              {s.byColumns}
            </label>
          </div>
          {byColumns && (
            <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {file.headers.map((h) => (
                <label
                  key={h}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${keys.includes(h) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]" : "border-[var(--border)] text-[var(--muted)]"}`}
                >
                  <input type="checkbox" className="sr-only" checked={keys.includes(h)} onChange={() => toggleKey(h)} />
                  {h}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {handleOnly && (
          <p className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{s.handleWarning}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[var(--text)]">
          <label className="flex items-center gap-2">
            <span className={label}>{s.keep}</span>
            <select className={input} value={keep} onChange={(e) => setKeep(e.target.value as "first" | "last")}>
              <option value="first">{s.keepFirst}</option>
              <option value="last">{s.keepLast}</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" checked={loose} onChange={(e) => setLoose(e.target.checked)} />
            {s.loose}
          </label>
          {byColumns && (
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={skipBlank} onChange={(e) => setSkipBlank(e.target.checked)} />
              {s.skipBlank}
            </label>
          )}
        </div>
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.result}</h2>
        <p className="mt-2 text-base text-[var(--text)]">
          {result.removed.length ? fmt(s.summary, { removed: result.removed.length, kept: result.kept.length }) : s.none}
        </p>
        {result.removed.length > 0 && (
          <div className="mt-5">
            <h3 className={label}>{s.removedTitle}</h3>
            <div className="mt-2">
              <Preview
                t={t}
                headers={[t.row, ...file.headers]}
                rows={result.removed.map((r, i) => ({ ...r, [t.row]: String(result.removedRowNumbers[i]) }))}
              />
            </div>
          </div>
        )}
        <ResultActions t={t} fileName={`${base}_deduped.csv`} headers={file.headers} rows={result.kept} primaryLabel={s.downloadKept}>
          {result.removed.length > 0 && (
            <button type="button" className="rgb-btn justify-center px-5 py-2.5 text-sm" onClick={() => download(`${base}_removed.csv`, toCsv(file.headers, result.removed))}>
              {s.downloadRemoved}
            </button>
          )}
        </ResultActions>
      </section>
    </div>
  );
}
