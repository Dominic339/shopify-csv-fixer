"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/FileDropZone";
import { fmt, plural } from "@/lib/i18n/fmt";
import type { AppStrings, Fixer } from "./useFixer";
import { card, muted, StepTitle } from "./ui";

// Shopify has realistic "messy" exports; other formats use their preset's sample file.
const SAMPLE_FILES: Record<string, string> = {
  shopify_products: "/samples/messy_shopify_export_3_multivariant_edges.csv",
};

/** Step 2: drop / choose / paste a CSV, or load a sample. */
export function UploadPanel({ f, t }: { f: Fixer; t: AppStrings }) {
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [loadingSample, setLoadingSample] = useState(false);
  const hasFile = f.rows.length > 0;

  async function loadSample() {
    const builtin = f.activeFormat?.source === "builtin";
    const url = SAMPLE_FILES[f.formatId] ?? (builtin ? `/presets/${encodeURIComponent(f.formatId)}/sample.csv` : null);
    if (!url) return;
    setLoadingSample(true);
    try {
      const text = await (await fetch(url)).text();
      await f.handleFile(new File([text], url.split("/").pop() ?? "sample.csv", { type: "text/csv" }));
    } finally {
      setLoadingSample(false);
    }
  }

  const chooser = (
    <label className={hasFile ? "pill-btn cursor-pointer" : "rg-btn cursor-pointer"}>
      {hasFile ? t.replaceFile : t.chooseFile}
      <input
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void (f.workspaceEnabled && f.workspaceDocs.length ? f.handleWorkspaceFile(file) : f.handleFile(file));
          e.target.value = "";
        }}
      />
    </label>
  );

  return (
    <section className={`${card} p-5 sm:p-7`}>
      <StepTitle n={2}>{t.stepUpload}</StepTitle>

      <FileDropZone onFile={(file) => void f.handleFile(file)} dropLabel={t.dropCsvHere} className="mt-4">
        {hasFile ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--text)]">{f.fileName}</div>
              <div className={`text-sm ${muted}`}>
                {plural(f.rows.length, t.rowCountOne, t.rowCount)} · {plural(f.tableHeaders.length, t.columnCountOne, t.columnCount)}
              </div>
            </div>
            {chooser}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] px-4 py-8 text-center sm:py-10">
            <p className={`hidden text-base sm:block ${muted}`}>{t.dropHere}</p>
            {chooser}
            <p className={`text-xs ${muted}`}>{t.privacyNote}</p>
          </div>
        )}
      </FileDropZone>

      {f.busy ? <p className={`mt-3 text-sm ${muted}`} role="status">{t.working}</p> : null}

      {!hasFile && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button type="button" className="font-medium text-[var(--accent)] hover:underline" onClick={() => setPasting((v) => !v)}>
            {t.pasteCsv}
          </button>
          {(SAMPLE_FILES[f.formatId] || f.activeFormat?.source === "builtin") && (
            <button type="button" className="font-medium text-[var(--accent)] hover:underline disabled:opacity-60" onClick={() => void loadSample()} disabled={loadingSample}>
              {t.trySample}
            </button>
          )}
        </div>
      )}

      {pasting && !hasFile && (
        <div className="mt-3">
          <textarea
            className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder:text-[color:rgba(var(--muted-rgb),0.5)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            rows={6}
            aria-label={t.pasteCsv}
            placeholder={t.pastePlaceholder}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rg-btn"
              disabled={!pasteText.trim()}
              onClick={() => {
                void f.handleFile(new File([pasteText], "pasted.csv", { type: "text/csv" }));
                setPasting(false);
              }}
            >
              {t.processCsv}
            </button>
            <button type="button" className="pill-btn" onClick={() => setPasting(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {f.workspaceEnabled && f.workspaceDocs.length === 0 && hasFile && f.lastUploadedText && (
        <button
          type="button"
          className={`mt-4 text-left text-sm underline hover:no-underline ${muted}`}
          onClick={() => {
            const id = `doc_${Date.now()}`;
            f.setWorkspaceDocs([{ id, name: f.fileName ?? "file.csv", text: f.lastUploadedText ?? "" }]);
            f.setActiveWorkspaceDocId(id);
          }}
        >
          {fmt(t.addToWorkspace, { limit: f.workspaceFileLimit })}
        </button>
      )}
    </section>
  );
}
