import { CsvRow } from "./csv";

export type IssueSeverity = "error" | "warning" | "info";

export type Issue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  row?: number; // 1-based
  column?: string;
  suggestion?: string;
};

export type FixResult = {
  fixedHeaders: string[];
  fixedRows: CsvRow[];
  issues: Issue[];
  fixesApplied: string[];
};

/**
 * Shopify has (at least) two widely-used product CSV schemas:
 *
 * Legacy schema:
 *  - Handle, Body (HTML), Published, Variant SKU, Variant Price, Image Src, ...
 *
 * New Admin template schema (Shopify's current product_template.csv):
 *  - URL handle, Description, Published on online store, Status, SKU, Price,
 *    Product image URL, Image position, SEO title/description, ...
 *
 * StriveFormats must accept BOTH without forcing the user's file to match our engine.
 * We detect the schema from headers and validate/fix using canonical field keys.
 */
export type ShopifySchema = "legacy" | "new";

type CanonKey =
  | "title"
  | "handle"
  | "description"
  | "vendor"
  | "type"
  | "tags"
  | "published"
  | "status"
  | "sku"
  | "price"
  | "compareAtPrice"
  | "inventoryQty"
  | "inventoryPolicy"
  | "continueSelling"
  | "imageSrc"
  | "imagePosition"
  | "seoTitle"
  | "seoDescription"
  | "opt1Name"
  | "opt1Value"
  | "opt2Name"
  | "opt2Value"
  | "opt3Name"
  | "opt3Value";

type SchemaDef = {
  schema: ShopifySchema;
  // canonical key -> possible header labels
  aliases: Record<CanonKey, string[]>;
  required: CanonKey[];
  recommended: CanonKey[];
};

function normHeader(h: string) {
  return h.trim().replace(/\s+/g, " ");
}

function normKey(h: string) {
  return normHeader(h).toLowerCase();
}

function detectShopifySchema(headers: string[]): ShopifySchema {
  const set = new Set(headers.map(normKey));
  // New template signatures
  if (set.has("url handle") || set.has("product image url") || set.has("published on online store")) return "new";
  // Legacy signatures
  if (set.has("handle") || set.has("body (html)") || set.has("image src") || set.has("variant price")) return "legacy";
  // Default to new (Shopify is migrating toward it)
  return "new";
}

const LEGACY: SchemaDef = {
  schema: "legacy",
  aliases: {
    title: ["Title"],
    handle: ["Handle"],
    description: ["Body (HTML)", "Body HTML", "Body"],
    vendor: ["Vendor"],
    type: ["Type"],
    tags: ["Tags"],
    published: ["Published"],
    status: ["Status"],
    sku: ["Variant SKU", "SKU"],
    price: ["Variant Price", "Price"],
    compareAtPrice: ["Variant Compare At Price", "Compare-at price", "Compare at price"],
    inventoryQty: ["Variant Inventory Qty", "Inventory quantity", "Inventory Qty"],
    inventoryPolicy: ["Variant Inventory Policy"],
    continueSelling: ["Continue selling when out of stock"],
    imageSrc: ["Image Src", "Product image URL", "Product image Url", "Image URL"],
    imagePosition: ["Image Position", "Image position"],
    seoTitle: ["SEO Title", "SEO title"],
    seoDescription: ["SEO Description", "SEO description"],
    opt1Name: ["Option1 Name", "Option1 name"],
    opt1Value: ["Option1 Value", "Option1 value"],
    opt2Name: ["Option2 Name", "Option2 name"],
    opt2Value: ["Option2 Value", "Option2 value"],
    opt3Name: ["Option3 Name", "Option3 name"],
    opt3Value: ["Option3 Value", "Option3 value"],
  },
  required: ["handle", "title"],
  recommended: ["description", "vendor", "type", "tags", "published", "status", "sku", "price"],
};

const NEW: SchemaDef = {
  schema: "new",
  aliases: {
    title: ["Title"],
    handle: ["URL handle", "Handle"],
    description: ["Description", "Body (HTML)", "Body HTML"],
    vendor: ["Vendor"],
    type: ["Type"],
    tags: ["Tags"],
    published: ["Published on online store", "Published"],
    status: ["Status"],
    sku: ["SKU", "Variant SKU"],
    price: ["Price", "Variant Price"],
    compareAtPrice: ["Compare-at price", "Variant Compare At Price"],
    inventoryQty: ["Inventory quantity", "Variant Inventory Qty"],
    inventoryPolicy: ["Variant Inventory Policy"],
    continueSelling: ["Continue selling when out of stock"],
    imageSrc: ["Product image URL", "Image Src"],
    imagePosition: ["Image position", "Image Position"],
    seoTitle: ["SEO title", "SEO Title"],
    seoDescription: ["SEO description", "SEO Description"],
    opt1Name: ["Option1 name", "Option1 Name"],
    opt1Value: ["Option1 value", "Option1 Value"],
    opt2Name: ["Option2 name", "Option2 Name"],
    opt2Value: ["Option2 value", "Option2 Value"],
    opt3Name: ["Option3 name", "Option3 Name"],
    opt3Value: ["Option3 value", "Option3 Value"],
  },
  required: ["title", "handle"],
  recommended: [
    "description",
    "vendor",
    "type",
    "tags",
    "status",
    "published",
    "sku",
    "price",
    "inventoryQty",
    "continueSelling",
    "imageSrc",
  ],
};

function defFor(headers: string[]): SchemaDef {
  const schema = detectShopifySchema(headers);
  return schema === "legacy" ? LEGACY : NEW;
}

function buildHeaderLookup(headers: string[]) {
  const byNorm = new Map<string, string>();
  for (const h of headers) byNorm.set(normKey(h), h);
  return byNorm;
}

function resolveCol(headers: string[], possible: string[]): string | null {
  const lookup = buildHeaderLookup(headers);
  for (const p of possible) {
    const hit = lookup.get(normKey(p));
    if (hit) return hit;
  }
  return null;
}

function getStr(r: CsvRow, col: string | null) {
  if (!col) return "";
  const v = r[col];
  return (typeof v === "string" ? v : String(v ?? "")).trim();
}

function setStr(r: CsvRow, col: string | null, val: string) {
  if (!col) return;
  r[col] = val;
}

function isTruthyBool(s: string) {
  const v = s.trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

function isFalsyBool(s: string) {
  const v = s.trim().toLowerCase();
  return v === "false" || v === "no" || v === "0";
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

export function validateAndFixShopifyBasic(headers: string[], rows: CsvRow[]): FixResult {
  const issues: Issue[] = [];
  const fixesApplied: string[] = [];

  // Normalize spacing only (do not rename columns)
  const fixedHeaders = headers.map(normHeader);

  const schemaDef = defFor(fixedHeaders);
  const schema = schemaDef.schema;

  const col: Record<CanonKey, string | null> = {} as any;
  for (const k of Object.keys(schemaDef.aliases) as CanonKey[]) {
    col[k] = resolveCol(fixedHeaders, schemaDef.aliases[k]);
  }

  // File-level required/recommended checks
  for (const req of schemaDef.required) {
    if (!col[req]) {
      issues.push({
        severity: "error",
        code: "missing_required_header",
        message: `Missing required Shopify column: "${schemaDef.aliases[req][0]}".`,
        column: schemaDef.aliases[req][0],
        suggestion: `Add the "${schemaDef.aliases[req][0]}" column (even if blank) to meet Shopify import expectations.`,
      });
    }
  }
  for (const rec of schemaDef.recommended) {
    if (!col[rec]) {
      issues.push({
        severity: "info",
        code: "missing_recommended_header",
        message: `Recommended column not found: "${schemaDef.aliases[rec][0]}".`,
        column: schemaDef.aliases[rec][0],
        suggestion: "Not always required, but commonly used in Shopify imports.",
      });
    }
  }

  // Ensure all rows have keys for each header
  const fixedRows: CsvRow[] = rows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    // preserve any extra columns
    for (const [k, v] of Object.entries(r ?? {})) out[k] = typeof v === "string" ? v : String(v ?? "");
    return out;
  });

  // Per-row validation + safe fixes
  for (let idx = 0; idx < fixedRows.length; idx++) {
    const r = fixedRows[idx];
    const rowNumber = idx + 1;

    // Handle: required, normalize to Shopify-friendly slug
    if (col.handle) {
      const handle = getStr(r, col.handle);
      if (!handle) {
        issues.push({
          severity: "error",
          code: "missing_handle",
          message: `Row ${rowNumber}: "${col.handle}" is blank.`,
          row: rowNumber,
          column: col.handle,
          suggestion:
            "Handle must be a unique identifier (e.g., 'my-product-name'). For variants, all rows share the same handle.",
        });
      } else {
        const normalized = handle
          .toLowerCase()
          .replace(/[^a-z0-9\- ]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/\-+/g, "-");
        if (normalized && normalized !== handle) {
          setStr(r, col.handle, normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Handle to "${normalized}".`);
        }
      }
    }

    // Published on online store (TRUE/FALSE)
    if (col.published) {
      const raw = getStr(r, col.published);
      if (!raw) {
        issues.push({
          severity: "warning",
          code: "published_blank",
          message: `Row ${rowNumber}: "${col.published}" is blank.`,
          row: rowNumber,
          column: col.published,
          suggestion: `Use "TRUE" or "FALSE".`,
        });
      } else {
        const normalized = isTruthyBool(raw) ? "TRUE" : isFalsyBool(raw) ? "FALSE" : "";
        if (!normalized) {
          issues.push({
            severity: "error",
            code: "published_invalid",
            message: `Row ${rowNumber}: "${col.published}" should be TRUE/FALSE but is "${raw}".`,
            row: rowNumber,
            column: col.published,
            suggestion: `Change it to "TRUE" or "FALSE".`,
          });
        } else if (raw !== normalized) {
          setStr(r, col.published, normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Published to "${normalized}".`);
        }
      }
    }

    // Continue selling when out of stock (TRUE/FALSE)
    if (col.continueSelling) {
      const raw = getStr(r, col.continueSelling);
      if (raw) {
        const normalized = isTruthyBool(raw) ? "TRUE" : isFalsyBool(raw) ? "FALSE" : "";
        if (!normalized) {
          issues.push({
            severity: "error",
            code: "continue_selling_invalid",
            message: `Row ${rowNumber}: "${col.continueSelling}" must be TRUE or FALSE (got "${raw}").`,
            row: rowNumber,
            column: col.continueSelling,
            suggestion: `Set it to TRUE or FALSE.`,
          });
        } else if (raw !== normalized) {
          setStr(r, col.continueSelling, normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Continue selling when out of stock to "${normalized}".`);
        }
      }
    }

    // Price normalization/validation
    if (col.price) {
      const raw = getStr(r, col.price);
      if (raw) {
        const cleaned = raw.replace(/[$,]/g, "").trim();
        if (/^\d+(\.\d{1,2})?$/.test(cleaned)) {
          if (cleaned !== raw) {
            setStr(r, col.price, cleaned);
            fixesApplied.push(`Row ${rowNumber}: Normalized Price to "${cleaned}".`);
          }
        } else {
          issues.push({
            severity: "error",
            code: "price_invalid",
            message: `Row ${rowNumber}: "${col.price}" looks invalid ("${raw}").`,
            row: rowNumber,
            column: col.price,
            suggestion: `Use a number like 19.99 (no currency symbols).`,
          });
        }
      }
    }

    // Compare-at price validation
    if (col.compareAtPrice) {
      const raw = getStr(r, col.compareAtPrice);
      if (raw) {
        const cleaned = raw.replace(/[$,]/g, "").trim();
        if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
          issues.push({
            severity: "error",
            code: "compare_at_invalid",
            message: `Row ${rowNumber}: "${col.compareAtPrice}" looks invalid ("${raw}").`,
            row: rowNumber,
            column: col.compareAtPrice,
            suggestion: `Use a number like 29.99 (no currency symbols).`,
          });
        } else if (cleaned !== raw) {
          setStr(r, col.compareAtPrice, cleaned);
          fixesApplied.push(`Row ${rowNumber}: Normalized Compare-at price to "${cleaned}".`);
        }
      }
    }

    // Inventory quantity normalization/validation
    if (col.inventoryQty) {
      const raw = getStr(r, col.inventoryQty);
      if (raw) {
        const cleaned = raw.replace(/,/g, "").trim();
        if (/^-?\d+$/.test(cleaned)) {
          if (cleaned !== raw) {
            setStr(r, col.inventoryQty, cleaned);
            fixesApplied.push(`Row ${rowNumber}: Normalized Inventory quantity to "${cleaned}".`);
          }
          const n = Number(cleaned);
          if (Number.isFinite(n) && n < 0) {
            issues.push({
              severity: "warning",
              code: "inventory_qty_negative",
              message: `Row ${rowNumber}: "${col.inventoryQty}" is negative (${n}).`,
              row: rowNumber,
              column: col.inventoryQty,
              suggestion: `Double-check if you really want negative inventory. Usually this should be 0 or higher.`,
            });
          }
        } else {
          issues.push({
            severity: "error",
            code: "inventory_qty_invalid",
            message: `Row ${rowNumber}: "${col.inventoryQty}" looks invalid ("${raw}").`,
            row: rowNumber,
            column: col.inventoryQty,
            suggestion: `Use a whole number like 0, 5, 10 (no words).`,
          });
        }
      }
    }

    // Legacy inventory policy validation (deny/continue)
    if (col.inventoryPolicy) {
      const raw = getStr(r, col.inventoryPolicy);
      if (raw) {
        const lower = raw.toLowerCase();
        if (lower !== "deny" && lower !== "continue") {
          issues.push({
            severity: "error",
            code: "inventory_policy_invalid",
            message: `Row ${rowNumber}: "${col.inventoryPolicy}" must be "deny" or "continue" (got "${raw}").`,
            row: rowNumber,
            column: col.inventoryPolicy,
            suggestion: `Use "deny" (stop selling when out of stock) or "continue" (allow overselling).`,
          });
        } else if (raw !== lower) {
          setStr(r, col.inventoryPolicy, lower);
          fixesApplied.push(`Row ${rowNumber}: Normalized Inventory Policy to "${lower}".`);
        }
      }
    }

    // Tags normalization
    if (col.tags) {
      const raw = getStr(r, col.tags);
      if (raw) {
        const normalized = raw
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .join(", ");
        if (normalized !== raw) {
          setStr(r, col.tags, normalized);
          fixesApplied.push(`Row ${rowNumber}: Normalized Tags spacing.`);
        }
      }
    }

    // Helpful info for blanks
    for (const key of ["title", "vendor", "type"] as const) {
      const hdr = col[key];
      if (!hdr) continue;
      const v = getStr(r, hdr);
      if (!v) {
        issues.push({
          severity: "info",
          code: `${key}_blank`,
          message: `Row ${rowNumber}: "${hdr}" is blank.`,
          row: rowNumber,
          column: hdr,
          suggestion: `Not always required, but Shopify listings usually need a ${key}.`,
        });
      }
    }
  }

  // Variant intelligence (group by handle)
  if (col.handle) {
    const byHandle = new Map<string, number[]>();
    for (let idx = 0; idx < fixedRows.length; idx++) {
      const handle = getStr(fixedRows[idx], col.handle);
      if (!handle) continue;
      const list = byHandle.get(handle) ?? [];
      list.push(idx);
      byHandle.set(handle, list);
    }

    const optionNameHeaders = [col.opt1Name, col.opt2Name, col.opt3Name].filter(Boolean) as string[];
    const optionValueHeaders = [col.opt1Value, col.opt2Value, col.opt3Value].filter(Boolean) as string[];
    const hasOptionCols = optionNameHeaders.length > 0 && optionValueHeaders.length > 0;
    const hasSku = Boolean(col.sku);

    for (const [handle, idxs] of byHandle.entries()) {
      if (idxs.length <= 1) continue;

      const skuSet = new Set<string>();
      const optValueSet = new Set<string>();
      for (const i of idxs) {
        const r = fixedRows[i];
        if (hasSku && col.sku) {
          const sku = getStr(r, col.sku);
          if (sku) skuSet.add(sku);
        }
        if (hasOptionCols) {
          const vals = optionValueHeaders.map((c) => getStr(r, c)).filter(Boolean).join("|");
          if (vals) optValueSet.add(vals);
        }
      }

      const looksLikeVariants =
        (hasOptionCols && optValueSet.size >= 1) ||
        (hasSku && skuSet.size >= 1) ||
        (hasOptionCols && optValueSet.size > 1) ||
        (hasSku && skuSet.size > 1);

      const baseIdx = idxs[0];
      const baseRowNumber = baseIdx + 1;
      const base = fixedRows[baseIdx];

      const CONSISTENT_FIELDS: Array<{ key: CanonKey; label: string }> = [
        { key: "title", label: "Title" },
        { key: "description", label: schema === "new" ? "Description" : "Body (HTML)" },
        { key: "vendor", label: "Vendor" },
        { key: "type", label: "Type" },
      ];

      if (!looksLikeVariants) {
        const rowsList = idxs.map((i) => i + 1).join(", ");
        for (const idx of idxs) {
          issues.push({
            severity: "error",
            code: "duplicate_handle_not_variants",
            message: `Row ${idx + 1}: Handle "${handle}" appears multiple times (rows ${rowsList}) but does not look like a variant set.`,
            row: idx + 1,
            column: col.handle,
            suggestion:
              "If these are variants, add option values (Option1/2/3) or distinct SKUs. Otherwise, handles should be unique per product.",
          });
        }
        continue;
      }

      issues.push({
        severity: "info",
        code: "variant_group_detected",
        message: `Handle "${handle}" appears on ${idxs.length} rows (likely variants).`,
        row: baseRowNumber,
        column: col.handle,
        suggestion: "Shopify variants share a handle. Ensure option columns and SKUs are consistent and unique.",
      });

      // Warn if first row missing key product fields
      for (const f of CONSISTENT_FIELDS) {
        const hdr = col[f.key];
        if (!hdr) continue;
        const v = getStr(base, hdr);
        if (!v) {
          issues.push({
            severity: "warning",
            code: "variant_group_base_missing",
            message: `Row ${baseRowNumber}: "${hdr}" is blank for the first row of a variant group ("${handle}").`,
            row: baseRowNumber,
            column: hdr,
            suggestion: `Usually the first row for a product should include ${f.label}.`,
          });
        }
      }

      // Consistency checks
      for (const idx of idxs) {
        if (idx === baseIdx) continue;
        const rowNum = idx + 1;
        const r = fixedRows[idx];

        for (const f of CONSISTENT_FIELDS) {
          const hdr = col[f.key];
          if (!hdr) continue;
          const baseVal = getStr(base, hdr);
          const thisVal = getStr(r, hdr);
          if (thisVal && baseVal && thisVal !== baseVal) {
            issues.push({
              severity: "warning",
              code: "variant_group_inconsistent_field",
              message: `Row ${rowNum}: "${hdr}" differs from row ${baseRowNumber} for handle "${handle}".`,
              row: rowNum,
              column: hdr,
              suggestion: `For variants, "${f.label}" is usually consistent across all rows with the same handle. Consider moving the shared value to the first row and leaving this blank.`,
            });
          }
        }

        // Option validation
        if (hasOptionCols) {
          for (let oi = 0; oi < 3; oi++) {
            const nameCol = optionNameHeaders[oi];
            const valCol = optionValueHeaders[oi];
            if (!nameCol || !valCol) continue;
            const name = getStr(r, nameCol);
            const val = getStr(r, valCol);
            const baseName = getStr(base, nameCol);
            const groupName = baseName || name;
            if (groupName && !val) {
              issues.push({
                severity: "warning",
                code: "variant_option_missing_value",
                message: `Row ${rowNum}: "${valCol}" is blank but "${nameCol}" is set for handle "${handle}".`,
                row: rowNum,
                column: valCol,
                suggestion: "Variants usually require option values (e.g., Size = Small).",
              });
            }
          }

          // Enforce Option3 requires Option2; Option2 requires Option1
          const opt1v = optionValueHeaders[0] ? getStr(r, optionValueHeaders[0]) : "";
          const opt2v = optionValueHeaders[1] ? getStr(r, optionValueHeaders[1]) : "";
          const opt3v = optionValueHeaders[2] ? getStr(r, optionValueHeaders[2]) : "";
          if (opt3v && !opt2v) {
            issues.push({
              severity: "error",
              code: "option3_requires_option2",
              message: `Row ${rowNum}: Option3 cannot be used unless Option2 is present.`,
              row: rowNum,
              column: optionValueHeaders[2] ?? optionNameHeaders[2],
              suggestion: "Fill Option2 Name/Value before using Option3.",
            });
          }
          if (opt2v && !opt1v) {
            issues.push({
              severity: "error",
              code: "option2_requires_option1",
              message: `Row ${rowNum}: Option2 cannot be used unless Option1 is present.`,
              row: rowNum,
              column: optionValueHeaders[1] ?? optionNameHeaders[1],
              suggestion: "Fill Option1 Name/Value before using Option2.",
            });
          }
        }
      }

      // SKU uniqueness within this file
      if (hasSku && col.sku) {
        const skuToRows = new Map<string, number[]>();
        for (const idx of idxs) {
          const sku = getStr(fixedRows[idx], col.sku);
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
              message: `Row ${idx + 1}: SKU "${sku}" appears multiple times in this file (rows ${rowsList}).`,
              row: idx + 1,
              column: col.sku,
              suggestion: "Shopify usually expects SKUs to be unique per variant.",
            });
          }
        }
      }
    }
  }

  // Ensure required headers exist for export (keep schema)
  const exportHeaders = [...fixedHeaders];
  for (const req of schemaDef.required) {
    const preferred = schemaDef.aliases[req][0];
    if (!resolveCol(exportHeaders, [preferred])) exportHeaders.push(preferred);
  }
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
