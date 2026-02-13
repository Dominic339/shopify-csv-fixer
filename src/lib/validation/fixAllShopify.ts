import type { CsvIssue, CsvRow } from "@/lib/formats/types";
import { SHOPIFY_ISSUE_META } from "./issueMetaShopify";

export type FixAllResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  fixesApplied: string[];
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

  const fixedHeaders = [...headers];
  const fixedRows: CsvRow[] = rows.map((r) => ({ ...r }));

  // 1) Add missing required headers safely (blank values)
  // We detect these via issues with code shopify/missing_required_header
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
        raw === "true" || raw === "1" || raw === "yes" || raw === "y" ? "TRUE" : raw === "false" || raw === "0" || raw === "no" || raw === "n" ? "FALSE" : null;

      if (next) {
        setStr(row, colPublished, next);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized Published → ${next}`);
      }
      continue;
    }

    // Inventory policy normalization
    if (code === "shopify/invalid_inventory_policy" && colInvPolicy) {
      const raw = getStr(row, colInvPolicy).trim().toLowerCase();
      const next = raw.includes("deny") ? "deny" : raw.includes("continue") ? "continue" : "deny";
      setStr(row, colInvPolicy, next);
      fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized Variant Inventory Policy → ${next}`);
      continue;
    }

    // Status normalization (lowercase if it becomes valid)
    if (code === "shopify/invalid_status" && colStatus) {
      const raw = getStr(row, colStatus).trim().toLowerCase();
      const allowed = new Set(["active", "draft", "archived"]);
      if (allowed.has(raw)) {
        setStr(row, colStatus, raw);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized Status → ${raw}`);
      }
      continue;
    }

    // Numeric price cleanup
    if (code === "shopify/invalid_numeric_price") {
      const col = issue.column;
      if (!col || col === "(file)") continue;

      const raw = getStr(row, col);
      const cleaned = raw.replace(/[$,]/g, "").trim();

      // only apply if parseable as a number after cleanup
      const num = Number(cleaned);
      if (Number.isFinite(num)) {
        const normalized = String(num);
        setStr(row, col, normalized);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${col} → ${normalized}`);
      }
      continue;
    }
  }

  return { fixedHeaders, fixedRows, fixesApplied };
}
