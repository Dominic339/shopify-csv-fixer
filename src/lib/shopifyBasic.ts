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

  // 3) Row-level validations + safe fixes
  for (let idx = 0; idx < fixedRows.length; idx++) {
    const rowNumber = idx + 1;
    const r = fixedRows[idx];

    // Handle required (Shopify uses it as unique key)
    if (fixedHeaders.includes("Handle")) {
      const handle = (r["Handle"] ?? "").trim();
      if (!handle) {
        issues.push({
          severity: "error",
          code: "missing_handle",
          message: `Row ${rowNumber}: "Handle" is blank.`,
          row: rowNumber,
          column: "Handle",
          suggestion: "Handle must be a unique identifier (e.g., 'my-product-name').",
        });
      } else {
        const normalized = handle
          .toLowerCase()
          .replace(/[^a-z0-9\- ]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/\-+/g, "-");

        if (normalized !== handle && normalized.length > 0) {
          r["Handle"] = normalized;
          fixesApplied.push(`Row ${rowNumber}: Normalized Handle to "${normalized}".`);
        }
      }
    }

    // Published should be TRUE/FALSE (common import issue: true/false/yes/no/1/0)
    if (fixedHeaders.includes("Published")) {
      const val = (r["Published"] ?? "").trim().toLowerCase();
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
            message: `Row ${rowNumber}: "Published" should be TRUE/FALSE but is "${r["Published"]}".`,
            row: rowNumber,
            column: "Published",
            suggestion: `Change it to "TRUE" or "FALSE".`,
          });
        } else if (r["Published"] !== normalized) {
          r["Published"] = normalized;
          fixesApplied.push(`Row ${rowNumber}: Normalized Published to "${normalized}".`);
        }
      }
    }

    // Variant Price: safe normalization (remove $ and commas) + validate
    if (fixedHeaders.includes("Variant Price")) {
      const raw = (r["Variant Price"] ?? "").trim();
      if (raw) {
        const cleaned = raw.replace(/[$,]/g, "").trim(); // remove $ and commas
        if (/^\d+(\.\d{1,2})?$/.test(cleaned)) {
          if (cleaned !== raw) {
            r["Variant Price"] = cleaned;
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
      const raw = (r["Variant Inventory Qty"] ?? "").trim();
      if (raw) {
        const cleaned = raw.replace(/,/g, "").trim();
        if (/^-?\d+$/.test(cleaned)) {
          if (cleaned !== raw) {
            r["Variant Inventory Qty"] = cleaned;
            fixesApplied.push(`Row ${rowNumber}: Normalized Variant Inventory Qty to "${cleaned}".`);
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
  }

 // 4) Duplicate handle check (allow the first one, flag the rest)
const firstSeen = new Map<string, number>(); // handle -> first rowIndex (0-based)

for (let idx = 0; idx < fixedRows.length; idx++) {
  const handle = (fixedRows[idx]["Handle"] ?? "").trim();
  if (!handle) continue;

  if (!firstSeen.has(handle)) {
    firstSeen.set(handle, idx);
  } else {
    const firstIdx = firstSeen.get(handle)!;
    issues.push({
      severity: "error",
      code: "duplicate_handle",
      message: `Row ${idx + 1}: "Handle" duplicates row ${firstIdx + 1} ("${handle}").`,
      row: idx + 1,
      column: "Handle",
      suggestion: `Handle must be unique. Keep "${handle}" on one row and change the others (example: "${handle}-2").`,
    });
  }
}



  // 3b) Duplicate handle check (Shopify requires unique handle per product)
  if (fixedHeaders.includes("Handle")) {
    const seenHandles = new Map<string, number>(); // handle -> first row number
    for (let idx = 0; idx < fixedRows.length; idx++) {
      const rowNumber = idx + 1;
      const h = (fixedRows[idx]["Handle"] ?? "").trim();
      if (!h) continue;

      const first = seenHandles.get(h);
      if (first) {
        issues.push({
          severity: "error",
          code: "duplicate_handle",
          message: `Row ${rowNumber}: Duplicate "Handle" ("${h}") also appears on row ${first}.`,
          row: rowNumber,
          column: "Handle",
          suggestion: `Handles must be unique. Change one of the duplicates (rows ${first} and ${rowNumber}).`,
        });
      } else {
        seenHandles.set(h, rowNumber);
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
