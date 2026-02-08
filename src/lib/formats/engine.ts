import type { CsvFixResult, CsvRow, CsvIssue, CsvFormat } from "./types";

export function applyFormatToParsedCsv(headers: string[], rows: CsvRow[], format: CsvFormat): CsvFixResult {
  // Step 1: Base cleanup (very safe) before any format logic runs
  const pre = normalizeRowsBase(headers, rows);

  // Step 2: Let the selected format do its mapping/validation/reordering
  const mid = format.apply(pre.fixedHeaders ?? headers, pre.fixedRows ?? rows);

  // Step 3: Apply universal cleanup again on the final shape so new / reordered columns also benefit
  const post = normalizeRowsUniversal(mid.fixedHeaders ?? pre.fixedHeaders ?? headers, mid.fixedRows ?? pre.fixedRows ?? rows);

  // Merge results
  const mergedFixes = mergeFixes(pre.fixesApplied ?? [], mid.fixesApplied ?? [], post.fixesApplied ?? []);

  return {
    fixedHeaders: post.fixedHeaders ?? mid.fixedHeaders ?? pre.fixedHeaders ?? headers,
    fixedRows: post.fixedRows ?? mid.fixedRows ?? pre.fixedRows ?? rows,
    issues: [...(mid.issues ?? []), ...(post.issues ?? [])],
    fixesApplied: mergedFixes,
  };
}

function mergeFixes(...lists: string[][]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const x of list) {
      const key = x.trim();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(x);
    }
  }
  return out;
}

function stripInvisibles(s: string) {
  // NBSP -> space, remove zero-width chars that commonly break imports
  return s
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function collapseInnerWhitespace(s: string) {
  // Collapse runs of whitespace inside the string
  return s.replace(/\s+/g, " ");
}

function normalizeEmail(s: string) {
  // Remove spaces and lowercase
  return s.replace(/\s+/g, "").toLowerCase();
}

function normalizePhone(s: string) {
  // Keep leading + if present; strip common separators
  const trimmed = s.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  return hasPlus ? "+" + digits : digits;
}

function normalizeTags(s: string) {
  // Split by comma, trim parts, remove empties, join with comma+space
  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.join(", ");
}

function normalizeBoolean(s: string) {
  const v = s.trim().toLowerCase();
  if (v === "true" || v === "t" || v === "yes" || v === "y" || v === "1") return "TRUE";
  if (v === "false" || v === "f" || v === "no" || v === "n" || v === "0") return "FALSE";
  return s;
}

function normalizeNumeric(s: string) {
  // Remove currency symbols/commas/spaces but keep - and .
  const cleaned = s.trim().replace(/[,\\s\\$£€¥]/g, "");
  // If it's not a number-ish string, leave it alone
  if (!/^[-+]?\\d*(\\.\\d+)?$/.test(cleaned) || cleaned === "" || cleaned === "-" || cleaned === "+") return s.trim();
  return cleaned;
}

function keepAllowedChars(s: string, allowed: RegExp, toUpper = false, toLower = false) {
  let out = s;
  if (toUpper) out = out.toUpperCase();
  if (toLower) out = out.toLowerCase();
  out = out.replace(/\s+/g, "");
  out = out.replace(allowed, "");
  return out;
}

/**
 * Base cleanup:
 * - ensure strings
 * - strip invisible characters
 * - trim
 */
export function normalizeRowsBase(headers: string[], rows: CsvRow[]) {
  const fixesApplied: string[] = [];
  const fixedRows: CsvRow[] = rows.map((r) => {
    const out: CsvRow = {};
    for (const h of headers) {
      const v = r?.[h];
      out[h] = typeof v === "string" ? v : v == null ? "" : String(v);
    }
    return out;
  });

  let invisCount = 0;
  let trimmedCount = 0;

  for (const r of fixedRows) {
    for (const h of headers) {
      const before0 = r[h] ?? "";
      const before1 = stripInvisibles(before0);
      if (before1 !== before0) {
        r[h] = before1;
        invisCount++;
      }

      const before2 = r[h] ?? "";
      const after = before2.trim();
      if (after !== before2) {
        r[h] = after;
        trimmedCount++;
      }
    }
  }

  if (invisCount > 0) fixesApplied.push("Removed hidden characters in cells");
  if (trimmedCount > 0) fixesApplied.push("Trimmed whitespace in cells");

  const issues: CsvIssue[] = [];
  return { fixedHeaders: headers, fixedRows, issues, fixesApplied };
}

/**
 * Universal cleanup (Option A):
 * Applies a conservative, format-agnostic cleanup across common column types.
 * This intentionally avoids heavy transformations on free-text columns.
 */
export function normalizeRowsUniversal(headers: string[], rows: CsvRow[]) {
  // Start from base cleanup (safe)
  const base = normalizeRowsBase(headers, rows);

  const fixedRows = (base.fixedRows ?? rows).map((r) => ({ ...r }));

  let collapsedCount = 0;
  let emailCount = 0;
  let phoneCount = 0;
  let tagsCount = 0;
  let boolCount = 0;
  let numericCount = 0;
  let skuCount = 0;
  let handleCount = 0;

  const headerKinds = headers.map((h) => {
    const n = h.trim().toLowerCase();

    const isEmail = n.includes("email");
    const isPhone = n.includes("phone") || n.includes("mobile") || n.includes("tel");
    const isTags = n === "tags" || n.includes("tag");
    const isSku = n.includes("sku");
    const isHandle = n.includes("handle") || n.includes("slug");

    const isBool =
      n === "published" ||
      n.endsWith("_published") ||
      n.includes("is_published") ||
      n === "active" ||
      n.includes("is_active") ||
      n.includes("enabled") ||
      n.includes("is_enabled");

    const isNumeric =
      n.includes("price") ||
      n.includes("amount") ||
      n.includes("qty") ||
      n.includes("quantity") ||
      n.includes("inventory") ||
      n.includes("count") ||
      n.includes("weight");

    // Collapsing inner whitespace can be risky for large HTML/text fields.
    // Only do it for short-ish, non-text-like headers.
    const looksLikeFreeText =
      n.includes("body") || n.includes("description") || n.includes("html") || n.includes("notes") || n.includes("message");

    const allowCollapse = !looksLikeFreeText;

    return { h, isEmail, isPhone, isTags, isSku, isHandle, isBool, isNumeric, allowCollapse };
  });

  for (const r of fixedRows) {
    for (const kind of headerKinds) {
      const h = kind.h;
      const before = r[h] ?? "";
      let after = before;

      if (kind.allowCollapse) {
        const collapsed = collapseInnerWhitespace(after);
        if (collapsed !== after) {
          after = collapsed;
          collapsedCount++;
        }
      }

      if (kind.isEmail) {
        const e = normalizeEmail(after);
        if (e !== after) {
          after = e;
          emailCount++;
        }
      }

      if (kind.isPhone) {
        const p = normalizePhone(after);
        if (p !== after) {
          after = p;
          phoneCount++;
        }
      }

      if (kind.isTags) {
        const t = normalizeTags(after);
        if (t !== after) {
          after = t;
          tagsCount++;
        }
      }

      if (kind.isBool) {
        const b = normalizeBoolean(after);
        if (b !== after) {
          after = b;
          boolCount++;
        }
      }

      if (kind.isNumeric) {
        const n = normalizeNumeric(after);
        if (n !== after) {
          after = n;
          numericCount++;
        }
      }

      // Slug/SKU style cleanup: remove spaces + strip disallowed chars.
      // This is where "no spaces" / "no special characters" feel comes from,
      // but it only applies to headers that look like identifiers.
      if (kind.isSku) {
        // allow A-Z0-9-_ only
        const cleaned = keepAllowedChars(after, /[^A-Z0-9_-]/g, true, false);
        if (cleaned !== after) {
          after = cleaned;
          skuCount++;
        }
      }

      if (kind.isHandle) {
        // allow a-z0-9-_ only
        const cleaned = keepAllowedChars(after, /[^a-z0-9_-]/g, false, true);
        if (cleaned !== after) {
          after = cleaned;
          handleCount++;
        }
      }

      if (after !== before) r[h] = after;
    }
  }

  const fixesApplied: string[] = [...(base.fixesApplied ?? [])];

  if (collapsedCount > 0) fixesApplied.push("Normalized spacing in cells");
  if (emailCount > 0) fixesApplied.push("Normalized email formatting");
  if (phoneCount > 0) fixesApplied.push("Normalized phone formatting");
  if (tagsCount > 0) fixesApplied.push("Normalized tag spacing");
  if (boolCount > 0) fixesApplied.push("Normalized boolean values");
  if (numericCount > 0) fixesApplied.push("Normalized numeric values");
  if (skuCount > 0) fixesApplied.push("Cleaned SKU values");
  if (handleCount > 0) fixesApplied.push("Cleaned handle/slug values");

  const issues: CsvIssue[] = [];
  return { fixedHeaders: headers, fixedRows, issues, fixesApplied };
}

// Backwards compatible name used by older formats
export function normalizeRowsSafe(headers: string[], rows: CsvRow[]) {
  return normalizeRowsBase(headers, rows);
}
