"use client";

import { EditableIssuesTable } from "@/components/EditableIssuesTable";
import { fmt } from "@/lib/i18n/fmt";
import type { AppStrings, Fixer } from "./useFixer";
import { card, muted } from "./ui";

const FILTERS = ["all", "error", "warning", "info"] as const;

function cellClass(sev?: "error" | "warning" | "info") {
  const base = "w-full rounded-lg border px-2 py-1 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--ring)]";
  if (sev === "error") return `${base} border-[color:rgba(255,80,80,0.55)] bg-[color:rgba(255,80,80,0.12)]`;
  if (sev === "warning") return `${base} border-[color:rgba(255,200,0,0.55)] bg-[color:rgba(255,200,0,0.12)]`;
  return `${base} border-[var(--border)] bg-[var(--surface)]`;
}

/** Issues to fix: filters, an editable preview of the file, and the pinned "manual fixes" worklist. */
export function IssuesPanel({ f, t, sectionRef }: { f: Fixer; t: AppStrings; sectionRef: React.Ref<HTMLElement> }) {
  const filterLabel = { all: t.filterAll, error: t.filterErrors, warning: t.filterWarnings, info: t.filterInfo };
  const countFor = (sev: (typeof FILTERS)[number]) => (sev === "all" ? f.issuesForTable.length : f.issuesForTable.filter((i) => i.severity === sev).length);
  const fileLevel = f.issuesForDisplay.filter((i) => i.rowIndex < 0);
  const morePinned = f.pinnedSorted.length - f.previewRows.filter((r) => f.effectivePinnedRows.has(r)).length;

  return (
    <section ref={sectionRef} className={`${card} scroll-mt-24 p-5 sm:p-7`}>
      <h2 className="text-lg font-semibold text-[var(--text)] sm:text-xl">{t.issues}</h2>
      <p className={`mt-2 text-sm sm:text-base ${muted}`}>{t.editHelp}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label={t.issues}>
        {FILTERS.map((sev) => (
          <button
            key={sev}
            type="button"
            role="tab"
            aria-selected={f.issueSeverityFilter === sev}
            className={`pill-btn ${f.issueSeverityFilter === sev ? "is-active" : ""}`}
            onClick={() => f.setIssueSeverityFilter(sev)}
          >
            {filterLabel[sev]} <span className={`ml-1 ${muted}`}>{countFor(sev)}</span>
          </button>
        ))}
      </div>

      {fileLevel.length > 0 && (
        <ul className="mt-4 space-y-2">
          {fileLevel.map((i, idx) => (
            <li
              key={idx}
              className={`rounded-xl border p-3 text-sm ${
                i.severity === "error" ? "border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.08)]" : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
            >
              <span className="font-semibold text-[var(--text)]">{t.wholeFile}:</span> <span className={muted}>{f.vt.msg(i.message)}</span>
              {i.suggestion ? <div className={`mt-1 text-xs ${muted}`}>{f.vt.msg(i.suggestion)}</div> : null}
            </li>
          ))}
        </ul>
      )}

      {f.rows.length > 0 && (
        <div className="mt-5">
          <div className="max-h-[520px] overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--surface-2)]">
                <tr>
                  <th className="px-3 py-2">{t.pinCol}</th>
                  <th className="px-3 py-2">{t.rowCol}</th>
                  {f.displayHeaders.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {f.previewRows.map((rowIndex) => {
                  const row = f.rows[rowIndex] ?? {};
                  const isPinned = f.effectivePinnedRows.has(rowIndex);
                  return (
                    <tr
                      key={rowIndex}
                      className="border-b border-[color:rgba(var(--border-rgb),0.65)] last:border-b-0"
                      onFocusCapture={() => f.lockEditingRow(rowIndex)}
                      onBlurCapture={(e) => {
                        const next = e.relatedTarget as Node | null;
                        if (!next || !e.currentTarget.contains(next)) f.unlockEditingRow(rowIndex);
                      }}
                    >
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="pill-btn px-3 py-1 text-xs"
                          aria-pressed={isPinned}
                          onClick={() => (isPinned ? f.unpinRow(rowIndex) : f.pinRow(rowIndex))}
                        >
                          {isPinned ? t.unpinRow : t.pinRow}
                        </button>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 ${muted}`}>{rowIndex + 1}</td>
                      {f.displayHeaders.map((h) => {
                        const sev = f.issueCellMap.get(`${rowIndex}|||${h}`);
                        return (
                          <td key={h} className="min-w-[180px] px-3 py-2">
                            <input
                              className={cellClass(sev)}
                              aria-label={`${h}, ${fmt(t.rowNumber, { row: rowIndex + 1 })}`}
                              aria-invalid={sev === "error" || undefined}
                              value={row[h] ?? ""}
                              onChange={(e) => f.onUpdateRow(rowIndex, { [h]: e.target.value })}
                              title={row[h] ?? ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={`mt-2 text-xs ${muted}`}>
            {t.previewNote}
            {morePinned > 0 ? ` ${fmt(t.morePinned, { count: morePinned })}` : ""}
          </p>
        </div>
      )}

      <div className="mt-6">
        <EditableIssuesTable
          headers={f.displayHeaders}
          issues={f.issuesForDisplay}
          rows={f.rows}
          onUpdateRow={f.onUpdateRow}
          resetKey={f.formatId}
          formatId={f.formatId}
          pinnedRows={f.pinnedSorted}
          onUnpinRow={f.unpinRow}
          cellSeverityMap={f.issueCellMap}
          onRowEditStart={f.lockEditingRow}
          onRowEditEnd={f.unlockEditingRow}
          t={t}
          vt={f.vt}
        />
      </div>
    </section>
  );
}
