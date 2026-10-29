// src/app/tools/ToolKit.tsx
// Building blocks shared by the small tools: the upload box, the loaded-file bar, a
// preview table, downloads and the hand-off to the CSV Fixer.
"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { FileDropZone } from "@/components/FileDropZone";
import { card, muted } from "@/app/app/fixer/ui";
import { parseCsv, toCsv, type CsvRow } from "@/lib/csv";
import type { Translations } from "@/lib/i18n/getTranslations";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref } from "@/lib/i18n/locales";
import { splitLocale } from "@/lib/i18n/paths";
import { stashPendingFile } from "@/lib/passCheckout";
import { readTextFile, type TextEncodingName } from "@/lib/textFile";

export type ToolStrings = Translations["smallTools"];

export type LoadedCsv = {
  name: string;
  headers: string[];
  rows: CsvRow[];
  encoding: TextEncodingName;
  hadBom: boolean;
};

export { card, muted };

export const label = "text-sm font-semibold text-[var(--text)]";
export const input =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

/** Save text or bytes as a file. */
export function download(name: string, data: string | Uint8Array, type = "text/csv;charset=utf-8") {
  const blob = new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "file";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Read and parse a CSV upload; errors come back as translated messages. */
export async function loadCsv(file: File, t: ToolStrings): Promise<LoadedCsv | string> {
  try {
    const { text, encoding, hadBom } = await readTextFile(file);
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) return t.readError;
    if (parsed.rows.length === 0) return t.emptyFile;
    return { name: file.name, headers: parsed.headers, rows: parsed.rows, encoding, hadBom };
  } catch {
    return t.readError;
  }
}

/** The upload box shown before a file is loaded. */
export function UploadBox({
  t,
  onFile,
  accept = ".csv,.txt,.tsv,text/csv",
  acceptName,
  title,
  error,
}: {
  t: ToolStrings;
  onFile: (file: File) => void;
  accept?: string;
  acceptName?: RegExp;
  title?: string;
  error?: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <FileDropZone onFile={onFile} dropLabel={t.dropHere} accept={acceptName}>
      <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
        <p className="text-base text-[var(--text)]">{title ?? t.dropTitle}</p>
        <button type="button" className="rg-btn mt-4" onClick={() => ref.current?.click()}>
          {t.choose}
        </button>
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <p className={`mt-4 text-xs ${muted}`}>{t.privacy}</p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </FileDropZone>
  );
}

/** The bar shown once a file is loaded. */
export function FileBar({ name, info, onReset, t }: { name: string; info: string; onReset: () => void; t: ToolStrings }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--text)]">{name}</p>
        <p className={`text-sm ${muted}`}>{info}</p>
      </div>
      <button type="button" className="rgb-btn px-4 py-2 text-sm" onClick={onReset}>
        {t.useAnother}
      </button>
    </div>
  );
}

/** First rows of a table, with optional highlighted cells ("row:column"). */
export function Preview({
  headers,
  rows,
  t,
  limit = 8,
  highlight,
}: {
  headers: string[];
  rows: CsvRow[] | string[][];
  t: ToolStrings;
  limit?: number;
  highlight?: Set<string>;
}) {
  const shown = rows.slice(0, limit);
  const cell = (r: CsvRow | string[], h: string, i: number) => (Array.isArray(r) ? r[i] : r[h]) ?? "";
  return (
    <div>
      <div className="data-table-wrap">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={`${h}-${i}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((h, i) => (
                    <td
                      key={`${h}-${i}`}
                      className={`max-w-[14rem] truncate ${highlight?.has(`${ri}:${h}`) ? "bg-[var(--accent-soft)] font-medium" : ""}`}
                      title={cell(r, h, i)}
                    >
                      {cell(r, h, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className={`mt-2 text-xs ${muted}`}>{fmt(t.previewNote, { shown: shown.length, total: rows.length })}</p>
    </div>
  );
}

/** Guess the fixer format from the columns, so the hand-off opens the right rules. */
function guessFormat(headers: string[]): string {
  const has = (h: string) => headers.includes(h);
  if (has("Handle") && (has("Variant SKU") || has("Title"))) return "shopify_products";
  if (has("Type") && has("Parent")) return "woocommerce_variable_products";
  if (has("Regular price") || has("Regular Price")) return "woocommerce_products";
  if (has("TITLE") && has("TAGS")) return "etsy_listings";
  if (headers.some((h) => /^\*?Action\b/.test(h))) return "ebay_listings";
  if (has("sku") && has("product-id")) return "amazon_inventory_loader";
  return "";
}

/** Download button plus "Check it in the CSV Fixer". */
export function ResultActions({
  t,
  fileName,
  headers,
  rows,
  primaryLabel,
  bom = false,
  children,
}: {
  t: ToolStrings;
  fileName: string;
  headers: string[];
  rows: CsvRow[];
  primaryLabel?: string;
  bom?: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const { locale } = splitLocale(usePathname() ?? "/");
  const csv = () => (bom ? "﻿" : "") + toCsv(headers, rows);
  const toFixer = () => {
    const formatId = guessFormat(headers);
    stashPendingFile({ tool: "fixer", formatId, name: fileName, text: toCsv(headers, rows) });
    router.push(localeHref(locale, formatId ? `/app?preset=${formatId}` : "/app"));
  };
  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" className="rg-btn justify-center px-5 py-2.5" onClick={() => download(fileName, csv())}>
          {primaryLabel ?? t.downloadCsv}
        </button>
        {children}
        <button type="button" className="rgb-btn justify-center px-5 py-2.5 text-sm" onClick={toFixer}>
          {t.checkInFixer}
        </button>
      </div>
      <p className={`mt-3 text-xs ${muted}`}>{t.nextStep}</p>
    </div>
  );
}

/** Loaded file state with the error message for a failed load. */
export function useCsvUpload(t: ToolStrings) {
  const [file, setFile] = useState<LoadedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onFile(f: File) {
    setBusy(true);
    const res = await loadCsv(f, t);
    setBusy(false);
    if (typeof res === "string") {
      setError(res);
      setFile(null);
    } else {
      setError(null);
      setFile(res);
    }
  }
  return { file, error, busy, onFile, reset: () => setFile(null) };
}
