// src/app/app/fixer/useFixer.ts
// State and logic for the CSV Fixer page (upload → validate/fix → edit → export).
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isValidLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { exportFileFor, toCsv } from "@/lib/csv";
import { processCsv } from "@/lib/processCsvClient";
import { consumeExport, getPlanLimits, getQuota } from "@/lib/quota";
import { exportCountsTowardLimit } from "@/lib/plans";
import { clearPendingFile, loginHrefForHere, stashPendingFile, startPassCheckout, takePendingFile } from "@/lib/passCheckout";
import { createClient } from "@/lib/supabase/browser";
import type { Translations } from "@/lib/i18n/getTranslations";

import { getShopifyVariantSignature, resolveShopifyVariantColumns } from "@/lib/shopifyVariantSignature";

import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import type { CsvFormat, CsvIssue } from "@/lib/formats/types";
import { loadUserFormatsFromStorage, userFormatToCsvFormat } from "@/lib/formats/customUser";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import { trackToolEvent } from "@/lib/analytics";
import { computeValidationBreakdown } from "@/lib/validation/scoring";
import { fixAllShopifyBlocking } from "@/lib/validation/fixAllShopify";

// Phase helpers
import { computeReadinessSummary } from "@/lib/validation/readiness";
import { buildScoreNotes } from "@/lib/validation/scoreNotes";
import { useValidationText } from "@/lib/i18n/useValidationText";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

// Phase 1: strict mode preference (Shopify)
import { getStrictMode, setStrictMode } from "@/lib/validation/strictMode";
import { readTextFile } from "@/lib/textFile";


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

// Workspace types (multi-file mode)
type WorkspaceDoc = {
  id: string;
  name: string;
  text: string;
};
type DocStatus = "pending" | "clean" | "warnings" | "errors";

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

export type AppStrings = Translations["app"];

export function useFixer(t: AppStrings) {
  const pathname = usePathname();
  const currentLocale: Locale = useMemo(() => {
    const seg = pathname?.split("/")?.[1] ?? "";
    return isValidLocale(seg) ? seg : DEFAULT_LOCALE;
  }, [pathname]);
  // Validator messages and issue text in the page's language.
  const vt = useValidationText(currentLocale);

  const [headers, setHeaders] = useState<string[]>([]);
  // Lines above the header (eBay's "#INFO" lines), written back on export.
  const [preamble, setPreamble] = useState<string[]>([]);
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
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  const [lastExportStats, setLastExportStats] = useState<{ rows: number; fixes: number; score: number; fileName: string } | null>(null);
  const [upsellDismissed, setUpsellDismissed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  const [exportBaseName, setExportBaseName] = useState<string | null>(null);

  // inline edit state for the preview table
  const [editing, setEditing] = useState<{ rowIndex: number; col: string; value: string } | null>(null);

  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);

  // Workspace state (multi-file mode, paid plans only)
  const [workspaceDocs, setWorkspaceDocs] = useState<WorkspaceDoc[]>([]);
  const [activeWorkspaceDocId, setActiveWorkspaceDocId] = useState<string | null>(null);
  const [docStatuses, setDocStatuses] = useState<Map<string, DocStatus>>(new Map());

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
    const FALLBACK_SUB = { ok: true, plan: "free" as const, status: "none", signedIn: false };
    try {
      const supabase = createClient();
      // Run quota fetch and session lookup in parallel; subscription query depends on session.
      const [q, { data: { session } }] = await Promise.all([
        getQuota(),
        supabase.auth.getSession(),
      ]);

      let s: SubStatus = FALLBACK_SUB;
      if (session?.user) {
        const { data } = await supabase
          .from("user_subscriptions")
          .select("plan,status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        const activePlan = data?.status === "active" ? data.plan : "free";
        s = {
          ok: true,
          plan: (activePlan ?? "free") as "free" | "basic" | "advanced",
          status: data?.status ?? "none",
          signedIn: true,
        };
      }

      const plan = ((s?.plan ?? q?.plan ?? "free") as "free" | "basic" | "advanced") ?? "free";
      const limits = getPlanLimits(plan) as PlanLimits;

      setQuota(q);
      setSubStatus(s);
      setPlanLimits(limits);
    } catch {
      // Silently fail — quota/plan remain at defaults
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
    window.addEventListener("striveformats-formats-changed", onChanged);
    return () => window.removeEventListener("striveformats-formats-changed", onChanged);
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

  // Workspace file limit based on plan
  const workspaceFileLimit = useMemo(() => {
    const status = (subStatus?.status ?? "").toLowerCase();
    const plan = subStatus?.plan ?? "free";
    if (plan === "advanced" && status === "active") return 20;
    if (plan === "basic" && status === "active") return 5;
    return 1;
  }, [subStatus]);
  const workspaceEnabled = workspaceFileLimit > 1;

  // Track doc status based on current issues when active doc changes
  useEffect(() => {
    if (!activeWorkspaceDocId) return;
    const hasErrors = (issues as any[]).some((i) => (i?.severity ?? i?.level) === "error");
    const hasWarnings = (issues as any[]).some((i) => (i?.severity ?? i?.level) === "warning");
    const status: DocStatus = hasErrors ? "errors" : hasWarnings ? "warnings" : issues.length ? "warnings" : "clean";
    setDocStatuses((prev) => new Map(prev).set(activeWorkspaceDocId, status));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceDocId, issues]);

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

    // Count truly blank rows — rows where every cell value is empty after trimming.
    // We use the already-parsed fixed rows for precision (avoids raw-text CSV quoting edge-cases).
    for (const r of rows) {
      const allEmpty = Object.values(r).every((v) => !String(v ?? "").trim());
      if (allEmpty) ignoredRows += 1;
    }

    // Platform-specific merge/overwrite estimates.
    if (formatId === "shopify_products") {
      let mergedVariants = 0;
      // Groups keyed by handle||comboKey → list of row indexes
      const mergeGroups = new Map<string, number[]>();
      const cols = resolveShopifyVariantColumns(headers);
      const get = (r: any, k: string) => (typeof r?.[k] === "string" ? r[k] : String(r?.[k] ?? ""));

      for (let i = 0; i < rows.length; i++) {
        // Skip rejected and truly blank rows — they won't reach Shopify's merge logic
        if (reject.has(i)) continue;
        const r = rows[i] ?? {};
        if (Object.values(r).every((v) => !String(v ?? "").trim())) continue;

        const sig = getShopifyVariantSignature(r, cols, (row, col) => get(row as any, col));
        if (!sig.handle) continue;
        if (!sig.hasVariantSignals) continue;
        if (!sig.comboKey.replace(/\|/g, "").trim()) continue;

        const key = `${sig.handle.toLowerCase()}||${sig.comboKey}`;
        const list = mergeGroups.get(key) ?? [];
        list.push(i);
        mergeGroups.set(key, list);
      }

      for (const list of mergeGroups.values()) {
        if (list.length > 1) mergedVariants += list.length - 1;
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
  }, [simulateImport, formatId, issuesForTable, rows, headers]);

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

  // Column order for the on-screen tables (export keeps the file's order): the columns
  // that name the product, then the ones with issues, then everything else. Otherwise
  // the problem cells are often far off to the right.
  const displayHeaders = useMemo(() => {
    const isName = (h: string) => /^\*?(title|name|url handle|handle|item[-_ ]name)$/i.test(h.trim());
    const withIssues = new Set<string>();
    for (const key of issueCellMap.keys()) withIssues.add(key.slice(key.indexOf("|||") + 3));
    const names = tableHeaders.filter(isName);
    const flagged = tableHeaders.filter((h) => !isName(h) && withIssues.has(h));
    const rest = tableHeaders.filter((h) => !isName(h) && !withIssues.has(h));
    return [...names, ...flagged, ...rest];
  }, [tableHeaders, issueCellMap]);

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

    // Include pinned rows first (sorted). Capped: a file where every row has an
    // issue would otherwise render thousands of rows of inputs and freeze the page.
    for (const r of pinnedSorted) {
      if (out.length >= LIMIT) break;
      out.push(r);
    }

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
      setErrorBanner(t.fixAllNone);
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
      // Large files are parsed + validated in a Web Worker so the page stays responsive.
      const res = await processCsv(csvText, format, { strictShopify: getStrictMode() });

      const nextParseIssues: UiIssue[] = (res.parseIssues ?? []).map((p) => ({ ...p, level: p.severity }));

      setParseIssues(nextParseIssues);

      setHeaders(res.fixedHeaders ?? []);
      setRows(res.fixedRows ?? []);
      setPreamble(res.preamble ?? []);

      setIssues([...(res.issues ?? []), ...nextParseIssues] as any);

      setAutoFixes(res.fixesApplied ?? []);
      if (typeof name === "string") setFileName(name);
      setUploadRunId((v) => v + 1);

      setLastFixAll(null);
      // Reset pin state for a new run
      setManualPinnedRows(new Set());
      setAutoPinnedRows(new Set());
      setSuppressedAutoPins(new Set());

      trackToolEvent(
        "validation_complete",
        {
          format: format.id,
          rows: res.fixedRows?.length ?? 0,
          issues: (res.issues?.length ?? 0) + nextParseIssues.length,
          auto_fixes: res.fixesApplied?.length ?? 0,
        },
        subStatus?.plan,
      );

      await refreshQuotaAndPlan();
    } catch (e: any) {
      setErrorBanner(e?.message ?? t.processFailed);
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
    trackToolEvent("file_uploaded", { format: activeFormat?.id ?? null }, subStatus?.plan);

    try {
      const { text } = await readTextFile(file);
      setLastUploadedText(text);

      setIssues([]);
      setParseIssues([]);
      setAutoFixes([]);
      setEditing(null);
      setLastFixAll(null);
      setLastExportStats(null);
      // Reset pin state for a new run
      setManualPinnedRows(new Set());
      setSuppressedAutoPins(new Set());

      if (activeFormat) {
        await runFormatOnText(activeFormat, text, file.name);
      }
    } catch (e: any) {
      setErrorBanner(e?.message ?? t.processFailed);
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  // Workspace: add a file as a workspace document and switch to it
  async function handleWorkspaceFile(file: File) {
    if (!workspaceEnabled) {
      return handleFile(file);
    }
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { text } = await readTextFile(file);
    const doc: WorkspaceDoc = { id, name: file.name, text };

    setWorkspaceDocs((prev) => {
      const capped = prev.length >= workspaceFileLimit ? prev.slice(0, workspaceFileLimit - 1) : prev;
      return [...capped, doc];
    });
    setActiveWorkspaceDocId(id);
    setFileName(file.name);
    setLastUploadedText(text);
    if (activeFormat) {
      await runFormatOnText(activeFormat, text, file.name);
    }
  }

  // Workspace: switch to an existing workspace document
  async function switchWorkspaceDoc(doc: WorkspaceDoc) {
    if (doc.id === activeWorkspaceDocId) return;
    setActiveWorkspaceDocId(doc.id);
    setFileName(doc.name);
    setLastUploadedText(doc.text);
    if (activeFormat) {
      await runFormatOnText(activeFormat, doc.text, doc.name);
    }
  }

  // Pick up a file stashed before sign-in / pass checkout.
  const restoredPendingRef = useRef(false);
  useEffect(() => {
    if (restoredPendingRef.current || !allFormats.length) return;
    restoredPendingRef.current = true;
    const pending = takePendingFile("fixer");
    if (!pending) return;
    const format = allFormats.find((f) => f.id === pending.formatId) ?? activeFormat;
    if (!format) return;
    setFormatId(format.id);
    setLastUploadedText(pending.text);
    setFileName(pending.name);
    void runFormatOnText(format, pending.text, pending.name).then(() => setInfoBanner(t.fileRestored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFormats]);

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

  // Auto-disable strict mode if the plan drops below Advanced while it's on.
  useEffect(() => {
    if (strictShopify && !isAdvancedActive) {
      setStrictShopify(false);
      setInfoBanner(t.strictModeTurnedOff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedActive]);

  async function exportFixedCsv() {
    setBusy(true);
    setErrorBanner(null);
    trackToolEvent("export_attempted", { format: activeFormat?.id ?? null }, subStatus?.plan);
    try {
      await consumeExport(rows.length);

      const cols = tableHeaders.length ? tableHeaders : Object.keys(rows[0] ?? {});
      const file = exportFileFor(activeFormat?.id, cols, rows, preamble);

      const blob = new Blob([file.text], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const base = (exportBaseName ?? fileName ?? "fixed").replace(/\.(csv|txt|tsv)$/i, "").trim() || "fixed";
      a.download = `${base}_fixed.${file.extension}`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setLastExportStats({
        rows: rows.length,
        fixes: autoFixes.length,
        score: Number(validation.score),
        fileName: a.download,
      });
      setUpsellDismissed(false);

      await refreshQuotaAndPlan();
    } catch (e: any) {
      const isLimitError =
        (e?.message ?? "").toLowerCase().includes("limit") ||
        (e?.message ?? "").toLowerCase().includes("quota");
      if (isLimitError) {
        trackToolEvent(
          "export_limit_hit",
          { format: activeFormat?.id ?? null, signed_in: subStatus?.signedIn ?? false },
          subStatus?.plan,
        );
      }
      setErrorBanner(e?.message ?? t.exportFailed);
      try {
        await refreshQuotaAndPlan();
      } catch {
        // ignore
      }
    } finally {
      setBusy(false);
    }
  }


  const used = Number(quota?.used ?? 0);
  const limit = isUnlimited ? null : Number(planLimits?.exportsPerMonth ?? quota?.limit ?? 3);
  const left = isUnlimited ? null : Math.max(0, Number(quota?.remaining ?? (Number(limit ?? 0) - used)));
  const quotaExceeded = !isUnlimited && left !== null && left <= 0;
  // Small files never count, so only a large file is stopped by the limit.
  const exportNeedsQuota = exportCountsTowardLimit(rows.length);
  const passExpiresAt: string | null = (quota as { passExpiresAt?: string | null } | null)?.passExpiresAt ?? null;

  const [passBusy, setPassBusy] = useState(false);

  /** Keep the current (edited) file, then go to sign-in or Stripe for the pass. */
  async function buyPass() {
    if (activeFormat && rows.length) {
      const cols = tableHeaders.length ? tableHeaders : Object.keys(rows[0] ?? {});
      stashPendingFile({ tool: "fixer", formatId: activeFormat.id, name: fileName ?? "file.csv", text: toCsv(cols, rows) });
    }
    setPassBusy(true);
    setErrorBanner(null);
    trackToolEvent("pass_checkout_started", { format: activeFormat?.id ?? null, rows: rows.length }, subStatus?.plan);
    const r = await startPassCheckout();
    if (r === "signin") {
      window.location.href = loginHrefForHere();
      return;
    }
    if (r !== "redirected") {
      clearPendingFile();
      setPassBusy(false);
      setErrorBanner(t.passError);
    }
  }


  const fixLogBase = safeBaseName(exportBaseName ?? fileName ?? "csv");

  const blockingCount = Number(validation?.counts?.blockingErrors ?? 0);

  return {
    currentLocale,
    vt,
    // file + data
    fileName,
    rows,
    tableHeaders,
    displayHeaders,
    busy,
    handleFile,
    lastUploadedText,
    // formats
    formatId,
    setFormatId,
    allFormats,
    activeFormat,
    canAccessCustomFormats,
    // plan + quota
    subStatus,
    isAdvancedActive,
    isUnlimited,
    used,
    limit,
    left,
    quotaExceeded,
    showQuotaModal,
    setShowQuotaModal,
    // banners
    errorBanner,
    setErrorBanner,
    infoBanner,
    setInfoBanner,
    // results
    validation,
    blockingCount,
    readiness,
    scoreNotes,
    importConfidence,
    importSimulation,
    simulateImport,
    setSimulateImport,
    strictShopify,
    setStrictShopify,
    autoFixes,
    collapsedAutoFixes,
    lastFixAll,
    realFixableBlockingCount,
    fixLogBase,
    // export
    exportFixedCsv,
    exportNeedsQuota,
    passExpiresAt,
    buyPass,
    passBusy,
    lastExportStats,
    upsellDismissed,
    setUpsellDismissed,
    // issues + editing
    issueSeverityFilter,
    setIssueSeverityFilter,
    issuesForTable,
    issuesForDisplay,
    issueCellMap,
    previewRows,
    pinnedSorted,
    effectivePinnedRows,
    pinRow,
    unpinRow,
    lockEditingRow,
    unlockEditingRow,
    onUpdateRow,
    // workspace (multi-file, paid plans)
    workspaceEnabled,
    workspaceFileLimit,
    workspaceDocs,
    setWorkspaceDocs,
    activeWorkspaceDocId,
    setActiveWorkspaceDocId,
    docStatuses,
    handleWorkspaceFile,
    switchWorkspaceDoc,
  };
}

export type Fixer = ReturnType<typeof useFixer>;

export { downloadText };

