// src/app/csv-inspector/InspectorClient.tsx
"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { inspectCsv, type DetectedPlatform, type EncodingHint, type InspectorResult } from "@/lib/csvInspector";
import type { Translations } from "@/lib/i18n/getTranslations";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref } from "@/lib/i18n/locales";
import { splitLocale } from "@/lib/i18n/paths";
import { FileDropZone } from "@/components/FileDropZone";

type T = Translations["inspector"];

const PLATFORM_NAMES: Record<DetectedPlatform, string> = {
  shopify_products: "Shopify",
  woocommerce_products: "WooCommerce",
  etsy_listings: "Etsy",
  ebay_listings: "eBay",
  amazon_inventory_loader: "Amazon",
};

function delimiterLabel(t: T, d: string) {
  return { ",": t.delimComma, ";": t.delimSemicolon, "\t": t.delimTab, "|": t.delimPipe }[d] ?? d;
}

function hintText(t: T, h: EncodingHint) {
  return { bom: t.hintBom, replacement: t.hintReplacement, mojibake: t.hintMojibake, cp1252: t.hintCp1252 }[h];
}

type Props = { t: T };

export default function InspectorClient({ t }: Props) {
  const { locale } = splitLocale(usePathname() ?? "/");
  const href = (p: string) => localeHref(locale, p);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<InspectorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    e.target.value = "";
  }

  async function loadFile(file: File) {
    setFileName(file.name);
    setError(null);
    try {
      setResult(inspectCsv(await file.text()));
    } catch {
      setError(t.readFailed);
      setResult(null);
    }
  }

  const issueCount = result
    ? (result.unclosedQuote ? 1 : 0) +
      result.suspiciousEncodingHints.filter((h) => h !== "bom").length +
      result.duplicateHeaders.length +
      result.emptyHeaderColumns.length +
      result.paddedHeaders.length +
      result.emptyColumns.length +
      result.blankRowCount +
      result.inconsistentRowCount
    : 0;
  const clean = result !== null && issueCount === 0 && result.suspiciousEncodingHints.length === 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
        {t.title}
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {t.beta}
        </span>
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{t.description}</p>

      <FileDropZone onFile={(f) => void loadFile(f)}>
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold">{t.uploadTitle}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{t.privacyNote}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rgb-btn px-4 py-2 text-sm font-semibold text-[var(--text)]"
              onClick={() => fileInputRef.current?.click()}
            >
              {t.chooseFile}
            </button>
            <span className="min-w-0 break-all text-sm text-[var(--muted)]">{fileName ?? t.noFileChosen}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="hidden"
            data-testid="csv-inspector-input"
            onChange={handleFileChange}
          />
        </div>
      </FileDropZone>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4" data-testid="inspector-results">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t.rows} value={result.rowCount.toLocaleString(locale)} />
            <Stat label={t.columns} value={result.columnCount.toLocaleString(locale)} />
            <Stat label={t.delimiter} value={delimiterLabel(t, result.delimiterGuess)} />
            <Stat label={t.issues} value={issueCount.toLocaleString(locale)} highlight={issueCount > 0} />
          </div>

          {result.detectedPlatform && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">{fmt(t.looksLike, { platform: PLATFORM_NAMES[result.detectedPlatform] })}</p>
              <Link
                href={`${href("/app")}?preset=${result.detectedPlatform}`}
                className="rg-btn shrink-0 text-center"
              >
                {fmt(t.checkInFixer, { platform: PLATFORM_NAMES[result.detectedPlatform] })}
              </Link>
            </div>
          )}

          {result.unclosedQuote && (
            <Section title={t.unclosedQuoteTitle} tone="error">
              <p>{t.unclosedQuoteDesc}</p>
            </Section>
          )}

          {result.inconsistentRowCount > 0 && (
            <Section title={`${t.inconsistentColumns} (${result.inconsistentRowCount})`} tone="error">
              <p>{t.inconsistentDesc}</p>
              <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <tr>
                      <th className="px-3 py-2 text-left">{t.rowCol}</th>
                      <th className="px-3 py-2 text-left">{t.expectedCol}</th>
                      <th className="px-3 py-2 text-left">{t.foundCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.inconsistentColumnCounts.map((r) => (
                      <tr key={r.row} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-3 py-1">{r.row}</td>
                        <td className="px-3 py-1">{r.expected}</td>
                        <td className="px-3 py-1 text-amber-600 dark:text-amber-400">{r.found}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.inconsistentRowCount > result.inconsistentColumnCounts.length && (
                <p className="mt-2 text-xs">
                  {fmt(t.inconsistentMore, { shown: result.inconsistentColumnCounts.length, total: result.inconsistentRowCount })}
                </p>
              )}
            </Section>
          )}

          {result.duplicateHeaders.length > 0 && (
            <Section title={`${t.duplicateHeaders} (${result.duplicateHeaders.length})`} tone="error">
              <p>{t.duplicateHeadersDesc}</p>
              <Chips items={result.duplicateHeaders} />
            </Section>
          )}

          {result.emptyHeaderColumns.length > 0 && (
            <Section title={`${t.emptyHeadersTitle} (${result.emptyHeaderColumns.length})`} tone="warn">
              <p>{fmt(t.emptyHeadersDesc, { cols: result.emptyHeaderColumns.join(", ") })}</p>
            </Section>
          )}

          {result.paddedHeaders.length > 0 && (
            <Section title={`${t.paddedHeadersTitle} (${result.paddedHeaders.length})`} tone="warn">
              <p>{t.paddedHeadersDesc}</p>
              <Chips items={result.paddedHeaders} />
            </Section>
          )}

          {result.suspiciousEncodingHints.length > 0 && (
            <Section title={t.encoding} tone="info">
              <ul className="list-disc space-y-1 pl-5">
                {result.suspiciousEncodingHints.map((h) => (
                  <li key={h}>{hintText(t, h)}</li>
                ))}
              </ul>
            </Section>
          )}

          {result.emptyColumns.length > 0 && (
            <Section title={`${t.emptyColumns} (${result.emptyColumns.length})`} tone="warn">
              <p>{t.emptyColumnsDesc}</p>
              <Chips items={result.emptyColumns} />
            </Section>
          )}

          {result.blankRowCount > 0 && (
            <Section title={`${t.blankRows} (${result.blankRowCount})`} tone="warn">
              <p>
                {fmt(t.blankRowsDesc, { rows: result.blankRows.join(", ") })}
                {result.blankRowCount > result.blankRows.length &&
                  ` ${fmt(t.blankRowsMore, { count: result.blankRowCount - result.blankRows.length })}`}
              </p>
            </Section>
          )}

          {clean && (
            <div className="rounded-2xl border border-green-400/40 bg-green-400/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">
              {t.noIssues}
            </div>
          )}
        </div>
      )}

      <div className="mt-10 space-y-3 text-sm text-[var(--muted)]">
        <p>
          {t.nextSteps}{" "}
          <Link href={href("/app")} className="font-semibold text-[var(--text)] underline hover:no-underline">
            {t.openFixer}
          </Link>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href={href("/convert")} className="hover:underline">{t.converterLink}</Link>
          <Link href={href("/merge")} className="hover:underline">{t.mergerLink}</Link>
          <Link href={href("/presets")} className="hover:underline">{t.templatesLink}</Link>
          <Link href={href("/guides")} className="hover:underline">{t.guidesLink}</Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold ${highlight ? "text-amber-600 dark:text-amber-400" : ""}`}>{value}</div>
    </div>
  );
}

const TONES = {
  error: "border-red-400/40",
  warn: "border-amber-400/40",
  info: "border-blue-400/40",
};

function Section({ title, tone, children }: { title: string; tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border bg-[var(--surface)] p-5 ${TONES[tone]}`}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="text-sm text-[var(--muted)]">{children}</div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((h, i) => (
        <span
          key={`${h}-${i}`}
          className="max-w-full break-all rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--text)]"
        >
          {h}
        </span>
      ))}
    </div>
  );
}
