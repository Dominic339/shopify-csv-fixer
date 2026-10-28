// src/lib/etsyOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

// Note: Etsy does not provide a universal "import new listings" CSV spec for all sellers.
// This preset targets common listing CSV fields used in export/bulk-edit workflows.
export const ETSY_EXPECTED_HEADERS = [
  "Listing ID",
  "Title",
  "Description",
  "Price",
  "Currency",
  "Quantity",
  "SKU",
  "Tags",
  "Materials",
  "Image URLs",
  "renewal_option",
  "type",
];

export const ETSY_EXAMPLE_ROW: CsvRow = {
  "Listing ID": "",
  Title: "Handmade Leather Wallet",
  Description: "Full description of the item, materials, sizing, and shipping details.",
  Price: "45.00",
  Currency: "USD",
  Quantity: "10",
  SKU: "ETSY-WALLET-LEATHER-01",
  Tags: "wallet,leather,handmade,gift",
  Materials: "leather,thread",
  "Image URLs": "https://example.com/images/wallet-1.jpg,https://example.com/images/wallet-2.jpg",
  renewal_option: "automatic",
  type: "physical",
};

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

function normalizeList(value: string) {
  const parts = String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(",");
}

function parsePositiveIntSafe(v: string) {
  const raw = String(v ?? "").trim();
  if (!raw) return { ok: true, value: "" };
  const n = parseShopifyMoney(raw);
  if (n == null || !Number.isInteger(n) || n < 0) return { ok: false, value: v };
  return { ok: true, value: String(n) };
}

export function validateAndFixEtsyListings(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];

  // Canonicalize header names (best-effort).
  const lowerToCanon = new Map(ETSY_EXPECTED_HEADERS.map((h) => [h.toLowerCase(), h] as const));
  const synonyms: Record<string, string> = {
    id: "Listing ID",
    listingid: "Listing ID",
    listing_id: "Listing ID",
    currency_code: "Currency",
    image: "Image URLs",
    images: "Image URLs",
    image_urls: "Image URLs",
    "image urls": "Image URLs",
  };

  const canonHeaders = headers.map((h) => {
    const key = h.trim().toLowerCase();
    return lowerToCanon.get(key) ?? synonyms[key] ?? h.trim();
  });

  for (const h of ["Title", "Price", "Quantity"]) {
    if (!canonHeaders.includes(h)) {
      issues.push({
        rowIndex: -1,
        column: h,
        severity: "error",
        code: "etsy/missing_required_header",
        message: `Missing required column: ${h}`,
        suggestion: `Add the '${h}' column.`,
      });
    }
  }

  const canonRows: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[canonHeaders[i]] = r?.[headers[i]] ?? "";
    }
    return out;
  });

  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    const title = (out["Title"] ?? "").trim();
    if (!title) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "error",
        code: "etsy/missing_title",
        message: "Missing Title.",
        suggestion: "Provide a descriptive listing title.",
      });
    } else if (title.length > 140) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "warning",
        code: "etsy/title_too_long",
        message: `Title is ${title.length} characters. Etsy titles are typically limited to 140 characters.`,
        suggestion: "Shorten the title to 140 characters or fewer.",
      });
    }

    // Price
    const priceRaw = out["Price"] ?? "";
    const p = parseShopifyMoney(priceRaw);
    if (p == null) {
      if (!isEmpty(priceRaw)) {
        issues.push({
          rowIndex,
          column: "Price",
          severity: "error",
          code: "etsy/invalid_price",
          message: `Price should be a decimal number. Found '${priceRaw}'.`,
          suggestion: "Use a plain decimal like 19.99.",
        });
      } else {
        issues.push({
          rowIndex,
          column: "Price",
          severity: "error",
          code: "etsy/missing_price",
          message: "Missing Price.",
          suggestion: "Provide a listing price.",
        });
      }
    } else {
      const formatted = formatShopifyMoney(p);
      if (formatted !== priceRaw.trim()) {
        out["Price"] = formatted;
        fixesApplied.push(`Normalized Price to '${formatted}' on row ${rowIndex + 1}`);
      }
    }

    // Quantity (non-negative integer)
    const qRaw = out["Quantity"] ?? "";
    const qi = parsePositiveIntSafe(qRaw);
    if (!qi.ok) {
      issues.push({
        rowIndex,
        column: "Quantity",
        severity: "error",
        code: "etsy/invalid_quantity",
        message: `Quantity should be a non-negative whole number. Found '${qRaw}'.`,
        suggestion: "Use an integer like 0, 1, 10.",
      });
    } else if (qi.value !== qRaw.trim()) {
      out["Quantity"] = qi.value;
      if (!isEmpty(qRaw)) fixesApplied.push(`Normalized Quantity to '${qi.value}' on row ${rowIndex + 1}`);
    }
    if (qi.ok && Number(qi.value) > 999) {
      issues.push({
        rowIndex,
        column: "Quantity",
        severity: "error",
        code: "etsy/quantity_too_high",
        message: `Quantity ${qi.value} is above Etsy's maximum of 999 per listing.`,
        suggestion: "Set Quantity to 999 or less.",
      });
    }

    // Currency (3-letter)
    if ("Currency" in out) {
      const c = (out["Currency"] ?? "").trim().toUpperCase();
      if (c && !/^[A-Z]{3}$/.test(c)) {
        issues.push({
          rowIndex,
          column: "Currency",
          severity: "warning",
          code: "etsy/invalid_currency",
          message: `Currency should be a 3-letter code (e.g., USD). Found '${out["Currency"]}'.`,
          suggestion: "Use a 3-letter ISO currency code.",
        });
      } else if (c && c !== out["Currency"]) {
        out["Currency"] = c;
        fixesApplied.push(`Normalized Currency to '${c}' on row ${rowIndex + 1}`);
      }
    }

    // Tags: Etsy commonly allows up to 13 tags; each tag has a character limit.
    if ("Tags" in out) {
      const before = out["Tags"];
      const after = normalizeList(before);
      if (after !== String(before ?? "").trim()) {
        out["Tags"] = after;
        if (!isEmpty(before)) fixesApplied.push(`Normalized Tags formatting on row ${rowIndex + 1}`);
      }
      const tags = after
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 13) {
        issues.push({
          rowIndex,
          column: "Tags",
          severity: "warning",
          code: "etsy/too_many_tags",
          message: `Found ${tags.length} tags. Etsy typically allows up to 13 tags per listing.`,
          suggestion: "Reduce to 13 tags or fewer.",
          details: { tagCount: tags.length },
        });
      }
      const tooLong = tags.filter((t) => t.length > 20);
      if (tooLong.length) {
        issues.push({
          rowIndex,
          column: "Tags",
          severity: "warning",
          code: "etsy/tag_too_long",
          message: `One or more tags exceed 20 characters: ${tooLong.slice(0, 3).join(", ")}${tooLong.length > 3 ? "…" : ""}`,
          suggestion: "Shorten long tags to 20 characters or fewer.",
          details: { tags: tooLong },
        });
      }
    }

    // Materials (Etsy allows 13)
    if ("Materials" in out) {
      const before = out["Materials"];
      const after = normalizeList(before);
      const count = after ? after.split(",").length : 0;
      if (count > 13) {
        issues.push({
          rowIndex,
          column: "Materials",
          severity: "warning",
          code: "etsy/too_many_materials",
          message: `Found ${count} materials. Etsy allows up to 13 per listing.`,
          suggestion: "Keep the 13 most important materials.",
        });
      }
      if (after !== String(before ?? "").trim()) {
        out["Materials"] = after;
        if (!isEmpty(before)) fixesApplied.push(`Normalized Materials formatting on row ${rowIndex + 1}`);
      }
    }

    // Etsy's export has one column per photo (IMAGE1 … IMAGE10)
    for (const key of Object.keys(out)) {
      if (!/^image\s*\d+$/i.test(key)) continue;
      const url = String(out[key] ?? "").trim();
      if (url && !isHttpUrl(url)) {
        issues.push({
          rowIndex,
          column: key,
          severity: "warning",
          code: "etsy/invalid_image_url",
          message: `${key} is not a valid URL: '${url}'.`,
          suggestion: "Use a full https:// image URL.",
        });
      }
    }

    // Image URLs
    if ("Image URLs" in out) {
      const before = out["Image URLs"];
      const urls = String(before ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) {
        issues.push({
          rowIndex,
          column: "Image URLs",
          severity: "warning",
          code: "etsy/invalid_image_url",
          message: `One or more image URLs are invalid: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`,
          suggestion: "Use full http(s) URLs separated by commas.",
          details: { badUrls: bad },
        });
      }
      const cleaned = urls.join(",");
      if (cleaned !== String(before ?? "").trim()) {
        out["Image URLs"] = cleaned;
        if (!isEmpty(before)) fixesApplied.push(`Cleaned Image URLs list on row ${rowIndex + 1}`);
      }
    }

    return out;
  });

  // Cross-row: duplicate Listing ID detection
  const listingIdRows = new Map<string, number[]>();
  for (let i = 0; i < outRows.length; i++) {
    const lid = (outRows[i]["Listing ID"] ?? "").trim();
    if (lid) {
      const arr = listingIdRows.get(lid) ?? [];
      arr.push(i);
      listingIdRows.set(lid, arr);
    }
  }
  for (const [lid, idxs] of listingIdRows.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "Listing ID",
        severity: "warning",
        code: "etsy/duplicate_listing_id",
        message: `Duplicate Listing ID '${lid}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "Use a unique Listing ID per row, or remove the ID to create new listings.",
        details: { listingId: lid, rows: rows1b },
      });
    }
  }

  // Cross-row: duplicate SKU detection
  const skuRows = new Map<string, number[]>();
  for (let i = 0; i < outRows.length; i++) {
    const sku = (outRows[i]["SKU"] ?? "").trim();
    if (sku) {
      const arr = skuRows.get(sku) ?? [];
      arr.push(i);
      skuRows.set(sku, arr);
    }
  }
  for (const [sku, idxs] of skuRows.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "SKU",
        severity: "warning",
        code: "etsy/duplicate_sku",
        message: `Duplicate SKU '${sku}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "Make SKUs unique where possible to avoid inventory confusion.",
        details: { sku, rows: rows1b },
      });
    }
  }

  // Output keeps the file's own column names and order (Etsy exports use TITLE, PRICE,
  // CURRENCY_CODE, IMAGE1 …); tools that read them back expect the same names.
  const fixedHeaders = [...headers];
  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    headers.forEach((h, i) => (out[h] = r?.[canonHeaders[i]] ?? ""));
    return out;
  });
  const originalOf = new Map(canonHeaders.map((c, i) => [c, headers[i]] as const));
  for (const it of issues) it.column = originalOf.get(it.column) ?? it.column;

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
