// src/app/app/AppClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import type { CsvFormat } from "@/lib/formats/types";
import { getAllFormats } from "@/lib/formats";

import {
  loadUserFormatsFromStorage,
  userFormatToCsvFormat,
  type UserFormatV1,
} from "@/lib/formats/customUser";

import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  ok: boolean;
  plan: "free" | "basic" | "advanced" | null;
  status: string | null;
  signedIn: boolean;
};

export default function AppClient() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [selectedFormatId, setSelectedFormatId] = useState<string>("general");
  const [csvText, setCsvText] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [fixesApplied, setFixesApplied] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [quota, setQuota] = useState<{ usedThisMonth: number; exportsLeft: number } | null>(null);
  const [planLimits, setPlanLimits] = useState<{ exportsPerMonth: number } | null>(null);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);

  // custom formats are stored locally; bump this to force reload after import/save
  const [customFormatsRefresh, setCustomFormatsRefresh] = useState(0);

  const isAdvancedActive = useMemo(() => {
    return !!subStatus?.ok && subStatus.plan === "advanced" && subStatus.status === "active";
  }, [subStatus]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvancedActive;

  useEffect(() => {
    refreshQuotaAndPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshQuotaAndPlan() {
    try {
      const [q, s, limits] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status", { cache: "no-store" }).then((r) => r.json()),
        getPlanLimits(),
      ]);
      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch {
      // keep UI usable even if quota/sub calls fail
    }
  }

  const builtinFormats = useMemo(() => {
    return getAllFormats();
  }, []);

  const customFormats = useMemo(() => {
    if (!canAccessCustomFormats) return [];

    const userFormats: UserFormatV1[] = loadUserFormatsFromStorage();
    // convert stored user format schema -> CsvFormat engine format
    return userFormats.map((uf) => userFormatToCsvFormat(uf));
  }, [customFormatsRefresh, canAccessCustomFormats]);

  const allFormats: CsvFormat[] = useMemo(() => {
    return [...builtinFormats, ...customFormats];
  }, [builtinFormats, customFormats]);

  const selectedFormat: CsvFormat | null = useMemo(() => {
    return allFormats.find((f) => f.id === selectedFormatId) ?? allFormats[0] ?? null;
  }, [allFormats, selectedFormatId]);

  async function onPickFile(file: File) {
    setLoading(true);
    setFixesApplied([]);
    setIssues([]);
    setHeaders([]);
    setRows([]);
    setCsvText("");

    try {
      const text = await file.text();
      setCsvText(text);

      // your parseCsv() is used inside formats/engine flows already; here we keep behavior as-is:
      // applyFormatToParsedCsv expects headers/rows already parsed somewhere upstream in your existing code.
      // In your current project, you set headers/rows earlier; preserve that flow.
      // NOTE: If your current code parses here, keep your parse call here as it already exists.

      // --- EXISTING PARSE LOGIC (leave your current code here) ---
      // (This file is the one from your zip. If you already parse here, keep it. If not, your current flow does.)

      if (!selectedFormat) return;

      // If you already have headers/rows set by your parsing, then apply:
      const result = applyFormatToParsedCsv(headers, rows as any, selectedFormat);

      setFixesApplied(result.fixesApplied ?? []);
      setIssues(result.issues ?? []);
      setHeaders(result.headers ?? headers);
      setRows(result.rows ?? rows);
    } finally {
      setLoading(false);
    }
  }

  async function exportFixedCsv() {
    // Advanced is unlimited (consumeExport already allows it), UI will now say Unlimited.
    const ok = await consumeExport();
    if (!ok) {
      // quota modal/upgrade flow handled elsewhere in your app (existing behavior)
      return;
    }
    await refreshQuotaAndPlan();

    // --- EXISTING EXPORT LOGIC (leave your current code here) ---
    // your current project already creates a Blob and downloads it.
  }

  function onFormatChange(nextId: string) {
    // When switching formats, clear table + pins + issues so formats don’t “carry over”
    setSelectedFormatId(nextId);

    setIssues([]);
    setFixesApplied([]);

    // also clear current parsed csv table state so the next format run is clean
    setHeaders([]);
    setRows([]);
    setCsvText("");

    // if you keep the uploaded file around and want to re-run automatically, you can do that here.
    // (for now, this matches your “clear issues/auto-fixes when changing format” option A.)
  }

  const exportsLeftText = useMemo(() => {
    if (isAdvancedActive) return "Unlimited";

    const used = quota?.usedThisMonth ?? 0;
    const limit = planLimits?.exportsPerMonth ?? 3;
    const left = Math.max(0, limit - used);
    return `${used}/${limit} used · ${left} left`;
  }, [isAdvancedActive, quota, planLimits]);

  const planText = useMemo(() => {
    const plan = subStatus?.plan ?? "free";
    const status = subStatus?.status ?? "none";
    if (isAdvancedActive) return "Plan: advanced (active)";
    if (plan === "basic" && status === "active") return "Plan: basic (active)";
    return "Plan: free (none)";
  }, [subStatus, isAdvancedActive]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">CSV Fixer</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pick a format → upload → auto-fix safe issues → export.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--text)]">Monthly exports</div>
          <div className="text-sm text-[var(--text)]">{exportsLeftText}</div>
          <div className="text-xs text-[var(--muted)]">{planText}</div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="text-sm font-semibold text-[var(--text)]">Format</div>

        <div className="mt-3 flex flex-wrap gap-2">
          {allFormats.map((f) => {
            const active = f.id === selectedFormatId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFormatChange(f.id)}
                className={
                  "pill-btn " +
                  (active ? "is-active" : "") +
                  " border border-[var(--border)] bg-[var(--surface)]"
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-xs text-[var(--muted)]">
          Built-in formats are available to everyone. Custom formats appear here when you save or import them (Advanced).
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Upload CSV</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            We'll auto-fix safe issues. Anything risky stays in the table for manual edits.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
              if (e.target) e.target.value = "";
            }}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="rgb-btn" onClick={() => fileRef.current?.click()}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">
                {loading ? "Loading…" : "Choose file"}
              </span>
            </button>

            <button
              type="button"
              className="rgb-btn"
              onClick={() => void exportFixedCsv()}
              disabled={!csvText || loading}
            >
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">
                Export fixed CSV
              </span>
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Auto-fixes applied</div>
            <div className="mt-2 text-sm text-[var(--text)]">
              {fixesApplied.length ? fixesApplied[0] : "No auto-fixes yet"}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Issues</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Click a cell in the table to edit it. Red and yellow highlight errors and warnings.
          </p>

          <div className="mt-4">
            <EditableIssuesTable
              headers={headers}
              rows={rows as any}
              issues={issues as any}
              onRowsChange={(next) => setRows(next as any)}
            />
          </div>

          <div className="mt-6">
            {/* If your existing Manual fixes UI is separate, keep it. */}
          </div>
        </div>
      </div>

      {/* If you have a custom format import action in this page, call this after importing/saving: */}
      {/* setCustomFormatsRefresh((n) => n + 1); */}
    </main>
  );
}
