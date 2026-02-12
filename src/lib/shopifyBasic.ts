import { CsvRow } from "./csv";

export type Severity = "error" | "warning" | "info";

export type Issue = {
  severity: Severity;
  code: string;
  message: string;
  row?: number; // 1-based (excluding header row)
  column?: string;
  suggestion?: string;
};

export type FixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: Issue[];
  fixesApplied: string[];
};

const REQUIRED = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published"];
const RECOMMENDED = ["Variant SKU", "Variant Price", "Variant Inventory Qty", "Variant Inventory Policy"];

// Shopify variant option columns (if present)
const OPTION_NAME_COLS = ["Option1 Name", "Option2 Name", "Option3 Name"] as const;
const OPTION_VALUE_COLS = ["Option1 Value", "Option2 Value", "Option3 Value"] as const;

function normHeader(h: string) {
  return h.trim().replace(/\s+/g, " ");
}

// Very safe, low-risk header aliases we can normalize
const HEADER_ALIASES: Record<string, string> = {
  "body html": "Body (HTML)",
  "body (html)": "Body (HTML)",
  body: "Body (HTML)",
  "inventory qty": "Variant Inventory Qty",
  "variant inventory quantity": "Variant Inventory Qty",
  price: "Variant Price",
  sku: "Variant SKU",
};

function headerToCanonical(h: string) {
  const key = h.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? h;
}

function hasAnyHeader(headers: string[], names: readonly string[]) {
  return names.some((n) => headers.includes(n));
}

function getStr(r: CsvRow, col: string) {
  const v = r[col];
  return (typeof v === "string" ? v : String(v ?? "")).trim();
}

function setStr(r: CsvRow, col: string, val: string) {
  r[col] = val;
}

export function validateAndFixShopifyBasic(headers: string[], rows: CsvRow[]): FixResult {
  const issues: Issue[] = [];
  const fixesApplied: string[] = [];

  // 1) Normalize headers
  const originalHeaders = headers.map(normHeader);
  const canonical = originalHeaders.map(headerToCanonical).map(normHeader);

  // Deduplicate headers if needed (rare but can happen)
  const seen = new Map<string, number>();
  const fixedHeaders = canonical.map((h) => {
    const count = (seen.get(h) ?? 0) + 1;
    seen.set(h, count);
    return count === 1 ? h : `${h} (${count})`;
  });

  if (fixedHeaders.join("|") !== headers.join("|")) {
    fixesApplied.push("Normalized column headers (spacing + common Shopify aliases).");
  }

  // 2) Required headers check
  for (const req of REQUIRED) {
    if (!fixedHeaders.includes(req)) {
      issues.push({
        severity: "error",
        code: "missing_required_header",
        message: `Missing required Shopify column: "${req}".`,
        column: req,
        suggestion: `Add the "${req}" column (even if blank) to meet Shopify import expectations.`,
      });
    }
  }

  for (const rec of RECOMMENDED) {
    if (!fixedHeaders.includes(rec)) {
      issues.push({
        severity: "info",
        code: "missing_recommended_header",
        message: `Recommended column not found: "${rec}".`,
        column: rec,
        suggestion: "Not always required, but commonly used in Shopify imports.",
      });
    }
  }

  // Map rows to new header set
  const headerMap: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) headerMap[headers[i]] = fixedHeaders[i];

  const fixedRows: CsvRow[] = rows.map((r) => {
    const out: CsvRow = {};
    // move values to canonical headers
    for (const [k, v] of Object.entries(r)) {
      const nk = headerMap[k] ?? normHeader(k);
      out[nk] = typeof v === "string" ? v : String(v ?? "");
    }
    // ensure all known headers exist
    for (const h of fixedHeaders) out[h] = out[h] ?? "";
    return out;
  });

  // 3) Row-level validations + safe fixes (single-row checks)
  for (let idx = 0; idx < fixedRows.length; idx++) {
    const rowNumber = idx + 1;
    const r = fixedRows[idx];

    // Handle required (Shopify uses it as unique key OR variant group key)
    if (fixedHeaders.includes("Handle")) {
      const handle = getStr(r, "Handle");
      if (!handle) {
        issues.push({
          severity: "error",
          code: "missing_handle",
          message: `Row ${rowNumber}: "Handle" is blank.`,
          row: rowNumber,
          column: "Handle",
          suggestion: "Handle must be a unique identifier (e.g., 'my-product-name'). For variants, all rows share the same handle.",
        });
      } else {
        const normalized = handle
          .toLowerCase()
          .replace(/[^a-z0-9\- ]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/\-+/g, "-");

        if (normalized !== handle && normalized.length > 0) {
          setStr(r, "Handle", normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Handle to "${normalized}".`);
        }
      }
    }

    // Published should be TRUE/FALSE (common import issue: true/false/yes/no/1/0)
    if (fixedHeaders.includes("Published")) {
      const val = getStr(r, "Published").toLowerCase();
      if (!val) {
        // blank is allowed in some exports; warn
        issues.push({
          severity: "warning",
          code: "published_blank",
          message: `Row ${rowNumber}: "Published" is blank.`,
          row: rowNumber,
          column: "Published",
          suggestion: `Use "TRUE" or "FALSE".`,
        });
      } else {
        const map: Record<string, string> = {
          true: "TRUE",
          false: "FALSE",
          yes: "TRUE",
          no: "FALSE",
          "1": "TRUE",
          "0": "FALSE",
        };
        const normalized = map[val] ?? "";
        if (!normalized) {
          issues.push({
            severity: "error",
            code: "published_invalid",
            message: `Row ${rowNumber}: "Published" should be TRUE/FALSE but is "${getStr(r, "Published")}".`,
            row: rowNumber,
            column: "Published",
            suggestion: `Change it to "TRUE" or "FALSE".`,
          });
        } else if (getStr(r, "Published") !== normalized) {
          setStr(r, "Published", normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Published to "${normalized}".`);
        }
      }
    }

    // Variant Price: safe normalization (remove $ and commas) + validate
    if (fixedHeaders.includes("Variant Price")) {
      const raw = getStr(r, "Variant Price");
      if (raw) {
        const cleaned = raw.replace(/[$,]/g, "").trim(); // remove $ and commas
        if (/^\d+(\.\d{1,2})?$/.test(cleaned)) {
          if (cleaned !== raw) {
            setStr(r, "Variant Price", cleaned);
            fixesApplied.push(`Row ${rowNumber}: Normalized Variant Price to "${cleaned}".`);
          }
        } else {
          issues.push({
            severity: "error",
            code: "price_invalid",
            message: `Row ${rowNumber}: "Variant Price" looks invalid ("${raw}").`,
            row: rowNumber,
            column: "Variant Price",
            suggestion: `Use a number like 19.99 (no $ sign).`,
          });
        }
      }
    }

    // Variant Inventory Qty: safe normalization (remove commas) + validate integer
    if (fixedHeaders.includes("Variant Inventory Qty")) {
      const raw = getStr(r, "Variant Inventory Qty");
      if (raw) {
        const cleaned = raw.replace(/,/g, "").trim();
        if (/^-?\d+$/.test(cleaned)) {
          if (cleaned !== raw) {
            setStr(r, "Variant Inventory Qty", cleaned);
            fixesApplied.push(`Row ${rowNumber}: Normalized Variant Inventory Qty to "${cleaned}".`);
          }

          // warn if negative (not always invalid, but suspicious)
          const n = Number(cleaned);
          if (Number.isFinite(n) && n < 0) {
            issues.push({
              severity: "warning",
              code: "inventory_qty_negative",
              message: `Row ${rowNumber}: "Variant Inventory Qty" is negative (${n}).`,
              row: rowNumber,
              column: "Variant Inventory Qty",
              suggestion: `Double-check if you really want negative inventory. Usually this should be 0 or higher.`,
            });
          }
        } else {
          issues.push({
            severity: "error",
            code: "inventory_qty_invalid",
            message: `Row ${rowNumber}: "Variant Inventory Qty" looks invalid ("${raw}").`,
            row: rowNumber,
            column: "Variant Inventory Qty",
            suggestion: `Use a whole number like 0, 5, 10 (no words).`,
          });
        }
      }
    }

    // Variant Inventory Policy validation + safe normalization
    if (fixedHeaders.includes("Variant Inventory Policy")) {
      const raw = getStr(r, "Variant Inventory Policy");
      if (raw) {
        const lower = raw.toLowerCase();
        if (lower !== "deny" && lower !== "continue") {
          issues.push({
            severity: "error",
            code: "inventory_policy_invalid",
            message: `Row ${rowNumber}: "Variant Inventory Policy" must be "deny" or "continue" (got "${raw}").`,
            row: rowNumber,
            column: "Variant Inventory Policy",
            suggestion: `Use "deny" (stop selling when out of stock) or "continue" (allow overselling).`,
          });
        } else if (raw !== lower) {
          setStr(r, "Variant Inventory Policy", lower);
          fixesApplied.push(`Row ${rowNumber}: Normalized Variant Inventory Policy to "${lower}".`);
        }
      }
    }

    // Tags safe normalization (trim spacing, remove empty tag entries)
    if (fixedHeaders.includes("Tags")) {
      const raw = getStr(r, "Tags");
      if (raw) {
        const normalized = raw
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .join(", ");

        if (normalized !== raw) {
          setStr(r, "Tags", normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Tags spacing.`);
        }
      }
    }

    // Helpful info for blanks (not blocking)
    for (const col of ["Title", "Vendor", "Type"] as const) {
      if (fixedHeaders.includes(col)) {
        const v = getStr(r, col);
        if (!v) {
          issues.push({
            severity: "info",
            code: `${col.toLowerCase()}_blank`,
            message: `Row ${rowNumber}: "${col}" is blank.`,
            row: rowNumber,
            column: col,
            suggestion: `Not always required, but Shopify listings usually need a ${col}.`,
          });
        }
      }
    }
  }

  // 4) Shopify "variant intelligence"
  // Shopify allows multiple rows with the SAME Handle to represent variants.
  // So instead of always erroring on duplicate handles, we group by handle and:
  // - detect likely variant groups
  // - validate consistency across variant rows
  // - only flag duplicates as errors when they look like accidental copies
  if (fixedHeaders.includes("Handle")) {
    const byHandle = new Map<string, number[]>(); // handle -> rowIndexes (0-based)

    for (let idx = 0; idx < fixedRows.length; idx++) {
      const handle = getStr(fixedRows[idx], "Handle");
      if (!handle) continue;

      const list = byHandle.get(handle) ?? [];
      list.push(idx);
      byHandle.set(handle, list);
    }

    // Variant option columns exist?
    const hasOptionCols = hasAnyHeader(fixedHeaders, OPTION_NAME_COLS) && hasAnyHeader(fixedHeaders, OPTION_VALUE_COLS);
    const hasSku = fixedHeaders.includes("Variant SKU");

    for (const [handle, idxs] of byHandle.entries()) {
      if (idxs.length <= 1) continue;

      // Determine if this looks like a variant group:
      // - option values vary OR
      // - SKUs vary OR
      // - explicit option columns are present with values
      const skuSet = new Set<string>();
      const optValueSet = new Set<string>();

      for (const i of idxs) {
        const r = fixedRows[i];
        if (hasSku) {
          const sku = getStr(r, "Variant SKU");
          if (sku) skuSet.add(sku);
        }
        if (hasOptionCols) {
          const vals = OPTION_VALUE_COLS.map((c) => getStr(r, c)).filter(Boolean).join("|");
          if (vals) optValueSet.add(vals);
        }
      }

      const looksLikeVariants =
        (hasOptionCols && optValueSet.size > 1) ||
        (hasSku && skuSet.size > 1) ||
        (hasOptionCols && optValueSet.size >= 1) ||
        (hasSku && skuSet.size >= 1);

      // Base (first) row is considered the "product row" in many Shopify exports
      const baseIdx = idxs[0];
      const baseRowNumber = baseIdx + 1;
      const base = fixedRows[baseIdx];

      // Consistency checks across variants
      // Fields that should typically be consistent for the same product handle
      const CONSISTENT_FIELDS = ["Title", "Body (HTML)", "Vendor", "Type"] as const;

      // If we have multiple rows and it doesn't look like variants, it's likely accidental duplicates.
      if (!looksLikeVariants) {
        const rowsList = idxs.map((i) => i + 1).join(", ");
        for (const idx of idxs) {
          issues.push({
            severity: "error",
            code: "duplicate_handle_not_variants",
            message: `Row ${idx + 1}: Handle "${handle}" appears multiple times (rows ${rowsList}) but does not look like a variant set.`,
            row: idx + 1,
            column: "Handle",
            suggestion: `If these are variants, add Option1 Name/Value (and Option2/3 if needed) or distinct Variant SKUs. Otherwise, handles should be unique per product.`,
          });
        }
        continue;
      }

      // Variant groups: provide guidance instead of blocking errors
      issues.push({
        severity: "info",
        code: "variant_group_detected",
        message: `Handle "${handle}" appears on ${idxs.length} rows (likely variants).`,
        row: baseRowNumber,
        column: "Handle",
        suggestion: `Shopify variants share a handle. Ensure option columns and SKUs are consistent and unique.`,
      });

      // Warn if the first row is missing key product info (common import failure)
      for (const col of CONSISTENT_FIELDS) {
        if (!fixedHeaders.includes(col)) continue;
        const v = getStr(base, col);
        if (!v) {
          issues.push({
            severity: "warning",
            code: "variant_group_base_missing",
            message: `Row ${baseRowNumber}: "${col}" is blank for the first row of a variant group ("${handle}").`,
            row: baseRowNumber,
            column: col,
            suggestion: `Usually the first row for a product should include ${col}.`,
          });
        }
      }

      // Check consistency (do not auto-blank; just warn)
      for (const idx of idxs) {
        if (idx === baseIdx) continue;
        const rowNum = idx + 1;
        const r = fixedRows[idx];

        for (const col of CONSISTENT_FIELDS) {
          if (!fixedHeaders.includes(col)) continue;
          const baseVal = getStr(base, col);
          const thisVal = getStr(r, col);

          // If a later variant row has a different non-blank value, warn
          if (thisVal && baseVal && thisVal !== baseVal) {
            issues.push({
              severity: "warning",
              code: "variant_group_inconsistent_field",
              message: `Row ${rowNum}: "${col}" differs from row ${baseRowNumber} for handle "${handle}".`,
              row: rowNum,
              column: col,
              suggestion: `For variants, "${col}" is usually consistent across all rows with the same handle. Consider moving the shared value to the first row and leaving this blank.`,
            });
          }
        }

        // Option validation
        if (hasOptionCols) {
          // If any option name is present in the file, values should generally be present for variants
          for (let oi = 0; oi < 3; oi++) {
            const nameCol = OPTION_NAME_COLS[oi];
            const valCol = OPTION_VALUE_COLS[oi];
            if (!fixedHeaders.includes(nameCol) || !fixedHeaders.includes(valCol)) continue;

            const name = getStr(r, nameCol);
            const val = getStr(r, valCol);

            // If a name is set anywhere in the group, values should not be blank on variant rows
            const baseName = getStr(base, nameCol);
            const groupName = baseName || name;
            if (groupName && !val) {
              issues.push({
                severity: "warning",
                code: "variant_option_missing_value",
                message: `Row ${rowNum}: "${valCol}" is blank but "${nameCol}" is set for handle "${handle}".`,
                row: rowNum,
                column: valCol,
                suggestion: `Variants usually require option values (e.g., Size = Small).`,
              });
            }
          }
        }
      }

      // SKU uniqueness checks (within this file)
      if (hasSku) {
        const skuToRows = new Map<string, number[]>();
        for (const idx of idxs) {
          const sku = getStr(fixedRows[idx], "Variant SKU");
          if (!sku) continue;
          const list = skuToRows.get(sku) ?? [];
          list.push(idx);
          skuToRows.set(sku, list);
        }
        for (const [sku, list] of skuToRows.entries()) {
          if (list.length <= 1) continue;
          const rowsList = list.map((i) => i + 1).join(", ");
          for (const idx of list) {
            issues.push({
              severity: "warning",
              code: "duplicate_sku_in_file",
              message: `Row ${idx + 1}: Variant SKU "${sku}" appears multiple times in this file (rows ${rowsList}).`,
              row: idx + 1,
              column: "Variant SKU",
              suggestion: `Shopify usually expects SKUs to be unique per variant. Double-check if these rows are true duplicates.`,
            });
          }
        }
      }

      // If option cols are not present, warn that variants may import but are harder to control
      if (!hasOptionCols) {
        issues.push({
          severity: "info",
          code: "variant_options_not_present",
          message: `Handle "${handle}" looks like variants but option columns (Option1/2/3 Name/Value) are not present.`,
          row: baseRowNumber,
          column: "Handle",
          suggestion: `If these are size/color variants, include Option1 Name/Value (and Option2/3 as needed) to ensure variants import correctly.`,
        });
      }
    }
  }

  // Ensure required headers are present for export even if missing
  const exportHeaders = [...fixedHeaders];
  for (const req of REQUIRED) {
    if (!exportHeaders.includes(req)) exportHeaders.push(req);
  }

  // Ensure rows contain any added headers
  for (const r of fixedRows) {
    for (const h of exportHeaders) r[h] = r[h] ?? "";
  }

  return {
    fixedHeaders: exportHeaders,
    fixedRows,
    issues,
    fixesApplied: dedupe(fixesApplied),
  };
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}
