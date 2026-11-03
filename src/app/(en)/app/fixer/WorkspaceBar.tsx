"use client";

import { fmt } from "@/lib/i18n/fmt";
import type { AppStrings, Fixer } from "./useFixer";
import { muted } from "./ui";

/** Multi-file workspace (paid plans): switch between files and see each file's status. */
export function WorkspaceBar({ f, t }: { f: Fixer; t: AppStrings }) {
  if (!f.workspaceEnabled || f.workspaceDocs.length === 0) return null;
  return (
    <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pr-2 text-xs font-semibold ${muted}`}>{t.workspace}</span>
        {f.workspaceDocs.map((doc) => {
          const status = f.docStatuses.get(doc.id) ?? "pending";
          const dot = status === "errors" ? "bg-red-500" : status === "warnings" ? "bg-yellow-400" : status === "clean" ? "bg-green-500" : "bg-[var(--border)]";
          const active = doc.id === f.activeWorkspaceDocId;
          return (
            <button
              key={doc.id}
              type="button"
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${
                active
                  ? "border-[color:rgba(var(--accent-rgb),0.5)] bg-[color:rgba(var(--accent-rgb),0.1)] font-semibold text-[var(--text)]"
                  : `border-[var(--border)] bg-[var(--surface-2)] ${muted}`
              }`}
              aria-pressed={active}
              onClick={() => void f.switchWorkspaceDoc(doc)}
              title={doc.name}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <span className="max-w-[160px] truncate">{doc.name}</span>
            </button>
          );
        })}
        {f.workspaceDocs.length < f.workspaceFileLimit && (
          <label className={`flex cursor-pointer items-center gap-1 rounded-xl border border-dashed border-[var(--border)] px-3 py-1.5 text-xs ${muted}`}>
            {t.addFile}
            <input
              type="file"
              accept=".csv,.txt,.tsv,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await f.handleWorkspaceFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <span className={`ml-auto text-xs ${muted}`}>{fmt(t.filesCount, { count: f.workspaceDocs.length, limit: f.workspaceFileLimit })}</span>
      </div>
    </div>
  );
}
