"use client";

import { useEffect, useMemo, useState } from "react";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

type Severity = "error" | "warning" | "info";

type CsvRow = Record<string, string>;

type NormalizedIssue = {
  rowIndex: number; // 0-based (rowIndex < 0 means file-level issue)
  column?: string;
  message: string;
  suggestion?: string;
  severity: Severity;
  code?: string;
};

type Props = {
  headers: string[];
  rows: CsvRow[];
  issues: Array<{
    rowIndex?: number;
    row?: number; // legacy 1-based
    column?: string;
    field?: string;
    message: string;
    severity?: Severity;
    level?: Severity;
    suggestion?: string;
    code?: string;
  }>;
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;
  resetKey?: string;

  /** Needed for preset-specific tooltip metadata (Shopify, WooCommerce, etc.) */
  formatId?: string;
};

function severityChip(sev: Severity) {
  const base = "rounded-full px-2 py-0.5 text-xs font-semibold border";
  if (sev === "error")
    return (
      <span className={`${base} border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.10)] text-[var(--text)]`}>
        Error
      </span>
    );
  if (sev === "warning")
    return (
      <span className={`${base} border-[color:rgba(255,200,80,0.35)] bg-[color:rgba(255,200,80,0.12)] text-[var(--text)]`}>
        Warning
      </span>
    );
  return (
    <span className={`${base} border-[var(--border)] bg-[var(--surface)] text-[color:rgba(var(--muted-rgb),1)]`}>
      Info
    </span>
  );
}

export function EditableIssuesTable({ headers, rows, issues, onUpdateRow, resetKey, formatId }: Props) {
  const normalized = useMemo<NormalizedIssue[]>(() => {
    return (issues ?? [])
      .map((it) => {
        const rowIndex =
          typeof it.rowIndex === "number"
            ? it.rowIndex
            : typeof it.row === "number"
              ? Math.max(0, it.row - 1)
              : -1;

        const column = (it.column ?? it.field ?? "").toString();
        const severity = (it.severity ?? it.level ?? "error") as Severity;

        return {
          rowIndex,
          column: column || undefined,
          message: it.message,
          severity,
          suggestion: it.suggestion,
          code: it.code,
        };
      })
      .filter(Boolean);
  }, [issues]);

  const fileIssues = useMemo(() => normalized.filter((x) => x.rowIndex < 0), [normalized]);
  const rowIssues = useMemo(() => normalized.filter((x) => x.rowIndex >= 0), [normalized]);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    setExpandedRow(null);
  }, [resetKey]);

  function issueBoxClass(sev: Severity) {
    if (sev === "error") return "border-[color:rgba(255,80,80,0.25)] bg-[color:rgba(255,80,80,0.06)]";
    if (sev === "warning") return "border-[color:rgba(255,200,80,0.25)] bg-[color:rgba(255,200,80,0.08)]";
    return "border-[var(--border)] bg-[var(--surface-2)]";
  }

  function inputToneClass(rowIndex: number, col: string) {
    // highlight cells with issues
    const sev = rowIssues.find((x) => x.rowIndex === rowIndex && x.column === col)?.severity;
    if (sev === "error") return "border-[color:rgba(255,80,80,0.35)]";
    if (sev === "warning") return "border-[color:rgba(255,200,80,0.35)]";
    return "border-[var(--border)]";
  }

  function issueTooltip(issue: NormalizedIssue) {
    const meta = getIssueMeta(formatId, issue.code);
    if (!meta) return null;

    return (
      <span className="group relative inline-flex">
        <span
          className="ml-2 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[11px] text-[var(--muted)]"
          aria-label="Help"
        >
          ?
        </span>

        <span className="pointer-events-none absolute left-1/2 top-full z-50 hidden w-[320px] -translate-x-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text)] shadow-lg group-hover:block">
          <div className="text-sm font-semibold">{meta.title}</div>
          <div className="mt-2 text-[color:rgba(var(--muted-rgb),1)]">{meta.explanation}</div>

          <div className="mt-2 font-semibold">Why Shopify rejects it</div>
          <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">{meta.whyPlatformCares}</div>

          <div className="mt-2 font-semibold">How to fix</div>
          <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">{meta.howToFix}</div>

          {meta.autoFixable ? (
            <div className="mt-2 rounded-xl border border-[color:rgba(var(--accent-rgb),0.25)] bg-[color:rgba(var(--accent-rgb),0.10)] px-2 py-1 text-[11px]">
              Auto-fixable (safe)
            </div>
          ) : null}
        </span>
      </span>
    );
  }

  if (!normalized.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        No issues detected.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--text)]">Manual fixes</div>
        <div className="text-xs text-[var(--muted)]">
          Click a row to expand and edit fields inline.
        </div>
      </div>

      {fileIssues.length ? (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="text-sm font-semibold text-[var(--text)]">File-level issues</div>
          <div className="mt-2 space-y-2">
            {fileIssues.map((x, idx) => (
              <div
                key={`file-${idx}`}
                className={`rounded-2xl border p-3 ${issueBoxClass(x.severity)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {x.column ?? "(file)"} {issueTooltip(x)}
                  </div>
                  {severityChip(x.severity)}
                </div>

                <div className="mt-1 text-sm text-[var(--text)]">
                  {x.message} {issueTooltip(x)}
                </div>

                {x.suggestion ? (
                  <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                    Suggestion: {x.suggestion}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {rowIssues.map((iss, idx) => {
          const key = `${iss.rowIndex}-${iss.column}-${idx}`;
          const isOpen = expandedRow === iss.rowIndex;

          return (
            <div key={key} className={`rounded-2xl border p-3 ${issueBoxClass(iss.severity)}`}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedRow(isOpen ? null : iss.rowIndex)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    Row {iss.rowIndex + 1}
                    {iss.column ? ` · ${iss.column}` : ""} {issueTooltip(iss)}
                  </div>
                  {severityChip(iss.severity)}
                </div>
                <div className="mt-1 text-sm text-[var(--text)]">
                  {iss.message}
                  {issueTooltip(iss)}
                </div>
                {iss.suggestion ? (
                  <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                    Suggestion: {iss.suggestion}
                  </div>
                ) : null}
              </button>

              {isOpen ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {headers.map((h) => {
                    const v = rows[iss.rowIndex]?.[h] ?? "";
                    return (
                      <label key={`${iss.rowIndex}-${h}`} className="block">
                        <div className="mb-1 text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">
                          {h}
                        </div>
                        <input
                          className={`w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none ${inputToneClass(
                            iss.rowIndex,
                            h
                          )}`}
                          value={v}
                          onChange={(e) => onUpdateRow(iss.rowIndex, { [h]: e.target.value })}
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
