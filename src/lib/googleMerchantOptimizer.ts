// src/lib/googleMerchantOptimizer.ts
// Google Merchant Center product data (a tab-delimited .txt file, one product per line).
//
// Rules follow Google's product data specification (support.google.com/merchants/answer/7052112)
// and its tab-delimited file rules (answer/160569): attribute names in the header row,
// no tabs or line breaks inside values, prices as "15.00 USD".
// A file keeps its own column names and order on export.

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";
import { checkBarcode } from "@/lib/tools/barcodes";

export const GOOGLE_MERCHANT_EXPECTED_HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "availability_date",
  "price",
  "sale_price",
  "sale_price_effective_date",
  "condition",
  "brand",
  "gtin",
  "mpn",
  "identifier_exists",
  "google_product_category",
  "product_type",
  "item_group_id",
  "color",
  "size",
  "gender",
  "age_group",
  "shipping_weight",
  "adult",
  "multipack",
  "is_bundle",
];

export const GOOGLE_MERCHANT_EXAMPLE_ROW: CsvRow = {
  id: "TSHIRT-BLUE-M",
  title: "Organic Cotton T-Shirt, Blue, Medium",
  description: "Soft organic cotton crew-neck t-shirt with a relaxed fit.",
  link: "https://example.com/products/organic-tshirt?variant=blue-m",
  image_link: "https://example.com/images/organic-tshirt-blue.jpg",
  additional_image_link: "https://example.com/images/organic-tshirt-blue-back.jpg",
  availability: "in_stock",
  availability_date: "",
  price: "24.00 USD",
  sale_price: "",
  sale_price_effective_date: "",
  condition: "new",
  brand: "Acme Apparel",
  gtin: "0012345678905",
  mpn: "",
  identifier_exists: "",
  google_product_category: "212",
  product_type: "Apparel > Tops > T-Shirts",
  item_group_id: "TSHIRT-ORGANIC",
  color: "Blue",
  size: "M",
  gender: "unisex",
  age_group: "adult",
  shipping_weight: "0.2 kg",
  adult: "",
  multipack: "",
  is_bundle: "",
};

/** Attributes Google requires for every product. */
const REQUIRED = ["id", "title", "description", "link", "image_link", "availability", "price"] as const;

const AVAILABILITY: Record<string, string> = {
  in_stock: "in_stock",
  instock: "in_stock",
  "in stock": "in_stock",
  "in-stock": "in_stock",
  out_of_stock: "out_of_stock",
  outofstock: "out_of_stock",
  "out of stock": "out_of_stock",
  "out-of-stock": "out_of_stock",
  preorder: "preorder",
  "pre-order": "preorder",
  pre_order: "preorder",
  "pre order": "preorder",
  backorder: "backorder",
  "back-order": "backorder",
  back_order: "backorder",
  "back order": "backorder",
};

export const CONDITION: Record<string, string> = { new: "new", used: "used", refurbished: "refurbished", renewed: "refurbished" };

const YES_NO: Record<string, string> = { yes: "yes", y: "yes", true: "yes", "1": "yes", no: "no", n: "no", false: "no", "0": "no" };

/**
 * Google's Apparel & Accessories category (166), Clothing (1604), Shoes (187) and common clothing
 * categories (203 outerwear, 204 pants, 212 shirts & tops, 2271 dresses), or a category or store type that names them.
 */
const APPAREL = /(^|[^\d])(166|1604|187|203|204|212|2271)([^\d]|$)|apparel|clothing|clothes|shoes|footwear|t-?shirts?|dresses|jackets|hoodies|trousers|jeans/i;
const APPAREL_ATTRIBUTES = ["color", "size", "gender", "age_group"];

export const GENDER: Record<string, string> = {
  male: "male",
  men: "male",
  man: "male",
  mens: "male",
  "men's": "male",
  female: "female",
  women: "female",
  woman: "female",
  womens: "female",
  "women's": "female",
  unisex: "unisex",
};

export const AGE_GROUP: Record<string, string> = {
  newborn: "newborn",
  infant: "infant",
  toddler: "toddler",
  kids: "kids",
  kid: "kids",
  children: "kids",
  adult: "adult",
  adults: "adult",
};

/** Currency symbols that name exactly one currency. "$" and "¥" are ambiguous and are not guessed. */
const SYMBOL_CURRENCY: Record<string, string> = { "€": "EUR", "£": "GBP", "₹": "INR", "₩": "KRW", "₺": "TRY", "₽": "RUB", "zł": "PLN" };

export type GooglePrice = { amount: number; currency: string };

/**
 * Parse a Merchant Center price: "19.99 USD", "USD 19.99", "19,99 EUR", "€19.99".
 * Returns "no-currency" when the number is fine but no currency can be told.
 */
export function parseGooglePrice(raw: string): GooglePrice | "no-currency" | null {
  let v = raw.trim();
  if (!v) return null;
  let currency = "";
  // A three-letter code, written before or after the number, with or without a space.
  const code = /(?:^|[^A-Za-z])([A-Za-z]{3})(?=[^A-Za-z]|$)/.exec(v);
  if (code) {
    currency = code[1].toUpperCase();
    v = v.replace(code[1], "");
  }
  for (const [sym, iso] of Object.entries(SYMBOL_CURRENCY)) {
    if (v.includes(sym)) {
      if (!currency) currency = iso;
      v = v.replace(sym, "");
    }
  }
  v = v.replace(/[$¥]/g, "").trim();
  if (!/\d/.test(v) || /[^\d.,\s'-]/.test(v)) return null;
  const amount = parseShopifyMoney(v);
  if (amount == null || amount < 0) return null;
  return currency ? { amount, currency } : "no-currency";
}

export const formatGooglePrice = (p: GooglePrice) => `${formatShopifyMoney(p.amount)} ${p.currency}`;

const key = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/^g:/, "")
    .replace(/[\s-]+/g, "_");

function canonicalHeaders(headers: string[]): string[] {
  const known = new Set(GOOGLE_MERCHANT_EXPECTED_HEADERS);
  const synonyms: Record<string, string> = { image_url: "image_link", url: "link", product_link: "link", additional_image_links: "additional_image_link", product_category: "google_product_category", ean: "gtin", upc: "gtin", barcode: "gtin" };
  return headers.map((h) => {
    const k = key(h);
    return known.has(k) ? k : (synonyms[k] ?? h.trim());
  });
}

const blank = (v: string | undefined) => !String(v ?? "").trim();

export function validateAndFixGoogleMerchant(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];
  const canon = canonicalHeaders(headers);
  const has = (c: string) => canon.includes(c);

  for (const col of REQUIRED) {
    if (!has(col)) {
      issues.push({
        rowIndex: -1,
        column: col,
        severity: "error",
        code: "google/missing_required_header",
        message: `Missing required column: ${col}`,
        suggestion: `Add the '${col}' column. Google requires it for every product.`,
      });
    }
  }
  if (!has("brand")) {
    issues.push({
      rowIndex: -1,
      column: "brand",
      severity: "warning",
      code: "google/missing_brand",
      message: "There is no brand column.",
      suggestion: "Google requires a brand for new products, except books, music and films.",
    });
  }

  const rowsIn: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    headers.forEach((h, i) => (out[canon[i]] = r?.[h] ?? ""));
    return out;
  });

  const idRows = new Map<string, number[]>();

  const rowsOut = rowsIn.map((r, rowIndex) => {
    const out = { ...r };
    const n = rowIndex + 1;
    const flag = (column: string, severity: CsvIssue["severity"], code: string, message: string, suggestion: string, details?: Record<string, unknown>) =>
      issues.push({ rowIndex, column, severity, code, message, suggestion, ...(details ? { details } : {}) });

    // Tabs and line breaks inside a value break a tab-delimited file.
    for (const col of Object.keys(out)) {
      const v = out[col] ?? "";
      if (/[\t\r\n]/.test(v)) {
        out[col] = v.replace(/\s*[\t\r\n]+\s*/g, " ").trim();
        fixesApplied.push(`Replaced tabs and line breaks in ${col} on row ${n}`);
      }
    }

    for (const col of REQUIRED) {
      if (has(col) && blank(out[col])) flag(col, "error", "google/missing_value", `${col} is blank.`, `Google rejects products without ${col}.`);
    }

    // id: unique, up to 50 characters
    const id = (out.id ?? "").trim();
    if (id) {
      if (id.length > 50) flag("id", "error", "google/id_too_long", `id is ${id.length} characters. Google allows up to 50.`, "Shorten the id. Keep it stable once products are live.", { length: id.length, max: 50 });
      const list = idRows.get(id) ?? [];
      list.push(rowIndex);
      idRows.set(id, list);
    }

    const title = (out.title ?? "").trim();
    if (title.length > 150) flag("title", "warning", "google/title_too_long", `title is ${title.length} characters. Google allows up to 150.`, "Shorten the title, putting the most important words first.", { length: title.length, max: 150 });
    const desc = (out.description ?? "").trim();
    if (desc.length > 5000) flag("description", "warning", "google/description_too_long", `description is ${desc.length} characters. Google allows up to 5000.`, "Shorten the description.", { length: desc.length, max: 5000 });

    // URLs
    for (const col of ["link", "image_link"]) {
      const v = (out[col] ?? "").trim();
      if (v && !isHttpUrl(v)) flag(col, "error", "google/invalid_url", `${col} must be a full http:// or https:// URL. Found '${v}'.`, "Use the full address, starting with https://.");
    }
    if (has("additional_image_link") && !blank(out.additional_image_link)) {
      const urls = (out.additional_image_link ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) flag("additional_image_link", "warning", "google/invalid_url", `additional_image_link must be a full http:// or https:// URL. Found '${bad[0]}'.`, "Use the full address, starting with https://.");
      if (urls.length > 10) flag("additional_image_link", "warning", "google/too_many_images", `additional_image_link has ${urls.length} URLs. Google uses up to 10.`, "Keep the 10 best extra images.", { count: urls.length, max: 10 });
    }

    // availability
    const availRaw = (out.availability ?? "").trim();
    if (availRaw) {
      const a = AVAILABILITY[availRaw.toLowerCase()];
      if (!a) flag("availability", "error", "google/invalid_availability", `availability must be in_stock, out_of_stock, preorder or backorder. Found '${availRaw}'.`, "Use one of Google's four values.");
      else if (a !== availRaw) {
        out.availability = a;
        fixesApplied.push(`Normalized availability to '${a}' on row ${n}`);
      }
      const avail = a ?? "";
      if ((avail === "preorder" || avail === "backorder") && blank(out.availability_date)) {
        flag("availability_date", avail === "preorder" ? "error" : "warning", "google/missing_availability_date", `availability is ${avail} but availability_date is blank.`, "Add the date the product will be available, like 2026-12-01T09:00-0500.");
      }
    }

    // price and sale_price
    let price: GooglePrice | null = null;
    const priceRaw = (out.price ?? "").trim();
    if (priceRaw) {
      const p = parseGooglePrice(priceRaw);
      if (p === "no-currency") flag("price", "error", "google/price_missing_currency", `price '${priceRaw}' has no currency code. Write it like 19.99 USD.`, "Add the three-letter ISO 4217 currency code after the number.");
      else if (!p) flag("price", "error", "google/invalid_price", `price should be a number and a currency code, like 19.99 USD. Found '${priceRaw}'.`, "Write the price as a number followed by the currency code.");
      else if (p.amount === 0) flag("price", "error", "google/invalid_price", "price can't be 0.", "Enter the price the customer pays.");
      else {
        price = p;
        const f = formatGooglePrice(p);
        if (f !== priceRaw) {
          out.price = f;
          fixesApplied.push(`Normalized price to '${f}' on row ${n}`);
        }
      }
    }
    const saleRaw = (out.sale_price ?? "").trim();
    if (saleRaw) {
      const s = parseGooglePrice(saleRaw);
      if (s === "no-currency" || !s) flag("sale_price", "warning", "google/invalid_sale_price", `sale_price should be a number and a currency code, like 14.99 USD. Found '${saleRaw}'.`, "Write the sale price as a number followed by the currency code.");
      else {
        const f = formatGooglePrice(s);
        if (f !== saleRaw) {
          out.sale_price = f;
          fixesApplied.push(`Normalized sale_price to '${f}' on row ${n}`);
        }
        if (price && s.currency === price.currency && s.amount >= price.amount) {
          flag("sale_price", "warning", "google/invalid_sale_price", `sale_price (${formatGooglePrice(s)}) isn't lower than price (${formatGooglePrice(price)}).`, "Set price to the regular price and sale_price to the lower one.");
        }
      }
    }

    // condition
    const condRaw = (out.condition ?? "").trim();
    let condition = "";
    if (condRaw) {
      const c = CONDITION[condRaw.toLowerCase()];
      if (!c) flag("condition", "error", "google/invalid_condition", `condition must be new, used or refurbished. Found '${condRaw}'.`, "Use one of Google's three values.");
      else {
        condition = c;
        if (c !== condRaw) {
          out.condition = c;
          fixesApplied.push(`Normalized condition to '${c}' on row ${n}`);
        }
      }
    }

    // brand (new products)
    if (has("brand") && blank(out.brand) && (condition === "" || condition === "new")) {
      flag("brand", "warning", "google/missing_brand", "brand is blank.", "Google requires a brand for new products, except books, music and films.");
    }

    // gtin
    const gtinRaw = (out.gtin ?? "").trim();
    if (gtinRaw) {
      const values = gtinRaw.split(",").map((s) => s.trim());
      const fixed = values.map((v) => {
        const c = checkBarcode(v);
        if (c.status === "lost") flag("gtin", "error", "google/invalid_gtin", `gtin '${v}' looks like scientific notation, so digits were lost. Re-export the column as text.`, "Copy the barcodes again from the original source.");
        else if (c.status === "invalid") flag("gtin", "error", "google/invalid_gtin", `gtin '${v}' isn't a valid GTIN: it needs 8, 12, 13 or 14 digits with a correct check digit.`, "Check the barcode on the packaging, or leave gtin blank and set identifier_exists to no.");
        return c.status === "fixed" ? c.value : v;
      });
      const joined = fixed.join(",");
      if (joined !== gtinRaw) {
        out.gtin = joined;
        fixesApplied.push(`Cleaned gtin on row ${n}`);
      }
    }

    // yes/no attributes
    for (const col of ["identifier_exists", "adult", "is_bundle"]) {
      const raw = (out[col] ?? "").trim();
      if (!raw) continue;
      const v = YES_NO[raw.toLowerCase()];
      if (!v) flag(col, "warning", "google/invalid_yes_no", `${col} must be yes or no. Found '${raw}'.`, "Use yes or no.");
      else if (v !== raw) {
        out[col] = v;
        fixesApplied.push(`Normalized ${col} to '${v}' on row ${n}`);
      }
    }

    // gtin or mpn, unless the product has no identifiers at all
    if ((has("gtin") || has("mpn")) && blank(out.gtin) && blank(out.mpn) && (out.identifier_exists ?? "").trim() !== "no" && (condition === "" || condition === "new")) {
      flag(has("gtin") ? "gtin" : "mpn", "warning", "google/missing_identifiers", "There is no gtin or mpn.", "Add the barcode (gtin) or the manufacturer part number (mpn), or set identifier_exists to no if the product has neither.");
    }

    // gender and age_group
    for (const [col, map, allowed] of [
      ["gender", GENDER, "male, female or unisex"],
      ["age_group", AGE_GROUP, "newborn, infant, toddler, kids or adult"],
    ] as const) {
      const raw = (out[col] ?? "").trim();
      if (!raw) continue;
      const v = (map as Record<string, string>)[raw.toLowerCase()];
      if (!v) flag(col, "warning", col === "gender" ? "google/invalid_gender" : "google/invalid_age_group", `${col} must be ${allowed}. Found '${raw}'.`, "Use one of Google's values.");
      else if (v !== raw) {
        out[col] = v;
        fixesApplied.push(`Normalized ${col} to '${v}' on row ${n}`);
      }
    }

    // Clothing needs color, size, gender and age_group in many countries.
    if (APPAREL.test(`${out.google_product_category ?? ""} | ${out.product_type ?? ""}`)) {
      const missing = APPAREL_ATTRIBUTES.filter((c) => blank(out[c]));
      if (missing.length) {
        flag(
          missing[0],
          "warning",
          "google/missing_apparel_attributes",
          `This looks like clothing, but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} blank.`,
          "Google requires color, size, gender and age_group for clothing in many countries, including the US, UK, Germany, France, Japan and Brazil.",
        );
      }
    }

    return out;
  });

  for (const [id, list] of idRows) {
    if (list.length < 2) continue;
    const rowsList = list.map((i) => i + 1).join(", ");
    for (const rowIndex of list) {
      issues.push({
        rowIndex,
        column: "id",
        severity: "error",
        code: "google/duplicate_id",
        message: `id '${id}' is used on rows ${rowsList}.`,
        suggestion: "Give every product (and every variant) its own id.",
        details: { id, rows: list.map((i) => i + 1) },
      });
    }
  }

  // Keep the file's own column names and order.
  const finalRows = rowsOut.map((r) => {
    const out: CsvRow = {};
    headers.forEach((h, i) => (out[h] = r[canon[i]] ?? ""));
    return out;
  });
  const originalOf = new Map(canon.map((c, i) => [c, headers[i]] as const));
  for (const it of issues) it.column = originalOf.get(it.column) ?? it.column;

  return { fixedHeaders: [...headers], fixedRows: finalRows, issues, fixesApplied };
}
