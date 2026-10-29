// src/app/merge/MergeClient.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { parseCsv, toCsv } from "@/lib/csv";
import {
  mergeCsvFilesAdvanced,
  getMergeRowLimit,
  type MergeMode,
  type ConflictRule,
  type MergeResult,
} from "@/lib/mergeCsv";
import type { Plan } from "@/lib/quota";
import { createClient } from "@/lib/supabase/browser";
import { FileDropZone } from "@/components/FileDropZone";
import type { Translations } from "@/lib/i18n/getTranslations";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref } from "@/lib/i18n/locales";
import { splitLocale } from "@/lib/i18n/paths";
import { useValidationText } from "@/lib/i18n/useValidationText";
import { readTextFile } from "@/lib/textFile";

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

type Props = {
  t: Translations["merge"];
};

export default function MergeClient({ t }: Props) {
  const { locale } = splitLocale(usePathname() ?? "/");
  const href = (p: string) => localeHref(locale, p);
  const vt = useValidationText(locale);
  const { theme } = useTheme();
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
    // Query Supabase directly for reliable plan detection (same as TopBar/AppClient)
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;
        if (!session?.user) { setPlan("free"); return; }
        const { data } = await supabase
          .from("user_subscriptions")
          .select("plan,status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!alive) return;
        const activePlan = data?.status === "active" ? (data.plan as Plan) : "free";
        setPlan(activePlan ?? "free");
      } catch {
        if (!alive) return;
        setPlan("free");
      }
    })();
    return () => { alive = false; };
  }, []);

  const rowLimit = getMergeRowLimit(plan);

  async function handleFileLoad(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (d: FileData) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFileData(file, setter);
  }

  async function loadFileData(file: File, setter: (d: FileData) => void) {
    const { text } = await readTextFile(file);
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
      setError(t.errNeedBoth);
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
      console.error(e);
      setError(t.errFailed);
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
      <h1 className="flex items-center gap-3 text-2xl font-semibold">
        {t.title}
        <span className="rounded-full bg-[var(--secondary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--secondary-text)]">{t.beta}</span>
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {t.description}
      </p>

      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]">
        {t.yourPlan}: <span className="font-semibold">{t[`plan_${plan}`]}</span>
        {rowLimit !== null ? (
          <> · {t.upTo}{" "}
          <span className="font-semibold">{rowLimit.toLocaleString()}</span> {t.combinedRows}</>
        ) : (
          <> · <span className="font-semibold">{t.planUnlimited}</span></>
        )}
        {plan === "free" && (
          <>{" "}<a href="/profile?upgrade=basic" className="underline hover:no-underline">
            {t.upgradeForLarger}
          </a></>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {/* File uploads */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FileDropZone onFile={(f) => void loadFileData(f, setFileA)}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold">{t.fileA}</h2>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rgb-btn px-4 py-2 text-sm font-semibold text-[var(--text)]"
                onClick={() => fileARef.current?.click()}
              >
                {t.chooseFile}
              </button>
              <span className="truncate text-xs text-[var(--muted)]">
                {fileA ? fileA.name : t.noFile}
              </span>
            </div>
            {fileA && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {fmt(t.fileStats, { rows: fileA.rows.length, columns: fileA.headers.length })}
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
          </FileDropZone>

          <FileDropZone onFile={(f) => void loadFileData(f, setFileB)}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold">{t.fileB}</h2>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rgb-btn px-4 py-2 text-sm font-semibold text-[var(--text)]"
                onClick={() => fileBRef.current?.click()}
              >
                {t.chooseFile}
              </button>
              <span className="truncate text-xs text-[var(--muted)]">
                {fileB ? fileB.name : t.noFile}
              </span>
            </div>
            {fileB && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {fmt(t.fileStats, { rows: fileB.rows.length, columns: fileB.headers.length })}
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
          </FileDropZone>
        </div>

        {/* Options */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">{t.mergeOptions}</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-2">{t.mode}</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="mode"
                    value="append"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                  />
                  {t.appendMode}
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="mode"
                    value="dedupe"
                    checked={mode === "dedupe"}
                    onChange={() => setMode("dedupe")}
                  />
                  {t.dedupeMode}
                </label>
              </div>
            </div>

            {mode === "dedupe" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    {t.dedupeKey}
                  </label>
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                    style={{ colorScheme: theme }}
                    value={dedupeKey}
                    onChange={(e) => setDedupeKey(e.target.value)}
                  >
                    <option value="">{t.chooseColumn}</option>
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
                      {t.noSharedColumns}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-2">
                    {t.whenDuplicate}
                  </label>
                  <div className="space-y-2">
                    {(
                      [
                        { value: "keep_first", label: t.keepFirst },
                        { value: "keep_second", label: t.keepSecond },
                        { value: "prefer_nonempty", label: t.preferNonEmpty },
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
            {busy ? t.merging : t.mergeFiles}
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
                <span className="font-semibold">{t.mismatchTitle}</span>{" "}
                {fmt(t.mismatchBody, { shared, total, pct: Math.round(pct * 100) })}{" "}
                <Link href={href("/convert")} className="underline">{t.linkConverter}</Link>
              </div>
            );
          }
          return null;
        })()}

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-sm font-semibold">{t.mergeSummary}</h2>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">{t.rowsFromA}</div>
                <div className="font-semibold">{result.rowsA.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">{t.rowsFromB}</div>
                <div className="font-semibold">{result.rowsB.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">{t.duplicatesFound}</div>
                <div className={`font-semibold ${result.duplicatesFound > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {result.duplicatesFound}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="text-[var(--muted)] text-xs">{t.outputRows}</div>
                <div className="font-semibold">{result.rowsOutput.toLocaleString()}</div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-[var(--muted)]">
                  {t.warningsIntro}
                </p>
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                  >
                    {vt.msg(w)}
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
                {t.downloadMerged}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
        <Link href={href("/app")} className="hover:underline">{t.linkFixer}</Link>
        <Link href={href("/convert")} className="hover:underline">{t.linkConverter}</Link>
        <Link href={href("/csv-inspector")} className="hover:underline">{t.linkInspector}</Link>
        <Link href={href("/presets")} className="hover:underline">{t.linkTemplates}</Link>
      </div>
    </main>
  );
}
