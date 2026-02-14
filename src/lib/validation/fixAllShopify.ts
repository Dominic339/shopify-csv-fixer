import type { CsvIssue, CsvRow } from "@/lib/formats/types";
import { SHOPIFY_ISSUE_META } from "./issueMetaShopify";

export type FixAllSummary = {
  /** Number of blocking issues that were eligible for Fix All (autoFixable + blocking). */
  autoFixableBlockingFound: number;
  /** Number of successful fix operations applied (best-effort). */
  fixesAppliedCount: number;
  /** Count of fixes grouped by issue code. */
  fixedByCode: Record<string, number>;
};

export type FixAllResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  fixesApplied: string[];
  summary: FixAllSummary;
};

function getStr(r: CsvRow, col: string) {
  const v = r[col];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function setStr(r: CsvRow, col: string, value: string) {
  r[col] = value;
}

/**
 * Shopify “Fix All Blocking Issues”
 *
 * IMPORTANT DESIGN RULE:
 * - Only fix issues that are BOTH:
 *    (a) blocking
 *    (b) explicitly marked autoFixable in SHOPIFY_ISSUE_META
 * - Never guess business context (handles, titles, vendors, SKUs).
 */
export function fixAllShopifyBlocking(headers: string[], rows: CsvRow[], issues: CsvIssue[]): FixAllResult {
  const fixesApplied: string[] = [];
  const fixedByCode: Record<string, number> = {};

  const fixedHeaders = [...(headers ?? [])];
  const fixedRows: CsvRow[] = (rows ?? []).map((r) => ({ ...r }));

  // Count how many blockers are eligible
  const autoFixableBlockingFound = issues.filter((i) => {
    if (i.severity !== "error") return false;
    const meta = SHOPIFY_ISSUE_META[i.code ?? ""];
    return Boolean(meta?.blocking && meta?.autoFixable);
  }).length;

  function bump(code: string) {
    fixedByCode[code] = (fixedByCode[code] ?? 0) + 1;
  }

  // 1) Add missing required headers safely (blank values)
  const missingHeaderIssues = issues.filter((i) => i.code === "shopify/missing_required_header");
  for (const i of missingHeaderIssues) {
    const missing = (i.column ?? "").trim();
    if (!missing) continue;

    if (!fixedHeaders.includes(missing)) {
      fixedHeaders.push(missing);
      for (const r of fixedRows) {
        if (r[missing] == null) r[missing] = "";
      }
      fixesApplied.push(`Added missing required column header: ${missing}`);
      bump(i.code ?? "shopify/missing_required_header");
    }
  }

  // Helper: locate Shopify columns (when present)
  const colPublished = fixedHeaders.find((h) => h.toLowerCase() === "published");
  const colInvPolicy = fixedHeaders.find((h) => h.toLowerCase() === "variant inventory policy");
  const colStatus = fixedHeaders.find((h) => h.toLowerCase() === "status");

  // 2) Fix row-level blocking issues that are marked autoFixable
  for (const issue of issues) {
    if (issue.severity !== "error") continue;
    const code = issue.code ?? "";
    const meta = SHOPIFY_ISSUE_META[code];
    if (!meta?.blocking || !meta?.autoFixable) continue;

    // File-level issues may have rowIndex < 0; skip row edits
    if (issue.rowIndex == null || issue.rowIndex < 0) continue;

    const row = fixedRows[issue.rowIndex];
    if (!row) continue;

    // Published normalization
    if (code === "shopify/invalid_boolean_published" && colPublished) {
      const raw = getStr(row, colPublished).trim().toLowerCase();
      const next =
        raw === "true" || raw === "1" || raw === "yes" || raw === "y"
          ? "TRUE"
          : raw === "false" || raw === "0" || raw === "no" || raw === "n"
            ? "FALSE"
            : null;

      if (next) {
        setStr(row, colPublished, next);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized Published → ${next}`);
        bump(code);
      }
      continue;
    }

    // Inventory policy normalization
    if (code === "shopify/invalid_inventory_policy" && colInvPolicy) {
      const raw = getStr(row, colInvPolicy).trim().toLowerCase();
      const next = raw.includes("deny") ? "deny" : raw.includes("continue") ? "continue" : "deny";
      setStr(row, colInvPolicy, next);
      fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized Variant Inventory Policy → ${next}`);
      bump(code);
      continue;
    }

    // Status normalization
    if (code === "shopify/invalid_status" && colStatus) {
      const raw = getStr(row, colStatus).trim().toLowerCase();
      const allowed = new Set(["active", "draft", "archived"]);
      if (allowed.has(raw)) {
        setStr(row, colStatus, raw);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized Status → ${raw}`);
        bump(code);
      }
      continue;
    }

    // Numeric price cleanup
    if (code === "shopify/invalid_numeric_price") {
      const col = issue.column;
      if (!col || col === "(file)") continue;

      const raw = getStr(row, col);
      const cleaned = raw.replace(/[$,]/g, "").trim();
      const num = Number(cleaned);

      if (Number.isFinite(num)) {
        const normalized = String(num);
        setStr(row, col, normalized);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${col} → ${normalized}`);
        bump(code);
      }
      continue;
    }
  }

  return {
    fixedHeaders,
    fixedRows,
    fixesApplied,
    summary: {
      autoFixableBlockingFound,
      fixesAppliedCount: fixesApplied.length,
      fixedByCode,
    },
  };
}
