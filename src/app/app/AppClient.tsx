// src/app/app/AppClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseCsv, toCsv } from "@/lib/csv";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { EditableIssuesTable } from "@/components/EditableIssuesTable";

import { getShopifyVariantSignature, resolveShopifyVariantColumns } from "@/lib/shopifyVariantSignature";

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
  const [uploadRunId, setUploadRunId] = useState(0);
  const lastAutoFixRunIdRef = useRef<number>(-1);

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
  const [autoPinnedRows, setAutoPinnedRows] = useState<Set<number>>(() => new Set());
  const [editingLockedRows, setEditingLockedRows] = useState<Set<number>>(() => new Set());

  // Phase 1: Shopify strict mode toggle (stored local)
  const [strictShopify, setStrictShopify] = useState<boolean>(() => getStrictMode());

  // Phase 1: Severity filter
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all");

  // When the user changes the issue filter, we want the app to re-pin the relevant rows for that filter.
  // Suppression is only meant to apply within the current filter scope.
  useEffect(() => {
    if (suppressedAutoPins.size) setSuppressedAutoPins(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueSeverityFilter]);

  // Import simulation toggle (Shopify/Woo/Etsy).
  const [simulateImport, setSimulateImport] = useState(false);

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

  const importSimulation = useMemo(() => {
    if (!simulateImport) return null;

    // Infer how many rows will be ignored/rejected based on common import behavior.
    const reject = new Set<number>();
    let ignoredRows = 0;

    // Any blocking issue on a row means that row is effectively rejected.
    for (const iss of issuesForTable) {
      if (typeof iss.rowIndex !== "number" || iss.rowIndex < 0) continue;
      const meta = getIssueMeta(formatId, iss.code);
      if (iss.severity === "error" && (meta?.blocking ?? true)) reject.add(iss.rowIndex);
    }

    // Count blank / empty rows in the original CSV text (best effort).
    if (lastUploadedText) {
      const lines = lastUploadedText.split(/\r?\n/);
      const headerIdx = lines.findIndex((l) => (l ?? "").trim().length > 0);
      if (headerIdx >= 0) {
        for (let i = headerIdx + 1; i < lines.length; i++) {
          const line = (lines[i] ?? "").trim();
          if (!line) {
            ignoredRows += 1;
            continue;
          }
          const stripped = line.replace(/,/g, "").replace(/"/g, "").replace(/\s+/g, "");
          if (!stripped) ignoredRows += 1;
        }
      }
    }

    // Platform-specific merge/overwrite estimates.
    if (formatId === "shopify_products") {
      let mergedVariants = 0;
      const mergeGroups = new Map<string, number>();
      const cols = resolveShopifyVariantColumns(headers);
      const get = (r: any, k: string) => (typeof r?.[k] === "string" ? r[k] : String(r?.[k] ?? ""));

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] ?? {};
        const sig = getShopifyVariantSignature(r, cols, (row, col) => get(row as any, col));
        if (!sig.handle) continue;
        if (!sig.hasVariantSignals) continue;
        if (!sig.comboKey.replace(/\|/g, "").trim()) continue;

        const key = `${sig.handle.toLowerCase()}||${sig.comboKey}`;
        mergeGroups.set(key, (mergeGroups.get(key) ?? 0) + 1);
      }

      for (const c of mergeGroups.values()) {
        if (c > 1) mergedVariants += c - 1;
      }

      return {
        mergedVariants,
        deletedRows: ignoredRows,
        rejectedRows: reject.size,
      };
    }

    if (formatId === "woocommerce_products" || formatId === "woocommerce_variable_products") {
      let mergedVariants = 0;
      let overwriteSkuRisk = 0;
      let orphanedVariations = 0;
      let variationRebuildImpact = 0;

      const parentKeys = new Set<string>();
      const skuCounts = new Map<string, number>();
      const comboCounts = new Map<string, number>();
      const get = (r: any, k: string) => (typeof r?.[k] === "string" ? r[k] : String(r?.[k] ?? ""));

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] ?? {};
        const type = get(r, "Type").trim().toLowerCase();
        const sku = get(r, "SKU").trim();
        if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);

        if (type && type !== "variation") {
          const id = get(r, "ID").trim();
          const name = get(r, "Name").trim();
          if (id) parentKeys.add(id);
          if (name) parentKeys.add(name);
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] ?? {};
        const type = get(r, "Type").trim().toLowerCase();
        if (type !== "variation") continue;
        variationRebuildImpact += 1;

        const parent = get(r, "Parent").trim();
        if (!parent || !parentKeys.has(parent)) {
          orphanedVariations += 1;
          continue;
        }

        const an = get(r, "Attribute 1 name").trim().toLowerCase();
        const av = get(r, "Attribute 1 value(s)").trim().toLowerCase();
        const combo = `${an}=${av}`.replace(/\s+/g, " ");
        if (!combo.replace(/[=\s]/g, "").trim()) continue;

        const key = `${parent.toLowerCase()}||${combo}`;
        comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
      }

      for (const c of comboCounts.values()) {
        if (c > 1) mergedVariants += c - 1;
      }

      for (const c of skuCounts.values()) {
        if (c > 1) overwriteSkuRisk += c - 1;
      }

      // Treat SKU overwrite as part of merge/overwrite risk.
      mergedVariants += overwriteSkuRisk;

      return {
        mergedVariants,
        deletedRows: ignoredRows,
        rejectedRows: reject.size,
        overwriteSkuRisk,
        orphanedVariations,
        variationRebuildImpact,
      };
    }

    if (formatId === "etsy_listings") {
      let overwriteListingIdRisk = 0;
      let overwriteSkuRisk = 0;

      const listingIdCounts = new Map<string, number>();
      const skuCounts = new Map<string, number>();
      const get = (r: any, k: string) => (typeof r?.[k] === "string" ? r[k] : String(r?.[k] ?? ""));

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] ?? {};
        const id = get(r, "Listing ID").trim();
        if (id) listingIdCounts.set(id, (listingIdCounts.get(id) ?? 0) + 1);
        const sku = get(r, "SKU").trim();
        if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
      }

      for (const c of listingIdCounts.values()) {
        if (c > 1) overwriteListingIdRisk += c - 1;
      }
      for (const c of skuCounts.values()) {
        if (c > 1) overwriteSkuRisk += c - 1;
      }

      return {
        mergedVariants: overwriteListingIdRisk + overwriteSkuRisk,
        deletedRows: ignoredRows,
        rejectedRows: reject.size,
        overwriteListingIdRisk,
        overwriteSkuRisk,
      };
    }

    return {
      mergedVariants: 0,
      deletedRows: ignoredRows,
      rejectedRows: reject.size,
    };
  }, [formatId, issuesForTable, rows, headers, lastUploadedText]);

  const readiness = useMemo(() => computeReadinessSummary(issuesForTable, formatId), [issuesForTable, formatId]);
  const scoreNotes = useMemo(
    () => buildScoreNotes(validation as any, issuesForTable, formatId),
    [validation, issuesForTable, formatId]
  );

  // Import Confidence: user-facing "how safe is import" metric.
  // Applies to supported ecommerce formats.
  const importConfidence = useMemo(() => {
    const supported = new Set(["shopify_products", "woocommerce_products", "woocommerce_variable_products", "etsy_listings"]);
    if (!supported.has(formatId)) return null;

    const base = Number((validation as any)?.score ?? 0);
    if (!Number.isFinite(base)) return 0;

    const blockingCount = Number((validation as any)?.counts?.blockingErrors ?? 0);
    const errors = Number((validation as any)?.counts?.errors ?? 0);
    const warnings = Number((validation as any)?.counts?.warnings ?? 0);

    let conf = base;

    // Enterprise-style weighted decay with compounding.
    const issueWeight = (sev: "error" | "warning" | "info") => {
      if (sev === "error") return 1.0;
      if (sev === "warning") return 0.6;
      return 0.2;
    };

    let decay = 1;

    if (blockingCount > 0) {
      decay *= Math.pow(0.72, Math.min(8, blockingCount));
    }

    const nonBlockingErrors = Math.max(0, errors - blockingCount);
    if (nonBlockingErrors > 0) decay *= Math.pow(0.93, Math.min(20, nonBlockingErrors));
    if (warnings > 0) decay *= Math.pow(0.97, Math.min(25, warnings));

    const riskyCats = new Set<string>();
    if (formatId.startsWith("woocommerce")) {
      riskyCats.add("variant");
      riskyCats.add("sku");
      riskyCats.add("attributes");
    } else if (formatId === "etsy_listings") {
      riskyCats.add("compliance");
      riskyCats.add("variant");
      riskyCats.add("sku");
    } else {
      riskyCats.add("variant");
    }

    let riskyIssueCount = 0;
    let seoIssueCount = 0;

    for (const issue of issuesForTable) {
      const meta = getIssueMeta(formatId, issue.code);
      const cat = String(meta?.category ?? "structure");
      if (cat === "seo") seoIssueCount += 1;
      if (riskyCats.has(cat)) riskyIssueCount += issueWeight(issue.severity);
    }

    if (riskyIssueCount > 0) {
      decay *= Math.pow(0.88, Math.min(12, riskyIssueCount));
    }

    if (seoIssueCount > 0) {
      decay *= Math.pow(0.985, Math.min(20, seoIssueCount));
    }

    if (simulateImport && importSimulation) {
      const merged = Number(importSimulation.mergedVariants ?? 0);
      const rejected = Number(importSimulation.rejectedRows ?? 0);
      decay *= Math.pow(0.985, Math.min(30, merged));
      decay *= Math.pow(0.78, Math.min(8, rejected));
    }

    conf = conf * decay;

    if (blockingCount > 0) conf = Math.min(conf, 85);

    return Math.max(0, Math.min(100, Math.round(conf)));
  }, [formatId, validation, simulateImport, importSimulation, issuesForTable]);

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

  // Rows that should be auto-pinned for the *current filter scope*.
// Important behavior:
// - Auto-pins are "sticky" within the current filter: once a row is auto-pinned, it stays pinned
//   until the user unpins it OR the filter changes to a scope where it is irrelevant.
// - This avoids rows disappearing immediately after the user fixes an issue, which feels jarring.
const relevantRowsForCurrentFilter = useMemo(() => {
  const set = new Set<number>();
  for (const iss of issuesForDisplay) {
    if (typeof iss.rowIndex === "number" && iss.rowIndex >= 0) set.add(iss.rowIndex);
  }
  return set;
}, [issuesForDisplay]);

// When the filter changes, reset sticky auto-pins to only rows relevant to the new scope (minus suppressed).
useEffect(() => {
  const next = new Set<number>();
  relevantRowsForCurrentFilter.forEach((r) => {
    if (!suppressedAutoPins.has(r)) next.add(r);
  });
  setAutoPinnedRows(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [issueSeverityFilter]);

// While staying in the same filter scope, only ADD new relevant rows (sticky pins).
useEffect(() => {
  if (!rows.length) {
    if (autoPinnedRows.size) setAutoPinnedRows(new Set());
    return;
  }

  let changed = false;
  const next = new Set(autoPinnedRows);

  relevantRowsForCurrentFilter.forEach((r) => {
    if (suppressedAutoPins.has(r)) return;
    if (!next.has(r)) {
      next.add(r);
      changed = true;
    }
  });

  if (changed) setAutoPinnedRows(next);
}, [rows.length, relevantRowsForCurrentFilter, suppressedAutoPins, autoPinnedRows]);

  // Suppressed auto-pins are cleared when the filter changes (see effect above).
// We intentionally DO NOT clear suppression just because an issue was fixed, otherwise a row the user
// explicitly unpinned could reappear during the same workflow.

  const effectivePinnedRows = useMemo(() => {
    const merged = new Set<number>();
    manualPinnedRows.forEach((r) => merged.add(r));
    autoPinnedRows.forEach((r) => merged.add(r));
    editingLockedRows.forEach((r) => merged.add(r));
    return merged;
  }, [manualPinnedRows, autoPinnedRows, editingLockedRows]);

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


  function lockEditingRow(rowIndex: number) {
    setEditingLockedRows((prev) => {
      if (prev.has(rowIndex)) return prev;
      const next = new Set(prev);
      next.add(rowIndex);
      return next;
    });
  }

  function unlockEditingRow(rowIndex: number) {
    setEditingLockedRows((prev) => {
      if (!prev.has(rowIndex)) return prev;
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
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
  // Auto-apply safe, deterministic fixes for Shopify auto-fixable blockers after each new upload run.
  useEffect(() => {
    if (formatId !== "shopify_products") return;
    if (busy) return;
    if (rows.length === 0) return;
    if (editing) return; // do not auto-change data while the user is actively editing a row
    if (realFixableBlockingCount <= 0) return;
    // Only run once per upload run id to avoid loops.
    if (lastAutoFixRunIdRef.current === uploadRunId) return;
    lastAutoFixRunIdRef.current = uploadRunId;
    handleFixAllBlocking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, uploadRunId, busy, rows.length, editing, realFixableBlockingCount]);


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
      setUploadRunId((v) => v + 1);

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
    setUploadRunId((v) => v + 1);

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

                {importConfidence != null ? (
                  <span
                    className={
                      "rounded-full border px-4 py-1.5 text-[var(--text)] " +
                      (validation.counts.blockingErrors
                        ? "border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.08)]"
                        : importConfidence >= 90
                          ? "border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.10)]"
                          : "border-[var(--border)] bg-[var(--surface)]")
                    }
                    title={
                      "Import confidence estimates how safely this file will import.\n\nIt is stricter than the validation score and accounts for:\n- Blocking errors (import failures)\n- Duplicate/overwrite risk (platform-specific)\n- Blank lines (ignored rows)"
                    }
                  >
                    {(() => {
                      const blocked = Number((validation as any)?.counts?.blockingErrors ?? 0) > 0;
                      return (
                        <>
                          Import confidence: <span className="font-semibold">{importConfidence}%</span>{" "}
                          <span className="text-[color:rgba(var(--muted-rgb),1)]">({blocked ? "blocked" : "safe to import"})</span>
                        </>
                      );
                    })()}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSimulateImport((v) => !v)}
                  className={
                    "rounded-full border px-4 py-1.5 font-semibold hover:opacity-90 " +
                    (simulateImport
                      ? "border-[color:rgba(var(--accent-rgb),0.45)] bg-[color:rgba(var(--accent-rgb),0.14)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[color:rgba(var(--muted-rgb),1)]")
                  }
                  title={simulateImport ? "Simulation is ON. Click to turn off." : "Simulate how the target platform would treat this CSV on import."}
                >
                  Simulate Import{simulateImport ? ": ON" : ""}
                </button>

                <span
                  className="text-[color:rgba(var(--muted-rgb),1)]"
                  title={
                    simulateImport && importSimulation
                      ? formatId === "shopify_products"
                        ? "Shopify simulation: merges duplicate variant combos, ignores blank rows, rejects rows with blockers."
                        : formatId?.startsWith("woocommerce")
                          ? "WooCommerce simulation: estimates SKU overwrite risk, duplicate variation merges, and orphaned variation rejects."
                          : formatId === "etsy_listings"
                            ? "Etsy simulation: estimates listing rejects and overwrite risks from duplicate listing IDs."
                            : "Import simulation is an estimate of platform behavior."
                      : undefined
                  }
                >
                  {validation.counts.errors} errors, {validation.counts.warnings} warnings
                  {validation.counts.blockingErrors ? ` • ${validation.counts.blockingErrors} blocking` : ""}
                  {simulateImport && importSimulation ? (
                    <>
                      {formatId === "shopify_products" ? (
                        <>
                          {` · Import simulation: merge ${importSimulation.mergedVariants} duplicate `}
                          {importSimulation.mergedVariants === 1 ? "variant" : "variants"}
                          {`, ignore ${importSimulation.deletedRows} blank `}
                          {importSimulation.deletedRows === 1 ? "row" : "rows"}
                          {`, reject ${importSimulation.rejectedRows} `}
                          {importSimulation.rejectedRows === 1 ? "row" : "rows"}
                        </>
                      ) : formatId?.startsWith("woocommerce") ? (
                        <>
                          {` · Import simulation: overwrite ${Number(importSimulation.overwriteSkuRisk ?? 0)} SKU `}
                          {Number(importSimulation.overwriteSkuRisk ?? 0) === 1 ? "conflict" : "conflicts"}
                          {`, merge ${Number(importSimulation.mergedVariants ?? 0)} duplicate `}
                          {Number(importSimulation.mergedVariants ?? 0) === 1 ? "variation" : "variations"}
                          {`, reject ${Number(importSimulation.orphanedVariations ?? 0)} orphaned `}
                          {Number(importSimulation.orphanedVariations ?? 0) === 1 ? "variation" : "variations"}
                        </>
                      ) : formatId === "etsy_listings" ? (
                        <>
                          {` · Import simulation: reject ${importSimulation.rejectedRows} `}
                          {importSimulation.rejectedRows === 1 ? "listing" : "listings"}
                          {`, overwrite ${Number(importSimulation.overwriteListingIdRisk ?? 0)} duplicate listing `}
                          {Number(importSimulation.overwriteListingIdRisk ?? 0) === 1 ? "id" : "ids"}
                        </>
                      ) : (
                        <>
                          {` · Import simulation: reject ${importSimulation.rejectedRows} `}
                          {importSimulation.rejectedRows === 1 ? "row" : "rows"}
                        </>
                      )}
                    </>
                  ) : null}
                </span>

                {/* Auto-fixable blockers are applied automatically */}

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

              {(["shopify_products", "woocommerce_products", "etsy_listings"] as const).includes(formatId as any) ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-[320px]">
                      <div className="text-base font-semibold text-[var(--text)]">
                        {(() => {
                          const blocking = Number((validation as any)?.counts?.blockingErrors ?? 0);
                          if (blocking > 0) {
                            return `Import blocked – resolve ${blocking} blocking ${blocking === 1 ? "issue" : "issues"} to continue`;
                          }
                          const platform =
                            formatId === "woocommerce_products" ? "WooCommerce" : formatId === "etsy_listings" ? "Etsy" : "Shopify";
                          return `Ready for ${platform} import`;
                        })()}
                      </div>
                      <div className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
                        {(() => {
                          const blocking = Number((validation as any)?.counts?.blockingErrors ?? 0);
                          if (blocking > 0) {
                            const platform =
                              formatId === "woocommerce_products" ? "WooCommerce" : formatId === "etsy_listings" ? "Etsy" : "Shopify";
                            return `Fix blocking issues to complete a clean ${platform} import.`;
                          }
                          return "No blocking issues detected. Exporting should import cleanly.";
                        })()}
                      </div>

                      {readiness.blockingErrors > 0 ? (
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
                          <div
                            key={n.key}
                            className={
                              "rounded-xl border p-3 " +
                              (n.key === "variant" && n.score < 70
                                ? "border-[color:rgba(255,80,80,0.35)] bg-[color:rgba(255,80,80,0.08)]"
                                : "border-[var(--border)] bg-[var(--surface)]")
                            }
                            title={
                              n.key === "variant" && n.score < 70
                                ? n.note + "\n\nWhy this matters: Shopify variants are keyed by Handle + Option values. Missing or duplicate option combinations can block imports or merge variants."
                                : n.note
                            }
                          >
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
            {/* Severity filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`pill-btn ${issueSeverityFilter === "all" ? "is-active" : ""}`}
                onClick={() => setIssueSeverityFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`pill-btn ${issueSeverityFilter === "error" ? "is-active" : ""}`}
                onClick={() => setIssueSeverityFilter("error")}
              >
                Errors
              </button>
              <button
                type="button"
                className={`pill-btn ${issueSeverityFilter === "warning" ? "is-active" : ""}`}
                onClick={() => setIssueSeverityFilter("warning")}
              >
                Warnings
              </button>
              <button
                type="button"
                className={`pill-btn ${issueSeverityFilter === "info" ? "is-active" : ""}`}
                onClick={() => setIssueSeverityFilter("info")}
              >
                Info
              </button>

              <div className="ml-auto text-sm text-[color:rgba(var(--muted-rgb),1)]">
                Showing {issuesForDisplay.length} {issueSeverityFilter === "all" ? "issues" : `${issueSeverityFilter} issues`}
              </div>
            </div>

            {/* Preview table (pins + inline edits) */}
            {rows.length ? (
              <div className="mb-6 max-h-[520px] overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)]">
                    <tr>
                      <th className="px-3 py-2">Pin</th>
                      <th className="px-3 py-2">Row</th>
                      {tableHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((rowIndex) => {
                      const row = rows[rowIndex] ?? {};
                      const isPinned = effectivePinnedRows.has(rowIndex);
                      return (
                        <tr
                          key={rowIndex}
                          className="border-b border-[color:rgba(var(--border-rgb),0.65)] last:border-b-0"
                          onFocusCapture={() => lockEditingRow(rowIndex)}
                          onBlurCapture={(e) => {
                            const next = (e.relatedTarget as Node | null);
                            if (!next || !(e.currentTarget as any).contains(next)) unlockEditingRow(rowIndex);
                          }}
                        >
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="pill-btn"
                              onClick={() => (isPinned ? unpinRow(rowIndex) : pinRow(rowIndex))}
                              title={isPinned ? "Unpin from Manual fixes" : "Pin to Manual fixes"}
                            >
                              {isPinned ? "Unpin" : "Pin"}
                            </button>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-[color:rgba(var(--muted-rgb),1)]">{rowIndex + 1}</td>
                          {tableHeaders.map((h) => {
                            const sev = issueCellMap.get(`${rowIndex}|||${h}`);
                            const base = "w-full rounded-xl border px-2 py-1 text-sm text-[var(--text)] outline-none";
                            const cls =
                              sev === "error"
                                ? base + " border-[color:rgba(255,80,80,0.55)] bg-[color:rgba(255,80,80,0.12)]"
                                : sev === "warning"
                                  ? base + " border-[color:rgba(255,200,0,0.55)] bg-[color:rgba(255,200,0,0.12)]"
                                  : base + " border-[var(--border)] bg-[var(--surface)]";

                            return (
                              <td key={h} className="px-3 py-2 min-w-[220px]">
                                <input
                                  className={cls}
                                  value={row?.[h] ?? ""}
                                  onChange={(e) => onUpdateRow(rowIndex, { [h]: e.target.value })}
                                  title={row?.[h] ?? ""}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-3 py-2 text-xs text-[color:rgba(var(--muted-rgb),1)]">
                  Preview shows pinned rows first, then fills up to 50 rows. Scroll horizontally to see all columns. Hover a cell to view the full value.
                </div>
              </div>
            ) : null}

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
              onRowEditStart={lockEditingRow}
              onRowEditEnd={unlockEditingRow}
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