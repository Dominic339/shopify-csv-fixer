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

function normalizeCode(code: string | undefined | null): string {
  const c = (code ?? "").trim();
  if (!c) return "";
  if (c.startsWith("shopify/")) return c;

  // Legacy / base-validator codes -> canonical Shopify codes (must match issueMetaShopify.ts)
  const map: Record<string, string> = {
    missing_required_header: "shopify/missing_required_header",
    invalid_boolean_published: "shopify/invalid_boolean_published",
    invalid_boolean_continue_selling: "shopify/invalid_boolean_continue_selling",
    invalid_inventory_policy: "shopify/invalid_inventory_policy",
    invalid_status: "shopify/invalid_status",
    invalid_numeric_price: "shopify/invalid_numeric_price",
    invalid_numeric_compare_at: "shopify/invalid_numeric_compare_at",
  };

  return map[c] ?? c;
}

function stripMoneyLike(raw: string) {
  // Shopify expects plain numeric values (19.99). Remove common junk safely.
  return raw
    .replace(/\s+/g, " ")
    .replace(/[,$]/g, "")
    .replace(/^(USD|CAD|AUD|EUR|GBP)\s+/i, "")
    .replace(/\s+(USD|CAD|AUD|EUR|GBP)$/i, "")
    .trim();
}

/**
 * Shopify “Fix All Blocking Issues”
 *
 * IMPORTANT DESIGN RULE:
 * - Only fix issues that are BOTH:
 *    (a) blocking
 *    (b) explicitly marked autoFixable in SHOPIFY_ISSUE_META
 * - Never guess business context (titles, vendors, SKUs, option values, etc.)
 */
export function fixAllShopifyBlocking(headers: string[], rows: CsvRow[], issues: CsvIssue[]): FixAllResult {
  const fixesApplied: string[] = [];
  const fixedByCode: Record<string, number> = {};

  const fixedHeaders = [...(headers ?? [])];
  const fixedRows: CsvRow[] = (rows ?? []).map((r) => ({ ...r }));

  // Helper: locate Shopify columns (supports both legacy + new Shopify template)
  const col = (name: string) => fixedHeaders.find((h) => h.toLowerCase() === name.toLowerCase());
  const colAny = (...names: string[]) => names.map(col).find(Boolean);

  const colPublished = colAny("Published", "Published on online store");
  const colInvPolicy = colAny("Variant Inventory Policy", "Inventory policy");
  const colContinueSelling = colAny("Continue selling when out of stock", "Continue selling");
  const colStatus = col("Status");
  const colPrice = colAny("Variant Price", "Price");
  const colCompareAt = colAny("Variant Compare At Price", "Compare-at price");
  const colImagePos = colAny("Image Position", "Image position");

  // Dedupe input issues for counting + application
  const uniqueIssues: CsvIssue[] = [];
  const seen = new Set<string>();
  for (const i of issues ?? []) {
    const code = normalizeCode(i.code);
    const key = `${i.severity}|${code}|${i.rowIndex ?? -1}|${i.column ?? "(file)"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueIssues.push({ ...i, code });
  }

  // Count how many blockers are eligible
  const autoFixableBlockingFound = uniqueIssues.filter((i) => {
    if (i.severity !== "error") return false;
    const meta = SHOPIFY_ISSUE_META[i.code ?? ""];
    return Boolean(meta?.blocking && meta?.autoFixable);
  }).length;

  function bump(code: string) {
    fixedByCode[code] = (fixedByCode[code] ?? 0) + 1;
  }

  // 1) Add missing required headers safely (blank values)
  for (const i of uniqueIssues) {
    if (i.code !== "shopify/missing_required_header") continue;
    const missing = (i.column ?? "").trim();
    if (!missing) continue;

    if (!fixedHeaders.includes(missing)) {
      fixedHeaders.push(missing);
      for (const r of fixedRows) {
        if (r[missing] == null) r[missing] = "";
      }
      fixesApplied.push(`Added missing required column header: ${missing}`);
      bump(i.code);
    }
  }

  // 2) Fix row-level blocking issues that are marked autoFixable
  for (const issue of uniqueIssues) {
    if (issue.severity !== "error") continue;

    const code = issue.code ?? "";
    const meta = SHOPIFY_ISSUE_META[code];
    if (!meta?.blocking || !meta?.autoFixable) continue;

    // File-level issues may have rowIndex < 0; skip row edits
    if (issue.rowIndex == null || issue.rowIndex < 0) continue;

    const row = fixedRows[issue.rowIndex];
    if (!row) continue;

    // Published normalization (TRUE/FALSE)
    if (code === "shopify/invalid_boolean_published" && colPublished) {
      const raw = getStr(row, colPublished).trim().toLowerCase();
      const next =
        raw === "true" || raw === "1" || raw === "yes" || raw === "y" || raw === "published"
          ? "TRUE"
          : raw === "false" || raw === "0" || raw === "no" || raw === "n" || raw === "unpublished"
            ? "FALSE"
            : null;

      if (next) {
        setStr(row, colPublished, next);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${colPublished} → ${next}`);
        bump(code);
      }
      continue;
    }

    // Continue selling when out of stock normalization (TRUE/FALSE)
    if (code === "shopify/invalid_boolean_continue_selling" && colContinueSelling) {
      const raw = getStr(row, colContinueSelling).trim().toLowerCase();
      const next =
        raw === "true" || raw === "1" || raw === "yes" || raw === "y" || raw === "continue"
          ? "TRUE"
          : raw === "false" || raw === "0" || raw === "no" || raw === "n" || raw === "deny"
            ? "FALSE"
            : null;

      if (next) {
        setStr(row, colContinueSelling, next);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${colContinueSelling} → ${next}`);
        bump(code);
      }
      continue;
    }

    // Inventory policy normalization (deny/continue)
    if (code === "shopify/invalid_inventory_policy" && colInvPolicy) {
      const raw = getStr(row, colInvPolicy).trim().toLowerCase();
      const next = raw.includes("deny") ? "deny" : raw.includes("continue") ? "continue" : "deny";
      setStr(row, colInvPolicy, next);
      fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${colInvPolicy} → ${next}`);
      bump(code);
      continue;
    }

    // Status normalization (active/draft/archived)
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

    // Numeric price cleanup (Price / Variant Price)
    if (code === "shopify/invalid_numeric_price" && colPrice) {
      const raw = getStr(row, colPrice);
      const cleaned = stripMoneyLike(raw);
      const num = Number(cleaned);

      if (Number.isFinite(num)) {
        const normalized = String(num);
        setStr(row, colPrice, normalized);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${colPrice} → ${normalized}`);
        bump(code);
      }
      continue;
    }

    // Numeric compare-at cleanup (Compare-at price / Variant Compare At Price)
    if (code === "shopify/invalid_numeric_compare_at" && colCompareAt) {
      const raw = getStr(row, colCompareAt);
      const cleaned = stripMoneyLike(raw);
      const num = Number(cleaned);

      if (Number.isFinite(num)) {
        const normalized = String(num);
        setStr(row, colCompareAt, normalized);
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Normalized ${colCompareAt} → ${normalized}`);
        bump(code);
      }
      continue;
    }

    // Image position: keep support if you later mark it autoFixable in meta.
    if (code === "shopify/invalid_image_position" && colImagePos) {
      const raw = getStr(row, colImagePos).trim();
      const pn = Number(raw);
      if (!Number.isInteger(pn) || pn < 1) {
        // safest deterministic fix: blank it (Shopify accepts blank)
        setStr(row, colImagePos, "");
        fixesApplied.push(`Row ${issue.rowIndex + 1}: Cleared invalid ${colImagePos}`);
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
