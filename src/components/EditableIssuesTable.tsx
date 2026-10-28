// src/components/EditableIssuesTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";
import { fmt, plural } from "@/lib/i18n/fmt";
import type { Translations } from "@/lib/i18n/getTranslations";

type Strings = Translations["app"];

type CsvRow = Record<string, string>;

type AnyIssue = {
  row?: number;
  rowIndex?: number;
  column?: string;
  field?: string;
  message: string;
  severity?: "error" | "warning" | "info";
  level?: "error" | "warning" | "info";
  code?: string;
  suggestion?: string;
  details?: Record<string, unknown>;
};

function normalizeRowIndex(it: AnyIssue) {
  if (typeof (it as any).rowIndex === "number") return (it as any).rowIndex as number;
  if (typeof it.row === "number") return Math.max(0, it.row - 1);
  return -1;
}

function normalizeSeverity(it: AnyIssue): "error" | "warning" | "info" {
  return ((it.severity ?? it.level ?? "error") as any) || "error";
}

export function EditableIssuesTable(props: {
  headers: string[];
  issues: AnyIssue[];
  rows: CsvRow[];
  onUpdateRow: (rowIndex: number, patch: Partial<CsvRow>) => void;
  resetKey: string;
  formatId: string;

  // ✅ Manual fixes is now a pinned worklist
  pinnedRows: number[];
  onUnpinRow: (rowIndex: number) => void;

  // ✅ NEW: cell-level highlight map (key = `${rowIndex}|||${header}`)
  cellSeverityMap: Map<string, "error" | "warning" | "info">;

  // Optional: let parent lock pinned rows while the user is editing.
  onRowEditStart?: (rowIndex: number) => void;
  onRowEditEnd?: (rowIndex: number) => void;

  t: Strings;
}) {
  const { t } = props;
  const { headers, issues, rows, onUpdateRow, resetKey, formatId, pinnedRows, onUnpinRow, cellSeverityMap } = props;

  // Expand state for pinned rows
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  // Render the worklist in pages; thousands of pinned rows would freeze the page.
  const PAGE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const visiblePinned = pinnedRows.slice(0, visibleCount);

  // Expand state for "Why is this blocking?" panels per issue instance
  const [openWhy, setOpenWhy] = useState<Record<string, boolean>>({});

  const toggleWhy = (key: string) => {
    setOpenWhy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // When switching formats/files, collapse
  useEffect(() => {
    setOpen(new Set());
    setOpenWhy({});
    setVisibleCount(PAGE);
  }, [resetKey]);

  const issuesByRow = useMemo(() => {
    const map = new Map<number, AnyIssue[]>();
    for (const it of issues ?? []) {
      const idx = normalizeRowIndex(it);
      if (idx < 0) continue;
      const arr = map.get(idx) ?? [];
      arr.push(it);
      map.set(idx, arr);
    }
    return map;
  }, [issues]);

  const rowCounts = useMemo(() => {
    const m = new Map<number, { errors: number; warnings: number; tips: number; hasEW: boolean }>();
    for (const idx of pinnedRows) {
      const list = issuesByRow.get(idx) ?? [];
      let errors = 0;
      let warnings = 0;
      let tips = 0;
      for (const it of list) {
        const sev = normalizeSeverity(it);
        if (sev === "error") errors++;
        else if (sev === "warning") warnings++;
        else tips++;
      }
      m.set(idx, { errors, warnings, tips, hasEW: errors + warnings > 0 });
    }
    return m;
  }, [pinnedRows.join("|"), issuesByRow]);

  function toggleOpen(rowIndex: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  const visibleHeaders = useMemo(() => {
    // keep UI sane; still “full row editing”
    // if you want literally every header shown always, remove slice(0, 40)
    return headers.slice(0, 40);
  }, [headers]);

  function cellSev(rowIndex: number, header: string): "error" | "warning" | "info" | undefined {
    return cellSeverityMap.get(`${rowIndex}|||${header}`);
  }

  function inputClassFor(sev?: "error" | "warning" | "info") {
    const base = "w-full rounded-xl border px-3 py-2 text-sm text-[var(--text)] outline-none";

    if (sev === "error") {
      return base + " border-[color:rgba(255,80,80,0.55)] bg-[color:rgba(255,80,80,0.12)] ring-1 ring-[color:rgba(255,80,80,0.25)]";
    }

    if (sev === "warning") {
      return base + " border-[color:rgba(255,200,0,0.55)] bg-[color:rgba(255,200,0,0.12)] ring-1 ring-[color:rgba(255,200,0,0.22)]";
    }

    return base + " border-[var(--border)] bg-[var(--surface)]";
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-[var(--text)]">{t.manualFixes}</div>
        <div className="text-xs text-[color:rgba(var(--muted-rgb),1)]">{t.manualFixesHint}</div>
      </div>

      {pinnedRows.length === 0 ? (
        <div className="mt-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          {t.noPinnedRows}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visiblePinned.map((rowIndex) => {
            const counts = rowCounts.get(rowIndex) ?? { errors: 0, warnings: 0, tips: 0, hasEW: false };
            const isOpen = open.has(rowIndex);
            const row = rows[rowIndex] ?? {};
            const list = issuesByRow.get(rowIndex) ?? [];

            return (
              <div
                key={rowIndex}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                onFocusCapture={() => props.onRowEditStart?.(rowIndex)}
                onBlurCapture={(e) => {
                  const next = (e.relatedTarget as Node | null);
                  if (!next || !(e.currentTarget as any).contains(next)) props.onRowEditEnd?.(rowIndex);
                }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => toggleOpen(rowIndex)}
                    aria-expanded={isOpen}
                    style={{ flex: 1 }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--text)]">{fmt(t.rowNumber, { row: rowIndex + 1 })}</div>

                      {counts.errors > 0 ? (
                        <span className="rounded-full border border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.10)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]">
                          {plural(counts.errors, t.errorCountOne, t.errorCount)}
                        </span>
                      ) : null}

                      {counts.warnings > 0 ? (
                        <span className="rounded-full border border-[color:rgba(255,200,0,0.35)] bg-[color:rgba(255,200,0,0.10)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]">
                          {plural(counts.warnings, t.warningCountOne, t.warningCount)}
                        </span>
                      ) : null}

                      {counts.tips > 0 ? (
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">
                          {plural(counts.tips, t.tipCountOne, t.tipCount)}
                        </span>
                      ) : null}

                      {!counts.hasEW && counts.tips === 0 ? (
                        <span className="rounded-full border border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.10)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]">
                          {t.rowClear}
                        </span>
                      ) : null}

                      <span className="text-xs text-[color:rgba(var(--muted-rgb),1)]">{isOpen ? t.collapseRow : t.expandRow}</span>
                    </div>
                  </button>

                  <button type="button" className="pill-btn" onClick={() => onUnpinRow(rowIndex)}>
                    {t.unpinRow}
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t border-[var(--border)] px-4 py-4">
                    {list.length ? (
                      <div className="mb-4 space-y-2">
                        <div className="text-xs font-semibold text-[color:rgba(var(--muted-rgb),1)]">{t.issuesInRow}</div>

                        {list.slice(0, 6).map((it, idx) => {
                          const sev = normalizeSeverity(it);
                          const title = (it.column ?? it.field ?? "(field)").toString();
                          const suggestion = (it as any).suggestion as string | undefined;
                          const code = (it as any).code as string | undefined;

                          const meta = code ? getIssueMeta(formatId, code) : undefined;
                          const why = meta?.whyPlatformCares;
                          const isBlocking = Boolean(meta?.blocking);

                          const whyKey = `${rowIndex}:${idx}:${code ?? title}`;
                          const showWhy = Boolean(openWhy[whyKey]);
                          const details = (it as any).details as any | undefined;

                          return (
                            <div
                              key={idx}
                              className={
                                "rounded-xl border p-3 text-sm " +
                                (sev === "error"
                                  ? "border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.08)]"
                                  : sev === "warning"
                                    ? "border-[color:rgba(255,200,0,0.35)] bg-[color:rgba(255,200,0,0.08)]"
                                    : "border-[var(--border)] bg-[var(--surface-2)]")
                              }
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-semibold text-[var(--text)]">{title}</div>
                                <div className="text-xs text-[color:rgba(var(--muted-rgb),1)]">{sev === "error" ? t.filterErrors : sev === "warning" ? t.filterWarnings : t.filterInfo}</div>
                              </div>

                              <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">{it.message}</div>

                              {isBlocking && why ? (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleWhy(whyKey)}
                                    className="text-xs font-semibold underline decoration-[color:rgba(var(--muted-rgb),0.6)] underline-offset-4 hover:opacity-90"
                                  >
                                    {t.whyBlocking}
                                  </button>
                                  {showWhy ? (
                                    <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                                      {why}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {code === "shopify/options_not_unique" &&
                              (Array.isArray(details?.duplicateCombos) ? details.duplicateCombos.length > 0 : Boolean(details?.duplicateCombo)) ? (
                                <div className="mt-2 rounded-lg border border-[color:rgba(255,200,0,0.25)] bg-[color:rgba(255,200,0,0.06)] p-2 text-xs">
                                  <div className="font-semibold">{t.duplicateCombos}</div>
                                  <div className="mt-1 text-[color:rgba(var(--muted-rgb),1)]">
                                    {(Array.isArray(details?.duplicateCombos) ? details.duplicateCombos : [{ options: details?.duplicateCombo, rows: details?.rows }])
                                      .slice(0, 3)
                                      .map((c: any, i: number) => (
                                        <div key={i} className={i ? "mt-2 pt-2 border-t border-[color:rgba(255,200,0,0.2)]" : ""}>
                                          <div>{t.duplicateCombo}</div>
                                          <div className="mt-1 space-y-0.5">
                                            {Object.entries((c?.options ?? c ?? {}) as Record<string, string>).map(([k, v]) => (
                                              <div key={k}>
                                                <span className="font-semibold text-[var(--text)]">{k}:</span>{" "}
                                                {String(v)}
                                              </div>
                                            ))}
                                          </div>
                                          {Array.isArray(c?.rows) ? <div className="mt-1">{fmt(t.rowsList, { rows: (c.rows as number[]).join(", ") })}</div> : null}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ) : null}

                              {suggestion ? (
                                <div className="mt-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                                  {t.suggestion}{" "}
                                  <span className="font-semibold text-[var(--text)]">
                                    {suggestion}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {list.length > 6 ? <div className="text-xs text-[color:rgba(var(--muted-rgb),1)]">{fmt(t.andMore, { count: list.length - 6 })}</div> : null}
                      </div>
                    ) : (
                      <div className="mb-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">{t.noRowIssues}</div>
                    )}

                    {/* ✅ FIELD-LEVEL highlighting happens here */}
                    <div className="grid gap-3 md:grid-cols-2">
                      {visibleHeaders.map((h) => {
                        const sev = cellSev(rowIndex, h);
                        return (
                          <label key={h} className="block">
                            <div className="mb-1 text-xs text-[color:rgba(var(--muted-rgb),1)]">{h}</div>
                            <input
                              className={inputClassFor(sev)}
                              value={row[h] ?? ""}
                              onChange={(e) => onUpdateRow(rowIndex, { [h]: e.target.value })}
                              aria-invalid={sev === "error" || undefined}
                            />
                          </label>
                        );
                      })}
                    </div>

                    {headers.length > visibleHeaders.length ? (
                      <div className="mt-3 text-xs text-[color:rgba(var(--muted-rgb),1)]">{fmt(t.showingFields, { count: visibleHeaders.length })}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {pinnedRows.length > visiblePinned.length ? (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              <span>
                {fmt(t.showingPinned, { shown: visiblePinned.length, total: pinnedRows.length })}
              </span>
              <button type="button" className="pill-btn" onClick={() => setVisibleCount((n) => n + PAGE)}>
                {fmt(t.showMore, { count: Math.min(PAGE, pinnedRows.length - visiblePinned.length) })}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
