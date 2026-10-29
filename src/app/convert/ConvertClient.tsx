// src/app/convert/ConvertClient.tsx
// Convert a product CSV from one platform's layout to another's, in the browser.
// Converting is free; downloading counts as an export like the fixer's.
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { parseCsv, toCsv } from "@/lib/csv";
import { convertCsv, CONVERT_FORMAT_OPTIONS, type ConvertResult } from "@/lib/convertCsv";
import { CONVERT_ROUTES, routeFor } from "@/lib/convertRoutes";
import { consumeExport } from "@/lib/quota";
import { FREE_ROWS_PER_EXPORT, PASS_PRICE_LABEL } from "@/lib/plans";
import { clearPendingFile, loginHrefForHere, stashPendingFile, startPassCheckout, takePendingFile } from "@/lib/passCheckout";
import { createClient } from "@/lib/supabase/browser";
import { trackToolEvent } from "@/lib/analytics";
import type { Translations } from "@/lib/i18n/getTranslations";
import { FileDropZone } from "@/components/FileDropZone";
import { localeHref } from "@/lib/i18n/locales";
import { splitLocale } from "@/lib/i18n/paths";
import { fmt } from "@/lib/i18n/fmt";
import { useValidationText } from "@/lib/i18n/useValidationText";
import { card, muted, platformLabel, StepTitle } from "@/app/app/fixer/ui";
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

/** Targets that have a fixer preset to check the converted file with. */
const FIXER_PRESETS = new Set(["shopify_products", "woocommerce_products", "woocommerce_variable_products", "etsy_listings", "ebay_listings", "amazon_inventory_loader"]);

const PREVIEW_ROWS = 5;
const PREVIEW_COLS = 8;

type Props = {
  t: Translations["convert"];
  /** Preselected formats, e.g. on a /migrate/<route> page. */
  initialSource?: string;
  initialTarget?: string;
  /** Hide the page title (the host page has its own heading). */
  embedded?: boolean;
};

export default function ConvertClient({ t, initialSource = "shopify_products", initialTarget = "woocommerce_products", embedded = false }: Props) {
  const { locale } = splitLocale(usePathname() ?? "/");
  const href = (p: string) => localeHref(locale, p);
  const router = useRouter();
  const vt = useValidationText(locale);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceFormatId, setSourceFormatId] = useState(initialSource);
  const [targetFormatId, setTargetFormatId] = useState(initialTarget);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  /** "Etsy", "Shopify" … for sentences; the select shows the full format names. */
  const platform = (id: string) => platformLabel(id === "shopify_products_legacy" ? "shopify_products" : id) || label(id);
  const label = (id: string) => (t as Record<string, string>)[`fmt_${id}`] ?? CONVERT_FORMAT_OPTIONS.find((o) => o.id === id)?.label ?? id;
  const targetOptions = CONVERT_FORMAT_OPTIONS.filter((o) => o.id !== sourceFormatId);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => setSignedIn(Boolean(session?.user)))
      .catch(() => {});
  }, []);

  // Pick up a file stashed before sign-in / pass checkout.
  useEffect(() => {
    const pending = takePendingFile("convert");
    if (!pending) return;
    const [src, tgt] = pending.formatId.split(">");
    if (src) setSourceFormatId(src);
    if (tgt) setTargetFormatId(tgt);
    setFileName(pending.name);
    setCsvText(pending.text);
    setInfo(t.fileRestored);
  }, [t.fileRestored]);

  const runConvert = useCallback(
    (text: string, src: string, tgt: string) => {
      if (src === tgt) {
        setError(t.errSameFormat);
        setResult(null);
        return;
      }
      setBusy(true);
      setError(null);
      setLimitHit(false);
      try {
        const { headers, rows } = parseCsv(text);
        const out = convertCsv(headers, rows, src, tgt);
        setResult(out);
        trackToolEvent("convert_complete", { source: src, target: tgt, rows: out.rowsTotal, warnings: out.warnings.length });
      } catch (e) {
        console.error(e);
        setError(t.errFailed);
        setResult(null);
      } finally {
        setBusy(false);
      }
    },
    [t.errFailed, t.errSameFormat]
  );

  // Convert as soon as there is a file, and again whenever a format changes.
  useEffect(() => {
    if (csvText) runConvert(csvText, sourceFormatId, targetFormatId);
  }, [csvText, sourceFormatId, targetFormatId, runConvert]);

  async function loadFile(file: File) {
    setFileName(file.name);
    setInfo(null);
    setCsvText((await readTextFile(file)).text);
  }

  function chooseSource(id: string) {
    setSourceFormatId(id);
    if (id === targetFormatId) {
      const first = CONVERT_FORMAT_OPTIONS.find((o) => o.id !== id);
      if (first) setTargetFormatId(first.id);
    }
  }

  function swap() {
    const s = sourceFormatId;
    setSourceFormatId(targetFormatId);
    setTargetFormatId(s);
  }

  const outName = `${(fileName ?? "products").replace(/\.(csv|txt|tsv)$/i, "")}_${targetFormatId}.csv`;

  async function handleDownload() {
    if (!result) return;
    setError(null);
    try {
      await consumeExport(result.rows.length);
      downloadCsv(outName, toCsv(result.headers, result.rows));
      trackToolEvent("convert_downloaded", { source: sourceFormatId, target: targetFormatId, rows: result.rows.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/limit|quota/i.test(msg)) setLimitHit(true);
      else setError(msg || t.errFailed);
    }
  }

  /** Hand the converted file to the fixer, with the target's preset selected. */
  function checkInFixer() {
    if (!result) return;
    stashPendingFile({ tool: "fixer", formatId: targetFormatId, name: outName, text: toCsv(result.headers, result.rows) });
    router.push(`${href("/app")}?preset=${encodeURIComponent(targetFormatId)}`);
  }

  async function buyPass() {
    if (csvText) stashPendingFile({ tool: "convert", formatId: `${sourceFormatId}>${targetFormatId}`, name: fileName ?? "products.csv", text: csvText });
    setPassBusy(true);
    const r = await startPassCheckout();
    if (r === "signin") {
      window.location.href = loginHrefForHere();
      return;
    }
    if (r !== "redirected") {
      clearPendingFile();
      setPassBusy(false);
      setError(t.passError);
    }
  }

  const preview = useMemo(() => {
    if (!result) return null;
    const cols = result.headers.slice(0, PREVIEW_COLS);
    return { cols, rows: result.rows.slice(0, PREVIEW_ROWS), more: result.headers.length - cols.length };
  }, [result]);

  const selectCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)]";
  const migration = routeFor(sourceFormatId, targetFormatId);

  return (
    <div className={embedded ? "" : "mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12"}>
      {!embedded && (
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">{t.title}</h1>
          <p className={`mt-2 max-w-2xl text-base ${muted}`}>{t.description}</p>
        </header>
      )}

      <div className="space-y-5">
        {/* 1. Formats */}
        <section className={`${card} p-5 sm:p-7`}>
          <StepTitle n={1}>{t.selectFormats}</StepTitle>
          <div className="mt-5 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <label className="block">
              <span className={`mb-1.5 block text-xs font-medium ${muted}`}>{t.sourceFormat}</span>
              <select className={selectCls} value={sourceFormatId} onChange={(e) => chooseSource(e.target.value)}>
                {CONVERT_FORMAT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {label(o.id)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pill-btn h-[42px] justify-center px-3" onClick={swap} aria-label={t.swap} title={t.swap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sm:rotate-0 rotate-90">
                <path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4" />
              </svg>
            </button>
            <label className="block">
              <span className={`mb-1.5 block text-xs font-medium ${muted}`}>{t.targetFormat}</span>
              <select className={selectCls} value={targetFormatId} onChange={(e) => setTargetFormatId(e.target.value)}>
                {targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {label(o.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {migration && !embedded && (
            <p className={`mt-4 text-sm ${muted}`}>
              <Link href={`/migrate/${migration.slug}`} className="font-medium text-[var(--secondary-text)] hover:underline">
                {fmt(t.migrationGuide, { from: migration.sourceName, to: migration.targetName })} →
              </Link>
            </p>
          )}
        </section>

        {/* 2. Upload */}
        <FileDropZone onFile={(f) => void loadFile(f)}>
          <section className={`${card} p-5 sm:p-7`}>
            <StepTitle n={2}>{t.uploadStep}</StepTitle>
            <p className={`mt-2 text-sm ${muted}`}>{fmt(t.uploadDescFrom, { platform: platform(sourceFormatId) })}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4">
              <button type="button" className="rg-btn" onClick={() => fileInputRef.current?.click()}>
                {fileName ? t.chooseAnother : t.chooseFile}
              </button>
              <span className={`min-w-0 truncate text-sm ${fileName ? "text-[var(--text)]" : muted}`}>{fileName ?? t.dropHint}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            {info && <p className="mt-3 text-sm text-[var(--accent-text)]">{info}</p>}
          </section>
        </FileDropZone>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* 3. Result */}
        {result && preview && (
          <section className={`${card} p-5 sm:p-7`} aria-busy={busy}>
            <StepTitle n={3}>{t.resultStep}</StepTitle>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: t.rowsInFile, v: result.rowsTotal.toLocaleString(locale) },
                { k: t.rowsOut, v: result.rows.length.toLocaleString(locale) },
                { k: t.outputColumns, v: String(result.headers.length) },
                { k: t.warnings, v: String(result.warnings.length), warn: result.warnings.length > 0 },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <div className={`text-2xl font-bold ${s.warn ? "text-amber-600 dark:text-amber-400" : "text-[var(--text)]"}`}>{s.v}</div>
                  <div className={`text-xs ${muted}`}>{s.k}</div>
                </div>
              ))}
            </div>

            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                result.warnings.length
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-800 dark:text-amber-300"
                  : "border-[rgba(var(--accent-rgb),0.35)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
              }`}
            >
              {result.warnings.length ? t.convertedWithWarnings : t.allMapped}
              {result.warnings.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{vt.msg(w)}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Preview */}
            <h3 className="mt-6 text-sm font-semibold text-[var(--text)]">{fmt(t.previewTitle, { rows: Math.min(PREVIEW_ROWS, result.rows.length) })}</h3>
            <div className="data-table-wrap mt-2">
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {preview.cols.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i}>
                        {preview.cols.map((c) => (
                          <td key={c} className="max-w-[16rem] truncate" title={r[c]}>
                            {r[c]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {preview.more > 0 && <p className={`mt-2 text-xs ${muted}`}>{fmt(t.moreColumns, { count: preview.more })}</p>}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="button" className="rg-btn justify-center" onClick={() => void handleDownload()} disabled={busy}>
                {t.downloadConverted}
              </button>
              {FIXER_PRESETS.has(targetFormatId) && (
                <button type="button" className="rgb-btn justify-center px-5 py-2.5 text-sm" onClick={checkInFixer}>
                  {fmt(t.checkInFixer, { platform: platform(targetFormatId) })}
                </button>
              )}
            </div>
            <p className={`mt-3 text-xs ${muted}`}>{fmt(t.freeNote, { rows: FREE_ROWS_PER_EXPORT })}</p>

            {limitHit && (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                {t.limitReached} {fmt(t.freeNote, { rows: FREE_ROWS_PER_EXPORT })}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <button type="button" className="rg-btn is-secondary mt-3 justify-center" onClick={() => void buyPass()} disabled={passBusy}>
                    {passBusy ? t.passStarting : fmt(signedIn ? t.passCta : t.passSignIn, { price: PASS_PRICE_LABEL })}
                  </button>
                  <Link href={`${href("/")}#pricing`} className="mt-1 font-semibold underline sm:mt-3">
                    {t.viewPlans}
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {!embedded && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t.popularMigrations}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONVERT_ROUTES.map((r) => (
              <li key={r.slug}>
                <Link href={`/migrate/${r.slug}`} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text)] hover:border-[rgba(var(--accent-rgb),0.5)]">
                  {fmt(t.routeLabel, { from: r.sourceName, to: r.targetName })}
                  <span className={muted}>→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={`mt-8 flex flex-wrap gap-4 text-sm ${muted}`}>
            <Link href={href("/app")} className="hover:underline">{t.linkFixer}</Link>
            <Link href={href("/merge")} className="hover:underline">{t.linkMerger}</Link>
            <Link href={href("/csv-inspector")} className="hover:underline">{t.linkInspector}</Link>
            <Link href={href("/presets")} className="hover:underline">{t.linkTemplates}</Link>
          </div>
        </section>
      )}
    </div>
  );
}
