// src/app/tools/clients/HandleClient.tsx
"use client";

import { useMemo, useState } from "react";

import { fmt } from "@/lib/i18n/fmt";
import { fillHandles, handlesForTitles } from "@/lib/tools/handles";
import { FileBar, Preview, ResultActions, UploadBox, baseName, card, input, label, muted, useCsvUpload, type ToolStrings } from "../ToolKit";

const TITLE_COLUMNS = ["Title", "title", "Name", "name", "TITLE", "Product Name", "item-name", "item_name"];

function PasteMode({ t }: { t: ToolStrings }) {
  const s = t.tools.handles;
  const [text, setText] = useState("");
  const [unique, setUnique] = useState(true);
  const [copied, setCopied] = useState(false);
  const handles = useMemo(() => handlesForTitles(text.split(/\r?\n/), { unique }).join("\n"), [text, unique]);

  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className={label}>{s.titlesLabel}</span>
          <textarea
            className={`${input} mt-2 block h-56 w-full resize-y font-mono`}
            placeholder={s.titlesPlaceholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopied(false);
            }}
          />
        </label>
        <label className="block">
          <span className={label}>{s.handlesLabel}</span>
          <textarea className={`${input} mt-2 block h-56 w-full resize-y bg-[var(--surface-2)] font-mono`} readOnly value={handles} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
          <input type="checkbox" className="h-4 w-4" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
          {s.unique}
        </label>
        <button
          type="button"
          className="rg-btn px-5 py-2.5"
          disabled={!handles.trim()}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(handles);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? s.copied : s.copy}
        </button>
      </div>
    </section>
  );
}

function CsvMode({ t }: { t: ToolStrings }) {
  const s = t.tools.handles;
  const { file, error, onFile, reset } = useCsvUpload(t);
  const [titleColumn, setTitleColumn] = useState<string | null>(null);
  const [handleColumn, setHandleColumn] = useState("Handle");
  const [overwrite, setOverwrite] = useState(false);

  const titleCol = titleColumn ?? (file ? (TITLE_COLUMNS.find((c) => file.headers.includes(c)) ?? file.headers[0]) : "");
  const result = useMemo(
    () => (file ? fillHandles(file.headers, file.rows, { titleColumn: titleCol, handleColumn: handleColumn.trim() || "Handle", overwrite }) : null),
    [file, titleCol, handleColumn, overwrite],
  );

  if (!file || !result) return <UploadBox t={t} error={error} onFile={(f) => { setTitleColumn(null); void onFile(f); }} />;

  const hc = handleColumn.trim() || "Handle";
  const highlight = new Set(result.rows.slice(0, 8).flatMap((r, i) => (r[hc] !== file.rows[i][hc] ? [`${i}:${hc}`] : [])));

  return (
    <div className="space-y-6">
      <FileBar name={file.name} info={fmt(t.fileInfo, { rows: file.rows.length, cols: file.headers.length })} onReset={reset} t={t} />
      <section className={`${card} p-5 sm:p-6`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{s.titleColumn}</span>
            <select className={`${input} mt-2 block w-full`} value={titleCol} onChange={(e) => setTitleColumn(e.target.value)}>
              {file.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>{s.handleColumn}</span>
            <input className={`${input} mt-2 block w-full`} value={handleColumn} onChange={(e) => setHandleColumn(e.target.value)} />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-[var(--text)]">
          <input type="checkbox" className="h-4 w-4" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          {s.overwrite}
        </label>
        <p className={`mt-2 text-xs ${muted}`}>{s.variantNote}</p>
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.result}</h2>
        <p className="mb-4 mt-2 text-base text-[var(--text)]">{fmt(s.filled, { count: result.filled })}</p>
        <Preview t={t} headers={result.headers} rows={result.rows} highlight={highlight} />
        <ResultActions t={t} fileName={`${baseName(file.name)}_handles.csv`} headers={result.headers} rows={result.rows} primaryLabel={s.downloadFixed} />
      </section>
    </div>
  );
}

export default function HandleClient({ t }: { t: ToolStrings }) {
  const s = t.tools.handles;
  const [mode, setMode] = useState<"paste" | "csv">("paste");
  return (
    <div className="space-y-6">
      <div role="tablist" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
        {(["paste", "csv"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === m ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "text-[var(--muted)]"}`}
            onClick={() => setMode(m)}
          >
            {m === "paste" ? s.modePaste : s.modeCsv}
          </button>
        ))}
      </div>
      {mode === "paste" ? <PasteMode t={t} /> : <CsvMode t={t} />}
    </div>
  );
}
