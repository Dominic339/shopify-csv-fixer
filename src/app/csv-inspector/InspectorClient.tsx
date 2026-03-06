// src/app/csv-inspector/InspectorClient.tsx
"use client";

import React, { useRef, useState } from "react";
import { inspectCsv, type InspectorResult } from "@/lib/csvInspector";

const DELIMITER_LABELS: Record<string, string> = {
  ",": "Comma (,)",
  ";": "Semicolon (;)",
  "\t": "Tab",
  "|": "Pipe (|)",
};

export default function InspectorClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<InspectorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    try {
      const text = await file.text();
      const res = inspectCsv(text);
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? "Failed to inspect file.");
      setResult(null);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">CSV Inspector</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Free for everyone. Upload any CSV file to get an instant analysis — no account required.
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-semibold">Upload a CSV file</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Your file is processed entirely in your browser — it is never uploaded to a server.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="rgb-btn px-4 py-2 text-sm font-semibold text-[var(--text)]"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </button>
          <span className="text-sm text-[var(--muted)]">{fileName ?? "No file chosen"}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          data-testid="csv-inspector-input"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div
          className="mt-6 space-y-6"
          data-testid="inspector-results"
        >
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rows" value={result.rowCount.toLocaleString()} />
            <Stat label="Columns" value={result.columnCount.toLocaleString()} />
            <Stat
              label="Delimiter"
              value={DELIMITER_LABELS[result.delimiterGuess] ?? result.delimiterGuess}
            />
            <Stat
              label="Issues"
              value={result.warnings.length.toString()}
              highlight={result.warnings.length > 0}
            />
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Section title="Issues detected">
              <ul className="space-y-2">
                {result.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Encoding hints */}
          {result.suspiciousEncodingHints.length > 0 && (
            <Section title="Encoding hints">
              <ul className="space-y-2">
                {result.suspiciousEncodingHints.map((h, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-sm text-blue-800 dark:text-blue-300"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Duplicate headers */}
          {result.duplicateHeaders.length > 0 && (
            <Section title={`Duplicate headers (${result.duplicateHeaders.length})`}>
              <div className="flex flex-wrap gap-2">
                {result.duplicateHeaders.map((h) => (
                  <span
                    key={h}
                    className="rounded-lg border border-red-400/40 bg-red-400/10 px-2 py-1 font-mono text-xs text-red-700 dark:text-red-300"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Empty columns */}
          {result.emptyColumns.length > 0 && (
            <Section title={`Completely empty columns (${result.emptyColumns.length})`}>
              <div className="flex flex-wrap gap-2">
                {result.emptyColumns.map((h) => (
                  <span
                    key={h}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--muted)]"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Blank rows */}
          {result.blankRows.length > 0 && (
            <Section title={`Blank rows (${result.blankRows.length}${result.blankRows.length === 50 ? "+" : ""})`}>
              <p className="text-xs text-[var(--muted)]">
                Row numbers:{" "}
                {result.blankRows.join(", ")}
                {result.blankRows.length === 50 && "…"}
              </p>
            </Section>
          )}

          {/* Inconsistent column counts */}
          {result.inconsistentColumnCounts.length > 0 && (
            <Section
              title={`Inconsistent column counts (${result.inconsistentColumnCounts.length} rows)`}
            >
              <div className="max-h-40 overflow-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Expected</th>
                      <th className="px-3 py-2 text-left">Found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.inconsistentColumnCounts.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)] last:border-b-0"
                      >
                        <td className="px-3 py-1">{r.row}</td>
                        <td className="px-3 py-1">{r.expected}</td>
                        <td className="px-3 py-1 text-amber-600 dark:text-amber-400">{r.found}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {result.warnings.length === 0 &&
            result.suspiciousEncodingHints.length === 0 &&
            result.duplicateHeaders.length === 0 &&
            result.blankRows.length === 0 &&
            result.emptyColumns.length === 0 &&
            result.inconsistentColumnCounts.length === 0 && (
              <div className="rounded-2xl border border-green-400/40 bg-green-400/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">
                No issues detected. Your CSV looks clean.
              </div>
            )}
        </div>
      )}

      <div className="mt-10 space-y-3 text-sm text-[var(--muted)]">
        <p>
          Want to fix issues?{" "}
          <a href="/app" className="underline hover:no-underline">
            Open the CSV Fixer
          </a>{" "}
          for automatic validation and fixes.
        </p>
        <div className="flex flex-wrap gap-4">
          <a href="/convert" className="hover:underline">Format Converter</a>
          <a href="/merge" className="hover:underline">CSV Merger</a>
          <a href="/presets" className="hover:underline">Templates</a>
          <a href="/guides" className="hover:underline">Guides</a>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight ? "text-amber-600 dark:text-amber-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
