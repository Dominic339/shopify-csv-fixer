// src/components/EditableIssuesTable.tsx
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

  /**
   * Rows pinned in the Issues list. Rows can remain pinned even after their issues are resolved.
   * They only leave the pinned list when the user clicks Unpin.
   */
  pinnedRows?: number[];

  /** Called when a pinned row is manually unpinned. */
  onUnpinRow?: (rowIndex: number) => void;
};

function sevRank(sev: Severity) {
  return sev === "error" ? 0 : sev === "warning" ? 1 : 2;
}

function severityChip(sev: Severity) {
  const base = "rounded-full px-2 py-0.5 text-xs font-semibold border";
  if (sev === "error")
    return (
      <span
        className={`${base} border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.10)] text-[var(--text)]`}
      >
        Error
      </span>
    );
  if (sev === "warning")
    return (
      <span
        className={`${base} border-[color:rgba(255,200,80,0.35)] bg-[color:rgba(255,200,80,0.12)] text-[var(--text)]`}
      >
        Warning
      </span>
    );
  return (
    <span
      className={`${base} border-[var(--border)] bg-[var(--surface)] text-[color:rgba(var(--muted-rgb),1)]`}
    >
      Info
    </span>
  );
}

function resolvedChip() {
  const base = "rounded-full px-2 py-0.5 text-xs font-semibold border";
  return (
    <span
      className={`${base} border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.12)] text-[var(--text)]`}
    >
      Resolved
    </span>
  );
}

export function EditableIssuesTable({
  headers,
  rows,
  issues,
  onUpdateRow,
  resetKey,
  formatId,
  pinnedRows,
  onUnpinRow,
}: Props) {
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

        if (!it.message) return null;

        return {
          rowIndex,
          column: column || undefined,
          message: it.message,
          severity,
          suggestion: it.suggestion,
          code: it.code,
        };
      })
      .filter(Boolean) as NormalizedIssue[];
  }, [issues]);

  const fileIssues = useMemo(() => normalized.filter((x) => x.rowIndex < 0), [normalized]);
  const rowIssues = useMemo(() => normalized.filter((x) => x.rowIndex >= 0), [normalized]);

  // Group issues by row
  const issuesByRow = useMemo(() => {
    const map = new Map<number, NormalizedIssue[]>();
    for (const iss of rowIssues) {
      const arr = map.get(iss.rowIndex) ?? [];
      arr.push(iss);
      map.set(iss.rowIndex, arr);
    }

    // Sort issues within a row: severity, column, message
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const s = sevRank(a.severity) - sevRank(b.severity);
        if (s !== 0) return s;
        const c = (a.column ?? "").localeCompare(b.column ?? "");
        if (c !== 0) return c;
        return (a.message ?? "").localeCompare(b.message ?? "");
      });
      map.set(k, arr);
    }

    return map;
  }, [rowIssues]);

  // Stable row order: union of current-problem rows + pinned rows
  const problemRows = useMemo(() => {
    const set = new Set<number>();
    for (const k of issuesByRow.keys()) set.add(k);
    for (const k of pinnedRows ?? []) set.add(k);
    return Array.from(set).sort((a, b) => a - b);
  }, [issuesByRow, pinnedRows]);

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
    const rowArr = issuesByRow.get(rowIndex) ?? [];
    const sev = rowArr.find((x) => x.column === col)?.severity;
    if (sev === "error") return "border-[color:rgba(255,80,80,0.35)]";
    if (sev === "warning") return "border-[color:rgba(255,200,80,0.35)]";
    return "border-[var(--border)]";
  }

  // Solid, readable tooltip (non-transparent)
  function issueTooltip(issue: NormalizedIssue) {
    const meta = getIssueMeta(formatId, issue.code);
    if (!meta) return null;

    return (
      <span className="group relative inline-flex">
        <span
          className="ml-2 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] text-[var(--muted)]"
          aria-label="Help"
          title="More info"
        >
          ?
        </span>

        {/* NOTE: using a hard solid background so it's never see-through */}
        <span
          className="pointer-events-none absolute left-1/2 top-full z-50 hidden w-[340px] -translate-x-1/2 rounded-2xl border border-[var(--border)] p-3 text-xs text-[var(--text)] shadow-2xl group-hover:block"
          style={{ backgroundColor: "rgba(10,10,10,0.96)" }}
        >
          <div className="text-sm font-semibold">{(meta as any).title ?? "Issue"}</div>

          {(meta as any).explanation ? (
            <div className="mt-2 text-[color:rgba(var(--muted-rgb),1)]">{(meta as any).explanation}</div>
          ) : null}

          {(meta as any).whyPlatformCares ? (
            <>
              <div className="mt-3 font-semibold text-[var(--text)]">Why the platform cares</div>
              <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">{(meta as any).whyPlatformCares}</div>
            </>
          ) : null}

          {(meta as any).howToFix ? (
            <>
              <div className="mt-3 font-semibold text-[var(--text)]">How to fix</div>
              <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">{(meta as any).howToFix}</div>
            </>
          ) : null}

          {(meta as any).autoFixable ? (
            <div className="mt-3 rounded-xl border border-[color:rgba(var(--accent-rgb),0.25)] bg-[color:rgba(var(--accent-rgb),0.10)] px-2 py-1 text-[11px]">
              Auto-fixable (safe)
            </div>
          ) : null}
        </span>
      </span>
    );
  }

  if (!normalized.length && !(pinnedRows?.length ?? 0)) {
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
        <div className="text-xs text-[var(--muted)]">Click a row to expand and edit fields inline.</div>
      </div>

      {fileIssues.length ? (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="text-sm font-semibold text-[var(--text)]">File-level issues</div>
          <div className="mt-2 space-y-2">
            {fileIssues.map((x, idx) => (
              <div key={`file-${idx}`} className={`rounded-2xl border p-3 ${issueBoxClass(x.severity)}`}>
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
                  <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">Suggestion: {x.suggestion}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Grouped-by-row issues (Row appears once) */}
      <div className="mt-3 space-y-2">
        {problemRows.map((rowIndex) => {
          const rowArr = issuesByRow.get(rowIndex) ?? [];
          const isOpen = expandedRow === rowIndex;

          let errors = 0;
          let warnings = 0;
          let infos = 0;
          for (const it of rowArr) {
            if (it.severity === "error") errors++;
            else if (it.severity === "warning") warnings++;
            else infos++;
          }

          const hasActiveIssues = rowArr.length > 0;

          // Use the "worst" severity for the row box tone
          const rowTone: Severity = hasActiveIssues
            ? rowArr.reduce<Severity>((acc, cur) => {
                if (acc === "error") return acc;
                if (acc === "warning" && cur.severity === "error") return "error";
                if (acc === "info" && (cur.severity === "error" || cur.severity === "warning")) return cur.severity;
                return acc;
              }, "info")
            : "info";

          return (
            <div key={`row-${rowIndex}`} className={`rounded-2xl border p-3 ${issueBoxClass(rowTone)}`}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedRow(isOpen ? null : rowIndex)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    Row {rowIndex + 1}
                    {hasActiveIssues ? (
                      <span className="ml-2 text-xs font-normal text-[color:rgba(var(--muted-rgb),1)]">
                        {errors ? `${errors} errors` : ""}
                        {warnings ? (errors ? `, ${warnings} warnings` : `${warnings} warnings`) : ""}
                        {infos ? ((errors || warnings) ? `, ${infos} tips` : `${infos} tips`) : ""}
                      </span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-[color:rgba(var(--muted-rgb),1)]">0 issues</span>
                    )}
                  </div>

                  {hasActiveIssues ? (
                    severityChip(rowTone)
                  ) : (
                    <div className="flex items-center gap-2">
                      {resolvedChip()}
                      {onUnpinRow ? (
                        <button
                          type="button"
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onUnpinRow(rowIndex);
                          }}
                          title="Remove this resolved row from the Issues list"
                        >
                          Unpin
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                  {isOpen ? "Click to collapse" : hasActiveIssues ? "Click to expand and fix" : "Resolved (unpin when you’re ready)"}
                </div>
              </button>

              {isOpen ? (
                <div className="mt-3 space-y-3">
                  {/* Issues for this row */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">Issues in this row</div>
                    <div className="mt-2 space-y-2">
                      {hasActiveIssues ? (
                        rowArr.map((iss, idx) => (
                          <div key={`${rowIndex}-iss-${idx}`} className={`rounded-2xl border p-3 ${issueBoxClass(iss.severity)}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-[var(--text)]">
                                {iss.column ? iss.column : "(row)"} {issueTooltip(iss)}
                              </div>
                              {severityChip(iss.severity)}
                            </div>

                            <div className="mt-1 text-sm text-[var(--text)]">
                              {iss.message} {issueTooltip(iss)}
                            </div>

                            {iss.suggestion ? (
                              <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                                Suggestion: {iss.suggestion}
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                          No current issues remain on this row. You can unpin it when you’re ready.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline editor grid */}
                  <div className="grid gap-2 md:grid-cols-2">
                    {headers.map((h) => {
                      const v = rows[rowIndex]?.[h] ?? "";
                      return (
                        <label key={`${rowIndex}-${h}`} className="block">
                          <div className="mb-1 text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">{h}</div>
                          <input
                            className={`w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none ${inputToneClass(
                              rowIndex,
                              h
                            )}`}
                            value={v}
                            onChange={(e) => onUpdateRow(rowIndex, { [h]: e.target.value })}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
