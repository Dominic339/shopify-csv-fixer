// src/app/convert/ConvertClient.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { parseCsv, toCsv } from "@/lib/csv";
import { convertCsv, CONVERT_FORMAT_OPTIONS, getConvertRowLimit } from "@/lib/convertCsv";
import { getQuota } from "@/lib/quota";
import type { Plan } from "@/lib/quota";
import { useTheme } from "@/components/theme/ThemeProvider";

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

export default function ConvertClient() {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [sourceFormatId, setSourceFormatId] = useState("shopify_products");
  const [targetFormatId, setTargetFormatId] = useState("woocommerce_products");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof convertCsv> | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getQuota()
      .then((q) => setPlan(q.plan ?? "free"))
      .catch(() => {});
  }, []);

  const rowLimit = getConvertRowLimit(plan);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setResult(null);
    setError(null);
  }

  function handleConvert() {
    if (!csvText) {
      setError("Please upload a CSV file first.");
      return;
    }
    if (sourceFormatId === safeTargetFormatId) {
      setError("Source and target formats must be different.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { headers, rows } = parseCsv(csvText);
      const out = convertCsv(headers, rows, sourceFormatId, safeTargetFormatId, plan);
      setResult(out);
    } catch (e: any) {
      setError(e?.message ?? "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const csv = toCsv(result.headers, result.rows);
    const base = (fileName ?? "converted").replace(/\.csv$/i, "");
    downloadCsv(`${base}_${targetFormatId}.csv`, csv);
  }

  const targetOptions = CONVERT_FORMAT_OPTIONS.filter((o) => o.id !== sourceFormatId);

  // If targetFormatId collides with the selected source, derive a safe fallback so
  // the controlled <select> always has a matching option and doesn't render blank.
  const safeTargetFormatId =
    targetFormatId !== sourceFormatId ? targetFormatId : (targetOptions[0]?.id ?? targetFormatId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">CSV Format Converter</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Convert between Shopify, WooCommerce, Etsy, eBay, and Amazon CSV formats. Fields that
        cannot map perfectly are flagged as warnings.
      </p>

      {rowLimit !== null && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]">
          Your plan: <span className="font-semibold capitalize">{plan}</span> — up to{" "}
          <span className="font-semibold">{rowLimit.toLocaleString()} rows</span> per conversion.{" "}
          {plan === "free" && (
            <a href="/profile?upgrade=basic" className="underline hover:no-underline">
              Upgrade for larger files.
            </a>
          )}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* Upload */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">1. Upload CSV</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Upload the file you want to convert.</p>
          <div className="mt-3 flex items-center gap-3">
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
            onChange={handleFileChange}
          />
        </div>

        {/* Format selection */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">2. Select formats</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Source format
              </label>
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                style={{ colorScheme: theme }}
                value={sourceFormatId}
                onChange={(e) => {
                  const newSource = e.target.value;
                  setSourceFormatId(newSource);
                  // If current target would now match source, auto-select first valid target
                  if (targetFormatId === newSource) {
                    const first = CONVERT_FORMAT_OPTIONS.find((o) => o.id !== newSource);
                    if (first) setTargetFormatId(first.id);
                  }
                  setResult(null);
                }}
              >
                {CONVERT_FORMAT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Target format
              </label>
              <select
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                style={{ colorScheme: theme }}
                value={safeTargetFormatId}
                onChange={(e) => {
                  setTargetFormatId(e.target.value);
                  setResult(null);
                }}
              >
                {targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Convert button */}
        <div>
          {error && (
            <div className="mb-3 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            type="button"
            className="rgb-btn px-6 py-3 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
            onClick={handleConvert}
            disabled={busy || !csvText}
          >
            {busy ? "Converting…" : "Convert"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-sm font-semibold">Conversion summary</h2>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Rows processed</div>
                <div className="font-semibold">{result.rowsProcessed.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Total rows</div>
                <div className="font-semibold">{result.rowsTotal.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Output columns</div>
                <div className="font-semibold">{result.headers.length}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">Warnings</div>
                <div className={`font-semibold ${result.warnings.length > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {result.warnings.length}
                </div>
              </div>
            </div>

            {/* Conversion quality indicator */}
            {result.warnings.length === 0 && result.unmappedSourceFields.length === 0 ? (
              <div className="mt-4 rounded-xl border border-green-400/40 bg-green-400/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
                All source fields mapped successfully. Output should be import-ready.
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300 font-medium">
                Converted with warnings — review dropped columns before importing.
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="mt-3 space-y-2">
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

            {result.unmappedSourceFields.length > 0 && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                <span className="font-semibold">Dropped columns</span> (no equivalent in target format):{" "}
                <span className="font-mono">{result.unmappedSourceFields.join(", ")}</span>
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)]"
                onClick={handleDownload}
              >
                Download converted CSV
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
        <a href="/app" className="hover:underline">CSV Fixer</a>
        <a href="/merge" className="hover:underline">CSV Merger</a>
        <a href="/csv-inspector" className="hover:underline">CSV Inspector</a>
        <a href="/presets" className="hover:underline">Templates</a>
      </div>
    </main>
  );
}
