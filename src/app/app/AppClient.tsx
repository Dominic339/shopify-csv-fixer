// src/app/app/AppClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseCsv, toCsv } from "@/lib/csv";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import type { CsvFormat, CsvIssue } from "@/lib/formats/types";
import { loadUserFormatsFromStorage, userFormatToCsvFormat } from "@/lib/formats/customUser";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import { computeValidationBreakdown } from "@/lib/validation/scoring";
import { fixAllShopifyBlocking } from "@/lib/validation/fixAllShopify";

// Phase helpers
import { computeReadinessSummary } from "@/lib/validation/readiness";
import { buildScoreNotes } from "@/lib/validation/scoreNotes";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

// Phase 1: strict mode preference (Shopify)
import { getStrictMode, setStrictMode } from "@/lib/validation/strictMode";

type SubStatus = {
  ok: boolean;
  plan?: "free" | "basic" | "advanced";
  status?: string;
  signedIn?: boolean;
};

type PlanLimits = {
  exportsPerMonth: number;
  unlimited?: boolean;
};

type CsvRow = Record<string, string>;

type UiIssue = {
  row?: number; // 1-based (legacy)
  rowIndex?: number; // 0-based (new)
  column?: string;
  field?: string;
  message: string;
  level?: "error" | "warning" | "info";
  severity?: "error" | "warning" | "info";
  code?: string;
  suggestion?: string;
  details?: Record<string, unknown>;
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeBaseName(name: string | null) {
  const base = (name ?? "csv").replace(/\.csv$/i, "").trim() || "csv";
  return base.replace(/[^\w\d._-]+/g, "_");
}

export default function AppClient() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [parseIssues, setParseIssues] = useState<UiIssue[]>([]);
  const [autoFixes, setAutoFixes] = useState<string[]>([]);

  // The Shopify auto-fixer can log one entry per row for the same action (e.g., normalize tags).
  // That is useful for downloads, but noisy in the UI. We collapse repeated messages for display.
  const collapsedAutoFixes = useMemo(() => {
    if (!autoFixes.length) return [] as string[];
    const groups = new Map<string, { count: number; first: string }>();
    for (const msg of autoFixes) {
      const m = msg.match(/^(.*) on row (\d+)$/i);
      const base = m ? m[1] : msg;
      const g = groups.get(base);
      if (g) g.count += 1;
      else groups.set(base, { count: 1, first: msg });
    }
    const out: string[] = [];
    for (const [base, g] of groups.entries()) {
      out.push(g.count === 1 ? g.first : `${base} on ${g.count} rows`);
    }
    return out;
  }, [autoFixes]);

  const [fileName, setFileName] = useState<string | null>(null);

  const [quota, setQuota] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubStatus>({ ok: true, plan: "free" });
  const [planLimits, setPlanLimits] = useState<PlanLimits>({ exportsPerMonth: 3 });

  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [exportBaseName, setExportBaseName] = useState<string | null>(null);

  // inline edit state for the preview table
  const [editing, setEditing] = useState<{ rowIndex: number; col: string; value: string } | null>(null);

  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);

  // Initialize the selected format from the URL query param if present.
  // This prevents the "keep valid" fallback from snapping to the first format
  // before the preset can be applied.
  const [formatId, setFormatId] = useState<string>(() => {
    if (typeof window === "undefined") return "shopify_products";
    const preset = new URLSearchParams(window.location.search).get("preset");
    return preset?.trim() ? preset.trim() : "shopify_products";
  });

  const builtinFormats = useMemo<CsvFormat[]>(() => getAllFormats(), []);
  const [customFormats, setCustomFormats] = useState<CsvFormat[]>([]);

  // “Jump to issues”
  const issuesPanelRef = useRef<HTMLDivElement | null>(null);

  // show last “Fix All” audit snippet
  const [lastFixAll, setLastFixAll] = useState<null | { at: number; applied: string[] }>(null);

  // ✅ Pinned rows = the "Manual fixes" worklist
  // We keep two concepts:
  // - manualPinnedRows: rows the user explicitly pinned (never auto-removed)
  // - autoPinnedRows: rows that currently match the active issue filter (auto updates when filter changes)
  // If the user unpins an auto-pinned row, we suppress auto-pinning it again until the issues change.
  const [manualPinnedRows, setManualPinnedRows] = useState<Set<number>>(() => new Set());
  const [suppressedAutoPins, setSuppressedAutoPins] = useState<Set<number>>(() => new Set());

  // Phase 1: Shopify strict mode toggle (stored local)
  const [strictShopify, setStrictShopify] = useState<boolean>(() => getStrictMode());

  // Phase 1: Severity filter
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all");
  const [simulateShopify, setSimulateShopify] = useState(false);

  function refreshCustomFormats() {
    const user = loadUserFormatsFromStorage();
    const next = user.map(userFormatToCsvFormat);
    setCustomFormats(next);
  }

  const allFormats = useMemo<CsvFormat[]>(() => [...builtinFormats, ...customFormats], [builtinFormats, customFormats]);

  // Support selecting a preset via /app?preset=<formatId>
  // NOTE: read the query param *inside* this effect to avoid a first-mount race
  // between multiple useEffects.
  // (Built-ins always work; Custom Formats will work once they load for Advanced users.)
  const appliedPresetRef = useRef(false);

  useEffect(() => {
    if (appliedPresetRef.current) return;
    if (typeof window === "undefined") return;

    const preset = new URLSearchParams(window.location.search).get("preset");
    if (!preset) {
      appliedPresetRef.current = true;
      return;
    }

    const exists = allFormats.some((f) => f.id === preset);
    if (!exists) return; // wait until formats load

    setFormatId(preset);
    appliedPresetRef.current = true;
  }, [allFormats]);

  // support exportName via /app?exportName=<base>
  const appliedExportNameRef = useRef(false);
  useEffect(() => {
    if (appliedExportNameRef.current) return;
    if (typeof window === "undefined") return;

    const qp = new URLSearchParams(window.location.search);
    const exportName = qp.get("exportName");
    if (exportName) {
      setExportBaseName(exportName);
      appliedExportNameRef.current = true;
      return;
    }

    const preset = qp.get("preset");
    if (preset) setExportBaseName(preset);
    appliedExportNameRef.current = true;
  }, []);

  // Keep selected format valid (if a custom format is deleted, fall back)
  // IMPORTANT: depend on `formatId` and `allFormats` so this effect sees the
  // latest selected id (including a preset from the URL) and does not overwrite it.
  useEffect(() => {
    if (!allFormats.length) return;
    if (allFormats.some((f) => f.id === formatId)) return;
    setFormatId(allFormats[0]!.id);
  }, [allFormats, formatId]);

  const activeFormat = useMemo(
    () => allFormats.find((f) => f.id === formatId) ?? allFormats[0],
    [allFormats, formatId]
  );

  async function refreshQuotaAndPlan() {
    try {
      const [q, s] = await Promise.all([
        getQuota(),
        fetch("/api/subscription/status", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const plan = ((s?.plan ?? q?.plan ?? "free") as "free" | "basic" | "advanced") ?? "free";
      const limits = getPlanLimits(plan) as PlanLimits;

      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to refresh quota/plan");
    }
  }

  useEffect(() => {
    void refreshQuotaAndPlan();
  }, []);

  const isAdvancedActive = useMemo(() => {
    const status = (subStatus?.status ?? "").toLowerCase();
    const plan = subStatus?.plan ?? "free";
    return plan === "advanced" && status === "active";
  }, [subStatus]);

  const canAccessCustomFormats = useMemo(() => {
    return ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvancedActive;
  }, [isAdvancedActive]);

  // Load (and live-refresh) Custom Formats only when the user can access them.
  useEffect(() => {
    if (!canAccessCustomFormats) {
      setCustomFormats([]);
      return;
    }

    refreshCustomFormats();
    const onChanged = () => refreshCustomFormats();
    window.addEventListener("csnest-formats-changed", onChanged);
    return () => window.removeEventListener("csnest-formats-changed", onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccessCustomFormats]);

  const isUnlimited = useMemo(() => {
    const status = (subStatus?.status ?? "").toLowerCase();
    const plan = subStatus?.plan ?? "free";
    if (plan === "advanced" && status === "active") return true;
    if (quota?.unlimited) return true;
    if (planLimits?.unlimited) return true;
    return false;
  }, [subStatus, quota, planLimits]);

  // ✅ FIXED: preserve Issue.details without @ts-expect-error
  const issuesForTable: CsvIssue[] = useMemo(() => {
    return (issues ?? [])
      .map((it) => {
        const rowIndex =
          typeof (it as any).rowIndex === "number"
            ? (it as any).rowIndex
            : typeof (it as any).row === "number"
              ? Math.max(0, (it as any).row - 1)
              : -1;

        const col = ((it as any).column ?? (it as any).field ?? "").toString();
        const sev = (((it as any).severity ?? (it as any).level ?? "error") as "error" | "warning" | "info") ?? "error";

        if (typeof rowIndex !== "number") return null;

        const details = (it as any).details as Record<string, unknown> | undefined;

        const out: CsvIssue = {
          rowIndex,
          column: col || "(file)",
          message: String((it as any).message ?? ""),
          severity: sev,
          code: (it as any).code,
          suggestion: (it as any).suggestion,
          details,
        };

        return out;
      })
      .filter(Boolean) as CsvIssue[];
  }, [issues]);

  // ✅ ALWAYS expose debug data so your console never hits undefined
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__DEBUG_ISSUES__ = issuesForTable;
    (window as any).__DEBUG_HEADERS__ = tableHeaders;
    (window as any).__DEBUG_ROWS__ = rows;
  }, [issuesForTable, rows]); // tableHeaders is derived and stable enough; rows change triggers refresh too

  const issuesForDisplay = useMemo(() => {
    if (issueSeverityFilter === "all") return issuesForTable;
    return issuesForTable.filter((i) => i.severity === issueSeverityFilter);
  }, [issuesForTable, issueSeverityFilter]);

  const validation = useMemo(() => computeValidationBreakdown(issuesForTable, { formatId }), [issuesForTable, formatId]);

  const shopifySimulation = useMemo(() => {
    if (formatId !== "shopify_products") return null;

    // Rows that Shopify would likely reject due to blocking import errors.
    // NOTE: Some issues are *not* rejections in Shopify; e.g. duplicate option combos typically result
    // in Shopify merging variant rows. We exclude those from rejectedRows and count them as merges.
    const reject = new Set<number>();

    // Estimate variant merges by grouping rows by (Handle + option value combination).
    // This is more reliable than depending on Issue.details always being present.
    let mergedVariants = 0;
    const mergeGroups = new Map<string, number>();

    // Build merge groups directly from the data.
    const get = (r: any, k: string) => (typeof r?.[k] === "string" ? r[k] : String(r?.[k] ?? ""));
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const handle = get(r, "Handle").trim();
      if (!handle) continue;

      const o1n = get(r, "Option1 Name").trim();
      const o1v = get(r, "Option1 Value").trim();
      const o2n = get(r, "Option2 Name").trim();
      const o2v = get(r, "Option2 Value").trim();
      const o3n = get(r, "Option3 Name").trim();
      const o3v = get(r, "Option3 Value").trim();

      // Shopify treats a variant as defined by option *values* (names are mostly cosmetic).
      const combo = [
        `${o1n || "Option1"}=${o1v}`,
        o2v ? `${o2n || "Option2"}=${o2v}` : "",
        o3v ? `${o3n || "Option3"}=${o3v}` : "",
      ]
        .filter(Boolean)
        .join("|");

      if (!combo) continue;
      const key = `${handle}||${combo}`;
      mergeGroups.set(key, (mergeGroups.get(key) ?? 0) + 1);
    }

    for (const c of mergeGroups.values()) {
      if (c > 1) mergedVariants += c - 1;
    }

    // Rejections from blocking issues (excluding merge-only conditions).
    for (const it of issuesForTable) {
      const code = (it as any).code as string | undefined;
      const rowIndex = (it as any).rowIndex as number | undefined;
      if (!code || typeof rowIndex !== "number" || rowIndex < 0) continue;

      // Duplicate option combos: treat as merge behavior, not an import reject.
      if (code === "shopify/options_not_unique") continue;

      // ✅ issue meta is keyed by (formatId, code)
      const meta = getIssueMeta(formatId, code);
      if (meta?.blocking) reject.add(rowIndex);
    }

      if (code === "shopify/options_not_unique") {
        const details = (it as any).details as any | undefined;
        const rowsArr = Array.isArray(details?.rows) ? (details.rows as number[]) : null;
        const handle = typeof details?.handle === "string" ? details.handle : "";
        const combo = details?.duplicateCombo ? JSON.stringify(details.duplicateCombo) : "";
        if (rowsArr && rowsArr.length >= 2) {
          const key = `${handle}|${rowsArr.join(",")}|${combo}`;
          if (!seenDuplicateGroups.has(key)) {
            seenDuplicateGroups.add(key);
            mergedVariants += Math.max(0, rowsArr.length - 1);
          }
        }
      }
    }

    // Rows that are completely empty are typically ignored by imports.
    // PapaParse is configured with skipEmptyLines, so true blank lines won't appear in `rows`.
    // To simulate Shopify's "ignored row" behavior, estimate how many blank data lines were
    // present in the raw upload.
    let deletedRows = 0;

    const raw = (lastUploadedText ?? "").replace(/^\uFEFF/, "");
    if (raw) {
      const lines = raw.split(/\r?\n/);
      // Find the header line (first non-empty line)
      let headerIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if ((lines[i] ?? "").trim().length) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx >= 0) {
        for (let i = headerIdx + 1; i < lines.length; i++) {
          const line = (lines[i] ?? "").trim();
          if (!line) {
            deletedRows += 1;
            continue;
          }
          // lines like ",,," or ", , ," are effectively empty rows
          const stripped = line.replace(/,/g, "").replace(/\"/g, "").replace(/\s+/g, "");
          if (!stripped) deletedRows += 1;
        }
      }
    }

    return {
      mergedVariants,
      deletedRows,
      rejectedRows: reject.size,
    };
  }, [formatId, issuesForTable, rows, headers, lastUploadedText]);

  const readiness = useMemo(() => computeReadinessSummary(issuesForTable, formatId), [issuesForTable, formatId]);
  const scoreNotes = useMemo(
    () => buildScoreNotes(validation as any, issuesForTable, formatId),
    [validation, issuesForTable, formatId]
  );

  // Shopify-only: "Import Confidence" is a user-facing label for overall readiness.
  const shopifyImportConfidence = useMemo(() => {
    if (formatId !== "shopify_products") return null;
    const s = Number((validation as any)?.score ?? 0);
    if (!Number.isFinite(s)) return 0;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [formatId, validation]);

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }, [headers, rows]);

  // Build cell highlight map from CURRENT issues (respect filter)
  const issueCellMap = useMemo(() => {
    const map = new Map<string, "error" | "warning" | "info">();
    for (const i of issuesForDisplay) {
      if (!i.column || i.column === "(file)") continue;

      const key = `${i.rowIndex}|||${i.column}`;
      const prev = map.get(key);
      if (prev === "error") continue;
      if (prev === "warning" && i.severity === "info") continue;
      map.set(key, i.severity);
    }
    return map;
  }, [issuesForDisplay]);

  // Row-level severity (highest severity issue in the row, across ALL issues)
  const rowSeverity = useMemo(() => {
    const rank = { info: 1, warning: 2, error: 3 } as const;
    const map = new Map<number, "error" | "warning" | "info">();
    for (const i of issuesForTable) {
      if (typeof i.rowIndex !== "number" || i.rowIndex < 0) continue;
      const prev = map.get(i.rowIndex);
      if (!prev || rank[i.severity] > rank[prev]) {
        map.set(i.rowIndex, i.severity);
      }
    }
    return map;
  }, [issuesForTable]);

  const autoPinnedRows = useMemo(() => {
    const set = new Set<number>();
    if (!rows.length) return set;

    // Auto-pin rows that have issues under the CURRENT issue filter.
    // issuesForDisplay already honors the filter (All / Error / Warning / Info).
    const rowsWithAnyIssue = new Set<number>();
    for (const iss of issuesForDisplay) {
      if (typeof iss.rowIndex === "number" && iss.rowIndex >= 0) rowsWithAnyIssue.add(iss.rowIndex);
    }

    for (const r of rowsWithAnyIssue) {
      if (!suppressedAutoPins.has(r)) set.add(r);
    }
    return set;
  }, [issuesForDisplay, rows.length, suppressedAutoPins]);

  // If a suppressed row no longer has issues for the current filter, remove suppression.
  useEffect(() => {
    if (!rows.length) {
      if (suppressedAutoPins.size) setSuppressedAutoPins(new Set());
      return;
    }
    if (!suppressedAutoPins.size) return;

    const stillRelevant = new Set<number>();
    for (const iss of issuesForDisplay) {
      if (typeof iss.rowIndex === "number" && iss.rowIndex >= 0) stillRelevant.add(iss.rowIndex);
    }

    let changed = false;
    const next = new Set<number>();
    suppressedAutoPins.forEach((r) => {
      if (stillRelevant.has(r)) next.add(r);
      else changed = true;
    });

    if (changed) setSuppressedAutoPins(next);
  }, [rows.length, issuesForDisplay, suppressedAutoPins]);

  const effectivePinnedRows = useMemo(() => {
    const merged = new Set<number>();
    manualPinnedRows.forEach((r) => merged.add(r));
    autoPinnedRows.forEach((r) => merged.add(r));
    return merged;
  }, [manualPinnedRows, autoPinnedRows]);

  const pinnedSorted = useMemo(() => Array.from(effectivePinnedRows).sort((a, b) => a - b), [effectivePinnedRows]);

  // Rows shown in the main table preview.
  // Always include pinned rows (manual + auto for current filter), then fill with early non-pinned rows.
  const previewRows = useMemo(() => {
    const LIMIT = 50;
    if (!rows.length) return [] as number[];

    const out: number[] = [];

    // Include pinned rows first (sorted)
    for (const r of pinnedSorted) out.push(r);

    // Fill with non-pinned rows up to the preview limit
    if (out.length < LIMIT) {
      for (let i = 0; i < rows.length && out.length < LIMIT; i++) {
        if (!effectivePinnedRows.has(i)) out.push(i);
      }
    }

    return out;
  }, [rows.length, pinnedSorted, effectivePinnedRows]);

  function pinRow(rowIndex: number) {
    // User explicitly pins a row -> it becomes manual and stays until they unpin.
    setManualPinnedRows((prev) => {
      const next = new Set(prev);
      next.add(rowIndex);
      return next;
    });

    // Also remove any suppression so it can be auto-pinned again if they later remove the manual pin.
    setSuppressedAutoPins((prev) => {
      if (!prev.has(rowIndex)) return prev;
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
  }

  function unpinRow(rowIndex: number) {
    // If it's a manual pin, remove the manual pin.
    setManualPinnedRows((prev) => {
      if (!prev.has(rowIndex)) return prev;
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });

    // If it would be auto-pinned (because it has issues for the current filter),
    // suppress it so the user can keep it out of the worklist.
    const hasIssueUnderCurrentFilter = issuesForDisplay.some((iss) => iss.rowIndex === rowIndex);
    if (hasIssueUnderCurrentFilter) {
      setSuppressedAutoPins((prev) => {
        if (prev.has(rowIndex)) return prev;
        const next = new Set(prev);
        next.add(rowIndex);
        return next;
      });
    }
  }

  // ✅ Revalidate issues WITHOUT applying fixes
  const revalidateTimerRef = useRef<number | null>(null);
  function revalidateIssuesOnly(nextHeaders: string[], nextRows: CsvRow[]) {
    if (!activeFormat) return;

    if (revalidateTimerRef.current) {
      window.clearTimeout(revalidateTimerRef.current);
      revalidateTimerRef.current = null;
    }

    revalidateTimerRef.current = window.setTimeout(() => {
      try {
        const res = applyFormatToParsedCsv(nextHeaders, nextRows, activeFormat);
        const mergedIssues = [...((res.issues as any) ?? []), ...(parseIssues ?? [])];
        setIssues(mergedIssues as any);
      } catch {
        // ignore
      }
    }, 220);
  }

  useEffect(() => {
    return () => {
      if (revalidateTimerRef.current) window.clearTimeout(revalidateTimerRef.current);
    };
  }, []);

  const onUpdateRow = useCallback(
    (rowIndex: number, patch: Partial<CsvRow>) => {
      setRows((prev) => {
        const next = [...prev];
        const existing = next[rowIndex] ?? {};
        const cleaned: Record<string, string> = {};

        for (const [k, v] of Object.entries(patch)) {
          if (typeof v === "string") cleaned[k] = v;
          else if (v == null) cleaned[k] = "";
          else cleaned[k] = String(v);
        }

        next[rowIndex] = { ...existing, ...cleaned };

        const hdrs = tableHeaders.length ? tableHeaders : Object.keys(next[0] ?? {});
        revalidateIssuesOnly(hdrs, next);

        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableHeaders, activeFormat, parseIssues]
  );

  function runFormatOnCurrentData(nextHeaders: string[], nextRows: CsvRow[], additionalFixes: string[] = []) {
    const res = applyFormatToParsedCsv(nextHeaders, nextRows, activeFormat);
    setHeaders(res.fixedHeaders ?? nextHeaders);
    setRows(res.fixedRows ?? nextRows);

    const mergedIssues = [...((res.issues as any) ?? []), ...(parseIssues ?? [])];
    setIssues(mergedIssues as any);

    setAutoFixes([...(additionalFixes ?? []), ...(res.fixesApplied ?? [])]);
  }

  const fixAllDryRun = useMemo(() => {
    if (formatId !== "shopify_products") return null;
    if (!rows.length) return null;
    return fixAllShopifyBlocking(tableHeaders, rows, issuesForTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, tableHeaders.join("||"), rows, issuesForTable]);

  const realFixableBlockingCount = fixAllDryRun?.fixesApplied?.length ?? 0;

  function handleFixAllBlocking() {
    if (formatId !== "shopify_products") return;

    const fixed = fixAllDryRun ?? fixAllShopifyBlocking(tableHeaders, rows, issuesForTable);

    if (!fixed.fixesApplied.length) {
      setErrorBanner(
        `Fix All ran, but 0 fixes were safely applied. Remaining blockers require manual edits (e.g., Missing Title, Published like "maybe", Price like "free").`
      );
      return;
    }

    setErrorBanner(null);
    setLastFixAll({ at: Date.now(), applied: fixed.fixesApplied });
    runFormatOnCurrentData(fixed.fixedHeaders, fixed.fixedRows, fixed.fixesApplied);
  }

  async function runFormatOnText(format: CsvFormat, csvText: string, name?: string) {
    setBusy(true);
    setErrorBanner(null);

    try {
      const parsed = parseCsv(csvText);
      const res = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);

      const nextParseIssues: UiIssue[] = (parsed.parseErrors ?? []).map((m) => ({
        message: m,
        level: "error",
        severity: "error",
      }));

      setParseIssues(nextParseIssues);

      setHeaders(res.fixedHeaders ?? []);
      setRows(res.fixedRows ?? []);

      setIssues([...(res.issues ?? []), ...nextParseIssues] as any);

      setAutoFixes(res.fixesApplied ?? []);
      if (typeof name === "string") setFileName(name);

      setLastFixAll(null);
      // Reset pin state for a new run
      setManualPinnedRows(new Set());
      setSuppressedAutoPins(new Set());

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to process CSV");
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    setErrorBanner(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setLastUploadedText(text);

      setIssues([]);
      setParseIssues([]);
      setAutoFixes([]);
      setEditing(null);
      setLastFixAll(null);
      // Reset pin state for a new run
      setManualPinnedRows(new Set());
      setSuppressedAutoPins(new Set());

      if (activeFormat) {
        await runFormatOnText(activeFormat, text, file.name);
      }
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Failed to process CSV");
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  // Re-run when format changes
  useEffect(() => {
    setIssues([]);
    setParseIssues([]);
    setAutoFixes([]);
    setEditing(null);
    setLastFixAll(null);
    // Reset pin state for a new run
    setManualPinnedRows(new Set());
    setSuppressedAutoPins(new Set());

    if (!lastUploadedText || !activeFormat) return;
    void runFormatOnText(activeFormat, lastUploadedText, fileName ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId]);

  // Persist + re-run when strict mode toggles (Shopify only)
  useEffect(() => {
    setStrictMode(Boolean(strictShopify));

    if (formatId !== "shopify_products") return;
    if (!lastUploadedText || !activeFormat) return;

    void runFormatOnText(activeFormat, lastUploadedText, fileName ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictShopify]);

  async function exportFixedCsv() {
    setBusy(true);
    setErrorBanner(null);
    try {
      await consumeExport();

      const cols = tableHeaders.length ? tableHeaders : Object.keys(rows[0] ?? {});
      const csv = toCsv(cols, rows);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const base = (exportBaseName ?? fileName ?? "fixed").replace(/\.csv$/i, "").trim() || "fixed";
      a.download = `${base}_fixed.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? "Export failed");
      try {
        await refreshQuotaAndPlan();
      } catch {
        // ignore
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit(rowIndex: number, col: string) {
    const current = rows[rowIndex]?.[col] ?? "";
    setEditing({ rowIndex, col, value: current });
    pinRow(rowIndex);
  }

  function commitEdit() {
    if (!editing) return;
    onUpdateRow(editing.rowIndex, { [editing.col]: editing.value });
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  const used = Number(quota?.used ?? 0);
  const limit = isUnlimited ? null : Number(planLimits?.exportsPerMonth ?? quota?.limit ?? 3);
  const left = isUnlimited ? null : Math.max(0, Number(quota?.remaining ?? (Number(limit ?? 0) - used)));

  const fixAllVisible = formatId === "shopify_products" && rows.length > 0 && realFixableBlockingCount > 0;
  const fixAllLabel = `Fix ${realFixableBlockingCount} auto-fixable blockers`;

  const fixLogBase = safeBaseName(exportBaseName ?? fileName ?? "csv");

  return (
    <div className="mx-auto max-w-7xl px-8 py-12">
      {errorBanner ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-[var(--text)] text-base">
          {errorBanner}
        </div>
      ) : null}

      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">CSV Fixer</h1>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">Pick a format → upload → auto-fix safe issues → export.</p>

          {rows.length > 0 ? (
            <div className="mt-4 space-y-3 text-base">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-[var(--text)]">
                  Validation score: <span className="font-semibold">{validation.score}</span>/100
                </span>

                {shopifyImportConfidence != null ? (
                  <span
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-[var(--text)]"
                    title={"Based on:\n- Blocking errors\n- Variant integrity\n- Option structure\n- Inventory consistency"}
                  >
                    Shopify import confidence: <span className="font-semibold">{shopifyImportConfidence}%</span>
                  </span>
                ) : null}

                {formatId === "shopify_products" ? (
                  <button
                    type="button"
                    onClick={() => setSimulateShopify((v) => !v)}
                    className={
                      "rounded-full border px-4 py-1.5 font-semibold hover:opacity-90 " +
                      (simulateShopify
                        ? "border-[color:rgba(var(--accent-rgb),0.45)] bg-[color:rgba(var(--accent-rgb),0.14)] text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[color:rgba(var(--muted-rgb),1)]")
                    }
                    title={simulateShopify ? "Simulation is ON. Click to turn off." : "Simulate how Shopify would treat this CSV on import."}
                  >
                    Simulate Shopify Import{simulateShopify ? ": ON" : ""}
                  </button>
                ) : (
                  <span
                    className={
                      "rounded-full border px-4 py-1.5 font-semibold " +
                      (validation.readyForShopifyImport
                        ? "border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.12)] text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[color:rgba(var(--muted-rgb),1)]")
                    }
                  >
                    {validation.label}
                  </span>
                )}

                <span className="text-[color:rgba(var(--muted-rgb),1)]">
                  {validation.counts.errors} errors, {validation.counts.warnings} warnings
                  {validation.counts.blockingErrors ? ` • ${validation.counts.blockingErrors} blocking` : ""}
                  {formatId === "shopify_products" && simulateShopify && shopifySimulation ? (
                    <>{` · Shopify would merge ${shopifySimulation.mergedVariants} variants, delete ${shopifySimulation.deletedRows} rows, reject ${shopifySimulation.rejectedRows} rows`}</>
                  ) : null}
                </span>

                {fixAllVisible ? (
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={handleFixAllBlocking}
                    disabled={busy}
                    title="Applies safe, deterministic fixes to Shopify blockers."
                    style={busy ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    {fixAllLabel}
                  </button>
                ) : null}

                {formatId === "shopify_products" ? (
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => {
                      setStrictShopify((v) => !v);
                    }}
                    disabled={busy}
                    title="Strict mode adds extra Shopify checks."
                  >
                    {strictShopify ? "Strict mode: ON" : "Strict mode: OFF"}
                  </button>
                ) : null}
              </div>

              {formatId === "shopify_products" ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-[320px]">
                      <div className="text-base font-semibold text-[var(--text)]">
                        {validation.readyForShopifyImport ? "🟢 Ready for Shopify Import" : "Not ready for Shopify Import"}
                      </div>
                      <div className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                        {validation.readyForShopifyImport
                          ? "No blocking issues detected. Exporting should import cleanly."
                          : "Blocking issues are preventing a clean import. Fix blockers to safely import."}
                      </div>

                      {!validation.readyForShopifyImport ? (
                        <div className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
                          <div className="font-semibold text-[var(--text)]">Top blockers</div>
                          <ul className="mt-2 list-disc pl-6">
                            {readiness.blockingGroups.slice(0, 3).map((g) => (
                              <li key={g.code}>
                                <span className="font-semibold text-[var(--text)]">{g.title}</span>{" "}
                                <span className="text-[color:rgba(var(--muted-rgb),1)]">({g.count})</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className="rg-btn"
                              onClick={() => issuesPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            >
                              Jump to issues
                            </button>

                            <span className="text-sm text-[color:rgba(var(--muted-rgb),1)]">
                              Auto-fixable blockers: <span className="font-semibold text-[var(--text)]">{realFixableBlockingCount}</span>
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {lastFixAll ? (
                        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                          <div className="text-base font-semibold text-[var(--text)]">Last Fix All</div>
                          <ul className="mt-3 list-disc pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
                            {lastFixAll.applied.slice(0, 5).map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                            {lastFixAll.applied.length > 5 ? <li>…and {lastFixAll.applied.length - 5} more</li> : null}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-[300px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">Score drivers</div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        {scoreNotes.map((n) => (
                          <div key={n.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3" title={n.note}>
                            <div className="font-semibold text-[var(--text)]">
                              {n.label} <span className="text-[color:rgba(var(--muted-rgb),1)]">{n.score}</span>
                            </div>
                            <div className="mt-2 text-[color:rgba(var(--muted-rgb),1)]">{n.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {autoFixes.length > 0 ? (
                    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-base font-semibold text-[var(--text)]">
                          Auto fixes applied{" "}
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">
                            ({autoFixes.length} actions, {collapsedAutoFixes.length} lines)
                          </span>
                        </div>

                        <button
                          type="button"
                          className="pill-btn"
                          onClick={() => {
                            const header = `Auto fix log\nFile: ${fileName ?? "unknown"}\nFormat: ${formatId}\nApplied: ${autoFixes.length}\n\n`;
                            const body = autoFixes.map((x, idx) => `${idx + 1}. ${x}`).join("\n");
                            downloadText(`${fixLogBase}_fix_log.txt`, header + body + "\n");
                          }}
                        >
                          Download fix log
                        </button>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-base text-[color:rgba(var(--muted-rgb),1)]">View auto fixes</summary>
                        <ul className="mt-3 list-disc pl-6 text-base text-[color:rgba(var(--muted-rgb),1)]">
                          {collapsedAutoFixes.slice(0, 50).map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                          {collapsedAutoFixes.length > 50 ? (
                            <li>…and {collapsedAutoFixes.length - 50} more (download the log for the full list)</li>
                          ) : null}
                        </ul>
                      </details>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-base text-[var(--text)]">
          <div className="font-medium">Monthly exports</div>
          {isUnlimited ? <div>Unlimited</div> : <div>{used}/{limit} used • {left} left</div>}
          <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
            Plan: {subStatus?.plan ?? "free"} ({subStatus?.status ?? "unknown"})
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <div className="text-base font-semibold text-[var(--text)]">Format</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {allFormats.map((f) => {
            const active = f.id === formatId;
            return (
              <button key={f.id} type="button" className={`pill-btn ${active ? "is-active" : ""}`} onClick={() => setFormatId(f.id)}>
                {f.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-sm text-[var(--muted)]">
          Built-in formats are available to everyone.{" "}
          {canAccessCustomFormats ? (
            <>Custom formats appear here when you save or import them.</>
          ) : (
            <>
              Custom formats are Advanced only. <Link className="underline" href="/checkout">Upgrade to Advanced</Link> to create and use saved formats.
            </>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-7 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Upload CSV</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">We’ll auto-fix safe issues. Anything risky stays in the table for manual edits.</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="rg-btn cursor-pointer">
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>

            <button
              className="rg-btn"
              onClick={() => void exportFixedCsv()}
              disabled={busy || rows.length === 0}
              title={rows.length === 0 ? "Upload a CSV first" : "Export your fixed CSV"}
              type="button"
            >
              {busy ? "Working..." : "Export fixed CSV"}
            </button>
          </div>

          {rows.length > 0 && autoFixes.length === 0 ? (
            <div className="mt-4 text-sm text-[color:rgba(var(--muted-rgb),1)]">No auto fixes were applied for this upload.</div>
          ) : null}
        </div>

        <div ref={issuesPanelRef} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <h2 className="text-xl font-semibold text-[var(--text)]">Issues</h2>
          <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">Click a cell in the table to edit it. Red and yellow highlight errors and warnings.</p>

          <div className="mt-7">
            <EditableIssuesTable
              headers={tableHeaders}
              issues={issuesForDisplay as any}
              rows={rows}
              onUpdateRow={onUpdateRow}
              resetKey={formatId}
              formatId={formatId}
              pinnedRows={pinnedSorted}
              onUnpinRow={unpinRow}
              cellSeverityMap={issueCellMap}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
        <Link href="/presets" className="hover:underline">Preset Formats</Link>
        <Link href="/#pricing" className="hover:underline">Pricing</Link>
      </div>
    </div>
  );
}
