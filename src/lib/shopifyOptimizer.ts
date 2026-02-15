// src/lib/shopifyOptimizer.ts
import type { CsvRow } from "./csv";
import { validateAndFixShopifyBasic, type FixResult, type Issue as BaseIssue } from "./shopifyBasic";
import { isValidShopifyBool, normalizeShopifyBool, parseShopifyMoney } from "./shopifySchema";

/**
 * Shopify Import Optimizer (strict layer)
 *
 * - Runs canonicalization + safe fixes (shopifyBasic)
 * - Adds stricter "import readiness" rules (still deterministic)
 */
export function validateAndFixShopifyOptimizer(headers: string[], rows: CsvRow[]): FixResult {
  const base = validateAndFixShopifyBasic(headers, rows);

  const fixedHeaders = base.fixedHeaders;
  const fixedRows = base.fixedRows;
  const fixesApplied = [...(base.fixesApplied ?? [])];
  const issues: BaseIssue[] = [...(base.issues ?? [])];

  const cStatus = "Status";
  const cPublished = "Published on online store";
  const cPrice = "Price";
  const cCompare = "Compare-at price";

  function add(issue: {
    row: number;
    column: string;
    message: string;
    severity: "error" | "warning" | "info";
    code: string;
    suggestion?: string;
  }) {
    issues.push(issue as any);
  }

  function get(r: CsvRow, k: string) {
    const v = (r as any)?.[k];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  }

  // Status normalization + strict validation (Shopify valid values: active, draft, archived)
  if (fixedHeaders.includes(cStatus)) {
    const allowed = new Set(["active", "draft", "archived"]);
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i];
      const raw = get(r, cStatus).trim();
      if (!raw) continue;

      const lower = raw.toLowerCase();
      if (allowed.has(lower) && raw !== lower) {
        (r as any)[cStatus] = lower;
        fixesApplied.push(`Normalized Status to "${lower}" on row ${i + 1}`);
      } else if (!allowed.has(lower)) {
        add({
          row: i + 1,
          column: cStatus,
          message: `Invalid Status "${raw}". Use active, draft, or archived.`,
          severity: "error",
          code: "shopify/invalid_status",
          suggestion: `Set Status to active, draft, or archived.`,
        });
      }
    }
  }

  // Published strict safety net (true/false)
  if (fixedHeaders.includes(cPublished)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i];
      const raw = get(r, cPublished).trim();
      if (!raw) continue;
      const norm = normalizeShopifyBool(raw);
      if (norm !== raw) {
        (r as any)[cPublished] = norm;
        fixesApplied.push(`Normalized Published on online store to "${norm}" on row ${i + 1}`);
      }
      if (!isValidShopifyBool(get(r, cPublished))) {
        add({
          row: i + 1,
          column: cPublished,
          message: `Published on online store must be true or false (got "${raw}").`,
          severity: "error",
          code: "shopify/invalid_boolean_published",
          suggestion: `Change to "true" or "false".`,
        });
      }
    }
  }

  // Compare-at strict numeric + sanity (extra safety)
  if (fixedHeaders.includes(cPrice) || fixedHeaders.includes(cCompare)) {
    for (let i = 0; i < fixedRows.length; i++) {
      const r = fixedRows[i];
      const priceRaw = get(r, cPrice).trim();
      const compareRaw = get(r, cCompare).trim();

      const price = priceRaw ? parseShopifyMoney(priceRaw) : null;
      const compare = compareRaw ? parseShopifyMoney(compareRaw) : null;

      if (priceRaw && price == null) {
        add({
          row: i + 1,
          column: cPrice,
          message: `Price is not a valid number ("${priceRaw}").`,
          severity: "error",
          code: "shopify/invalid_numeric_price",
          suggestion: "Use numbers like 19.99 (no currency symbols).",
        });
      }

      if (compareRaw && compare == null) {
        add({
          row: i + 1,
          column: cCompare,
          message: `Compare-at price is not a valid number ("${compareRaw}").`,
          severity: "error",
          code: "shopify/invalid_numeric_compare_at",
          suggestion: "Use numbers like 29.99 (no currency symbols).",
        });
      }

      if (price != null && compare != null && compare > 0 && price > 0 && compare < price) {
        add({
          row: i + 1,
          column: cCompare,
          message: `Compare-at price (${compareRaw}) is less than Price (${priceRaw}).`,
          severity: "warning",
          code: "shopify/compare_at_less_than_price",
          suggestion: "Compare-at price is usually higher than price when on sale.",
        });
      }
    }
  }

  return {
    fixedHeaders,
    fixedRows,
    issues: issues as any,
    fixesApplied,
  };
}
