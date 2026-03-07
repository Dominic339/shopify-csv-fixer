// src/app/merge/MergeClient.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { parseCsv, toCsv } from "@/lib/csv";
import {
  mergeCsvFilesAdvanced,
  getMergeRowLimit,
  type MergeMode,
  type ConflictRule,
  type MergeResult,
} from "@/lib/mergeCsv";
import { getQuota } from "@/lib/quota";
import type { Plan } from "@/lib/quota";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type FileData = {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
};

export default function MergeClient() {
  const fileARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [fileA, setFileA] = useState<FileData | null>(null);
  const [fileB, setFileB] = useState<FileData | null>(null);
  const [mode, setMode] = useState<MergeMode>("append");
  const [dedupeKey, setDedupeKey] = useState<string>("");
  const [conflictRule, setConflictRule] = useState<ConflictRule>("keep_first");
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getQuota()
      .then((q) => setPlan(q.plan ?? "free"))
      .catch(() => {});
  }, []);

  const rowLimit = getMergeRowLimit(plan);

  async function handleFileLoad(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (d: FileData) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    setter({ name: file.name, headers, rows });
    setResult(null);
    setError(null);
  }

  // Shared headers for dedupe key selection
  const sharedHeaders =
    fileA && fileB
      ? fileA.headers.filter((h) => fileB.headers.includes(h))
      : fileA?.headers ?? [];

  function handleMerge() {
    if (!fileA || !fileB) {
      setError("Please upload both files.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = mergeCsvFilesAdvanced(
        fileA.headers,
        fileA.rows,
        fileB.headers,
        fileB.rows,
        {
          mode,
          dedupeKey: mode === "dedupe" ? dedupeKey || undefined : undefined,
          conflictRule,
          plan,
        }
      );
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? "Merge failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const csv = toCsv(result.headers, result.rows);
    const base = [fileA?.name ?? "fileA", fileB?.name ?? "fileB"]
      .map((n) => n.replace(/\.csv$/i, ""))
      .join("_");
    downloadCsv(`${base}_merged.csv`, csv);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">CSV Merger &amp; Deduplicator</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Combine two CSV files and optionally remove duplicates based on a shared column.
      </p>

      {rowLimit !== null && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]">
          Your plan: <span className="font-semibold capitalize">{plan}</span> — up to{" "}
          <span className="font-semibold">{rowLimit.toLocaleString()} combined rows</span>.{" "}
          {plan === "free" && (
            <a href="/profile?upgrade=basic" className="underline hover:no-underline">
              Upgrade for larger files.
            </a>
          )}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* File uploads */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold">File A</h2>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rgb-btn px-4 py-2 text-sm font-semibold text-[var(--text)]"
                onClick={() => fileARef.current?.click()}
              >
                Choose file
              </button>
              <span className="truncate text-xs text-[var(--muted)]">
                {fileA ? fileA.name : "No file"}
              </span>
            </div>
            {fileA && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {fileA.rows.length} rows · {fileA.headers.length} columns
              </p>
            )}
            <input
              ref={fileARef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileLoad(e, setFileA)}
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold">File B</h2>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rgb-btn px-4 py-2 text-sm font-semibold text-[var(--text)]"
                onClick={() => fileBRef.current?.click()}
              >
                Choose file
              </button>
              <span className="truncate text-xs text-[var(--muted)]">
                {fileB ? fileB.name : "No file"}
              </span>
            </div>
            {fileB && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {fileB.rows.length} rows · {fileB.headers.length} columns
              </p>
            )}
            <input
              ref={fileBRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileLoad(e, setFileB)}
            />
          </div>
        </div>

        {/* Options */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">Merge options</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-2">Mode</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="mode"
                    value="append"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                  />
                  Append (combine all rows)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="mode"
                    value="dedupe"
                    checked={mode === "dedupe"}
                    onChange={() => setMode("dedupe")}
                  />
                  Dedupe (remove duplicates)
                </label>
              </div>
            </div>

            {mode === "dedupe" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    Dedupe key column
                  </label>
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] [color-scheme:light] dark:[color-scheme:dark]"
                    value={dedupeKey}
                    onChange={(e) => setDedupeKey(e.target.value)}
                  >
                    <option value="">— choose a column —</option>
                    {sharedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                    {sharedHeaders.length === 0 &&
                      (fileA?.headers ?? []).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                  </select>
                  {fileA && fileB && sharedHeaders.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      No shared columns found. All columns from both files will appear.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-2">
                    When a duplicate is found
                  </label>
                  <div className="space-y-2">
                    {(
                      [
                        { value: "keep_first", label: "Keep file A version" },
                        { value: "keep_second", label: "Keep file B version" },
                        { value: "prefer_nonempty", label: "Prefer non-empty values (merge)" },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="conflictRule"
                          value={opt.value}
                          checked={conflictRule === opt.value}
                          onChange={() => setConflictRule(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Merge button */}
        <div>
          {error && (
            <div className="mb-3 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            type="button"
            className="rgb-btn px-6 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
            onClick={handleMerge}
            disabled={busy || !fileA || !fileB}
          >
            {busy ? "Merging…" : "Merge files"}
          </button>
        </div>

        {/* Schema compatibility warning — shown before merge and in results */}
        {fileA && fileB && (() => {
          const setA = new Set(fileA.headers);
          const setB = new Set(fileB.headers);
          const shared = fileA.headers.filter((h) => setB.has(h)).length;
          const total = new Set([...fileA.headers, ...fileB.headers]).size;
          const pct = total > 0 ? shared / total : 1;
          // Wildly incompatible: less than 25% overlap
          if (pct < 0.25 && total > 2) {
            return (
              <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                <span className="font-semibold">Schema mismatch warning:</span> these files share only{" "}
                {shared} of {total} unique columns ({Math.round(pct * 100)}%). Merging will produce many
                empty cells. Consider using the{" "}
                <a href="/convert" className="underline">Format Converter</a> to align schemas first.
              </div>
            );
          }
          return null;
        })()}

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-sm font-semibold">Merge summary</h2>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Rows from A</div>
                <div className="font-semibold">{result.rowsA.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Rows from B</div>
                <div className="font-semibold">{result.rowsB.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Duplicates found</div>
                <div className={`font-semibold ${result.duplicatesFound > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {result.duplicatesFound}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Output rows</div>
                <div className="font-semibold">{result.rowsOutput.toLocaleString()}</div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-[var(--muted)]">
                  Merge completed with warnings — missing columns are blank-filled:
                </p>
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)]"
                onClick={handleDownload}
              >
                Download merged CSV
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
        <a href="/app" className="hover:underline">CSV Fixer</a>
        <a href="/convert" className="hover:underline">Format Converter</a>
        <a href="/csv-inspector" className="hover:underline">CSV Inspector</a>
        <a href="/presets" className="hover:underline">Templates</a>
      </div>
    </main>
  );
}
