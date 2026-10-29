// src/lib/convertCsv.ts
// Format conversion: source CSV → products (with variants and images) → target format.
//
// Platforms model products differently, so conversion goes through a small product model
// instead of copying cells: Shopify groups variant rows by URL handle, WooCommerce uses a
// variable parent row plus variation rows, eBay uses a parent row plus Relationship=Variation
// rows, and Etsy / Amazon files are one row per listing / offer.

import type { CsvRow } from "@/lib/csv";
import {
  canonicalizeShopifyProductCsv,
  formatShopifyMoney,
  normalizeShopifyInventoryPolicy,
  parseLocaleNumber,
  slugifyShopifyHandle,
  weightToGrams,
} from "@/lib/shopifySchema";
import { canonicalEbayColumn, parseRelationshipDetails } from "@/lib/ebayOptimizer";

// ---------------------------------------------------------------------------
// Product model
// ---------------------------------------------------------------------------

type Option = { name: string; value: string };

type Variant = {
  sku: string;
  barcode: string;
  price: string; // current selling price
  compareAt: string; // original price when on sale (higher than price)
  cost: string;
  qty: string;
  policy: "" | "deny" | "continue"; // sell when out of stock?
  grams: string;
  requiresShipping: string;
  taxable: string;
  image: string;
  options: Option[];
};

type Product = {
  key: string; // stable handle-style key
  title: string;
  description: string;
  vendor: string;
  type: string;
  category: string; // store category path (not Shopify's taxonomy)
  tags: string;
  published: "" | "true" | "false";
  status: "" | "active" | "draft" | "archived";
  seoTitle: string;
  seoDescription: string;
  images: string[];
  variants: Variant[];
};

type ReadResult = { products: Product[]; consumed: Set<string>; warnings: string[] };
type WriteResult = { headers: string[]; rows: CsvRow[]; warnings: string[] };

function emptyVariant(): Variant {
  return {
    sku: "", barcode: "", price: "", compareAt: "", cost: "", qty: "", policy: "",
    grams: "", requiresShipping: "", taxable: "", image: "", options: [],
  };
}

function emptyProduct(key: string): Product {
  return {
    key, title: "", description: "", vendor: "", type: "", category: "", tags: "",
    published: "", status: "", seoTitle: "", seoDescription: "", images: [], variants: [],
  };
}

const t = (v: unknown) => String(v ?? "").trim();

function money(v: string): string {
  const n = parseLocaleNumber(v);
  return n == null ? t(v) : formatShopifyMoney(n);
}

function int(v: string): string {
  const n = parseLocaleNumber(v);
  return n != null && Number.isInteger(n) ? String(n) : t(v);
}

function bool(v: string): string {
  const s = t(v).toLowerCase();
  if (["1", "true", "yes", "y", "t"].includes(s)) return "true";
  if (["0", "false", "no", "n", "f"].includes(s)) return "false";
  return "";
}

/** Split a comma list, honouring WooCommerce's "\," escape. */
function splitList(v: string, sep: RegExp = /(?<!\\),/): string[] {
  return t(v)
    .split(sep)
    .map((s) => s.replace(/\\,/g, ",").trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Descriptions: Shopify, WooCommerce and eBay take HTML; Etsy and Amazon take plain text.
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** Decode HTML entities (Etsy's download is full of &#39; and &amp;). */
export function decodeEntities(v: string): string {
  return v.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const looksLikeHtml = (v: string) => /<\/?(p|br|div|ul|ol|li|h[1-6]|strong|em|b|i|span|table|a)\b[^>]*>/i.test(v);

/** HTML → readable plain text, keeping paragraphs and list items on their own lines. */
export function htmlToText(v: string): string {
  if (!looksLikeHtml(v)) return v;
  const text = v
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|table|tr)\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text → simple HTML, so line breaks survive on HTML platforms. */
export function textToHtml(v: string): string {
  if (!v || looksLikeHtml(v) || !/\n/.test(v)) return v;
  return v
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function addImage(p: Product, url: string) {
  const u = t(url);
  if (u && !p.images.includes(u)) p.images.push(u);
}

function uniqueKey(base: string, used: Set<string>) {
  let key = base || "product";
  let n = 2;
  while (used.has(key)) key = `${base}-${n++}`;
  used.add(key);
  return key;
}

/** Case-insensitive header lookup: logical name → the file's header. */
function headerIndex(headers: string[]) {
  const byKey = new Map<string, string>();
  for (const h of headers) {
    const k = h.trim().toLowerCase();
    if (!byKey.has(k)) byKey.set(k, h);
  }
  return byKey;
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

function readShopify(headers: string[], rows: CsvRow[]): ReadResult {
  const canon = canonicalizeShopifyProductCsv(headers, rows);
  const consumed = new Set(Object.values(canon.sourceMap).filter((h): h is string => !!h));
  const products: Product[] = [];
  const byKey = new Map<string, Product>();
  const used = new Set<string>();
  let current: Product | null = null;

  for (const r of canon.fixedRows) {
    const title = t(r["Title"]);
    const rawHandle = t(r["URL handle"]).toLowerCase();
    const handle = rawHandle || (title ? slugifyShopifyHandle(title) : "");

    let p: Product | null | undefined = handle ? byKey.get(handle) : current;
    if (!p) {
      p = emptyProduct(uniqueKey(handle, used));
      byKey.set(handle || p.key, p);
      products.push(p);
    }
    current = p;

    if (!p.title && title) {
      p.title = title;
      p.description = t(r["Description"]);
      p.vendor = t(r["Vendor"]);
      p.type = t(r["Type"]);
      p.tags = t(r["Tags"]);
      p.published = bool(r["Published on online store"]) as Product["published"];
      p.status = (["active", "draft", "archived"].includes(t(r["Status"]).toLowerCase()) ? t(r["Status"]).toLowerCase() : "") as Product["status"];
      p.seoTitle = t(r["SEO title"]);
      p.seoDescription = t(r["SEO description"]);
    }
    addImage(p, r["Product image URL"]);

    const optionValues = [1, 2, 3].map((n) => t(r[`Option${n} value`]));
    const isVariantRow =
      !!(t(r["SKU"]) || t(r["Price"]) || t(r["Inventory quantity"]) || optionValues.some(Boolean)) ||
      (!!title && p.variants.length === 0);
    if (!isVariantRow) continue;

    // Option names are given on the product's first row; later rows inherit them.
    const names = [1, 2, 3].map((n, i) => t(r[`Option${n} name`]) || p.variants[0]?.options[i]?.name || "");
    const options: Option[] = [];
    names.forEach((name, i) => {
      if (name && optionValues[i] && !(name === "Title" && optionValues[i] === "Default Title")) {
        options.push({ name, value: optionValues[i] });
      }
    });

    p.variants.push({
      sku: t(r["SKU"]),
      barcode: t(r["Barcode"]),
      price: money(r["Price"]),
      compareAt: money(r["Compare-at price"]),
      cost: money(r["Cost per item"]),
      qty: int(r["Inventory quantity"]),
      policy: normalizeShopifyInventoryPolicy(r["Continue selling when out of stock"]) as Variant["policy"],
      grams: int(r["Weight value (grams)"]),
      requiresShipping: bool(r["Requires shipping"]),
      taxable: bool(r["Charge tax"]),
      image: t(r["Variant image URL"]),
      options,
    });
  }

  return { products, consumed, warnings: [] };
}

function readWoo(headers: string[], rows: CsvRow[]): ReadResult {
  const h = headerIndex(headers);
  const consumed = new Set<string>();
  const col = (name: string) => {
    const real = h.get(name.toLowerCase());
    if (real) consumed.add(real);
    return real;
  };
  const get = (r: CsvRow, name: string) => {
    const real = col(name);
    return real ? t(r[real]) : "";
  };
  const weightHeader = headers.find((x) => /^weight\s*\((.+)\)$/i.test(x.trim()));
  if (weightHeader) consumed.add(weightHeader);
  const weightUnit = weightHeader?.trim().match(/^weight\s*\((.+)\)$/i)?.[1] ?? "kg";
  const attrNums = headers
    .map((x) => x.trim().match(/^attribute (\d+) name$/i)?.[1])
    .filter((x): x is string => !!x);

  const products: Product[] = [];
  const parents = new Map<string, Product>();
  const used = new Set<string>();
  const warnings: string[] = [];

  const baseProduct = (r: CsvRow) => {
    const name = get(r, "Name");
    const p = emptyProduct(uniqueKey(slugifyShopifyHandle(name) || get(r, "SKU").toLowerCase(), used));
    p.title = name;
    // WooCommerce's exporter writes line breaks as a literal "\n"; its importer turns them back.
    p.description = (get(r, "Description") || get(r, "Short description")).replace(/\\n/g, "\n");
    p.tags = splitList(get(r, "Tags")).join(", ");
    p.category = splitList(get(r, "Categories"))[0] ?? "";
    const pub = get(r, "Published");
    p.published = pub === "1" ? "true" : pub === "0" || pub === "-1" ? "false" : "";
    p.status = pub === "1" ? "active" : pub === "0" || pub === "-1" ? "draft" : "";
    for (const img of splitList(get(r, "Images"))) addImage(p, img);
    return p;
  };

  const variantFrom = (r: CsvRow, withOptions: boolean): Variant => {
    const regular = money(get(r, "Regular price"));
    const sale = money(get(r, "Sale price"));
    const backorders = get(r, "Backorders allowed?").toLowerCase();
    const options: Option[] = [];
    if (withOptions) {
      for (const n of attrNums) {
        const name = get(r, `Attribute ${n} name`);
        const value = splitList(get(r, `Attribute ${n} value(s)`))[0] ?? "";
        if (name && value) options.push({ name, value });
      }
    }
    const grams = weightHeader ? weightToGrams(t(r[weightHeader]), weightUnit) : null;
    return {
      ...emptyVariant(),
      sku: get(r, "SKU"),
      barcode: get(r, "GTIN, UPC, EAN, or ISBN"),
      // WooCommerce: Sale price is the (lower) selling price; Regular price is the original.
      price: sale || regular,
      compareAt: sale ? regular : "",
      qty: int(get(r, "Stock")),
      policy: backorders === "1" || backorders === "notify" ? "continue" : backorders === "0" ? "deny" : "",
      grams: grams == null ? "" : String(grams),
      taxable: get(r, "Tax status") ? (get(r, "Tax status").toLowerCase() === "none" ? "false" : "true") : "",
      image: withOptions ? splitList(get(r, "Images"))[0] ?? "" : "",
      options,
    };
  };

  const types = rows.map((r) => get(r, "Type").toLowerCase());

  // Parents first, so variations can attach regardless of row order.
  rows.forEach((r, i) => {
    const isVariation = types[i].includes("variation");
    if (isVariation) return;
    const p = baseProduct(r);
    products.push(p);
    const isVariable = types[i].includes("variable");
    if (!isVariable) p.variants.push(variantFrom(r, false));
    if (get(r, "SKU")) parents.set(get(r, "SKU").toLowerCase(), p);
    if (get(r, "ID")) parents.set(`id:${get(r, "ID")}`, p);
  });

  rows.forEach((r, i) => {
    if (!types[i].includes("variation")) return;
    const parentRef = get(r, "Parent").toLowerCase();
    let p = parents.get(parentRef);
    if (!p) {
      p = baseProduct(r);
      p.title = p.title || get(r, "Parent");
      products.push(p);
      if (parentRef) parents.set(parentRef, p);
      warnings.push(`Variation ${get(r, "SKU") || `on row ${i + 2}`} refers to parent '${get(r, "Parent")}', which is not in the file; it was converted as its own product.`);
    }
    p.variants.push(variantFrom(r, true));
  });

  for (const p of products) if (!p.variants.length) p.variants.push(emptyVariant());
  for (const n of attrNums) {
    col(`Attribute ${n} name`);
    col(`Attribute ${n} value(s)`);
  }
  for (const name of ["Type", "Parent", "ID", "In stock?"]) col(name);
  return { products, consumed, warnings };
}

function readEtsy(headers: string[], rows: CsvRow[]): ReadResult {
  const h = headerIndex(headers);
  const consumed = new Set<string>();
  const get = (r: CsvRow, ...names: string[]) => {
    for (const n of names) {
      const real = h.get(n.toLowerCase());
      if (real) {
        consumed.add(real);
        if (t(r[real])) return t(r[real]);
      }
    }
    return "";
  };
  const imageCols = headers.filter((x) => /^image\s*\d+$/i.test(x.trim()));
  imageCols.forEach((c) => consumed.add(c));
  const used = new Set<string>();
  const warnings: string[] = [];
  if (headers.some((x) => /^variation \d+/i.test(x.trim()))) {
    warnings.push("Etsy variation columns list option values but not per-variant prices or stock, so each listing was converted as a single product.");
  }

  const products = rows.map((r) => {
    const title = decodeEntities(get(r, "Title"));
    const p = emptyProduct(uniqueKey(slugifyShopifyHandle(title) || get(r, "SKU").toLowerCase(), used));
    p.title = title;
    p.description = decodeEntities(get(r, "Description"));
    p.tags = splitList(decodeEntities(get(r, "Tags"))).join(", ");
    for (const c of imageCols) addImage(p, r[c]);
    for (const img of splitList(get(r, "Image URLs"))) addImage(p, img);
    p.variants.push({ ...emptyVariant(), sku: get(r, "SKU"), price: money(get(r, "Price")), qty: int(get(r, "Quantity")) });
    return p;
  });
  get({}, "Currency_code", "Currency", "Materials");
  return { products, consumed, warnings };
}

// Seller Hub's "Active listings" download names a few columns differently from File Exchange.
const EBAY_REPORT_ALIASES: Record<string, string> = {
  "available quantity": "Quantity",
  "current price": "StartPrice",
  "item number": "ItemID",
  "ebay category 1 number": "Category",
};

function readEbay(headers: string[], rows: CsvRow[]): ReadResult {
  const col = new Map<string, string>();
  for (const x of headers) {
    const c = canonicalEbayColumn(x) ?? EBAY_REPORT_ALIASES[x.trim().toLowerCase()] ?? null;
    if (c && !col.has(c)) col.set(c, x);
  }
  const consumed = new Set<string>();
  const get = (r: CsvRow, c: string) => {
    const real = col.get(c);
    if (real) consumed.add(real);
    return real ? t(r[real]) : "";
  };
  const used = new Set<string>();
  const products: Product[] = [];
  let parent: Product | null = null;

  for (const r of rows) {
    const isChild = get(r, "Relationship").toLowerCase() === "variation";
    const variant: Variant = {
      ...emptyVariant(),
      sku: get(r, "CustomLabel"),
      price: money(get(r, "StartPrice") || get(r, "BuyItNowPrice")),
      qty: int(get(r, "Quantity")),
    };

    if (isChild && parent) {
      const details = parseRelationshipDetails(get(r, "RelationshipDetails"));
      variant.options = details ? [...details.values()].map((d) => ({ name: d.name, value: d.values[0] })) : [];
      variant.image = get(r, "PicURL").split("|")[0]?.trim() ?? "";
      parent.variants.push(variant);
      continue;
    }

    const title = get(r, "Title");
    const p = emptyProduct(uniqueKey(slugifyShopifyHandle(title) || variant.sku.toLowerCase(), used));
    p.title = title;
    p.description = get(r, "Description");
    for (const u of get(r, "PicURL").split("|")) addImage(p, u);
    products.push(p);
    const isParent = !!get(r, "RelationshipDetails");
    if (!isParent) p.variants.push(variant);
    parent = isParent ? p : null;
  }
  for (const p of products) if (!p.variants.length) p.variants.push(emptyVariant());
  for (const c of ["Action", "Category", "ConditionID", "Format", "Duration"]) get({}, c);
  return { products, consumed, warnings: [] };
}

function readAmazon(headers: string[], rows: CsvRow[]): ReadResult {
  const h = headerIndex(headers);
  const consumed = new Set<string>();
  const get = (r: CsvRow, ...names: string[]) => {
    for (const n of names) {
      const real = h.get(n);
      if (real) {
        consumed.add(real);
        if (t(r[real])) return t(r[real]);
      }
    }
    return "";
  };
  const used = new Set<string>();
  const products = rows.map((r) => {
    const sku = get(r, "sku", "item_sku", "seller-sku");
    const title = get(r, "item-name", "item_name");
    const idType = get(r, "product-id-type", "external_product_id_type").toLowerCase();
    const id = get(r, "product-id", "external_product_id");
    const isBarcode = ["2", "3", "4", "upc", "ean", "isbn", "gtin", "jan"].includes(idType);
    const p = emptyProduct(uniqueKey(slugifyShopifyHandle(title) || sku.toLowerCase(), used));
    p.title = decodeEntities(title) || sku;
    p.description = decodeEntities(get(r, "item-description", "product_description"));
    p.vendor = get(r, "brand-name", "brand_name");
    addImage(p, get(r, "image-url", "main_image_url"));
    p.variants.push({
      ...emptyVariant(),
      sku,
      barcode: isBarcode ? id : "",
      price: money(get(r, "price", "standard_price")),
      qty: int(get(r, "quantity")),
    });
    return p;
  });
  return { products, consumed, warnings: [] };
}

const READERS: Record<string, (h: string[], r: CsvRow[]) => ReadResult> = {
  shopify_products: readShopify,
  woocommerce_products: readWoo,
  woocommerce_variable_products: readWoo,
  etsy_listings: readEtsy,
  ebay_listings: readEbay,
  ebay_variations: readEbay,
  amazon_inventory_loader: readAmazon,
};

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

const isMulti = (p: Product) => p.variants.length > 1 || p.variants.some((v) => v.options.length);

function optionNames(p: Product): string[] {
  const names: string[] = [];
  for (const v of p.variants) v.options.forEach((o, i) => (names[i] = names[i] || o.name));
  return names.slice(0, 3);
}

/** Drop columns that are empty in every row (keeps `keep`). */
function compact(headers: string[], rows: CsvRow[], keep: string[] = []): string[] {
  return headers.filter((h) => keep.includes(h) || rows.some((r) => t(r[h])));
}

const SHOPIFY_COLUMNS = [
  "Title", "URL handle", "Description", "Vendor", "Type", "Tags", "Published on online store", "Status",
  "SKU", "Barcode", "Option1 name", "Option1 value", "Option2 name", "Option2 value", "Option3 name", "Option3 value",
  "Price", "Compare-at price", "Cost per item", "Charge tax", "Inventory tracker", "Inventory quantity",
  "Continue selling when out of stock", "Weight value (grams)", "Requires shipping", "Fulfillment service",
  "Product image URL", "Image position", "Variant image URL", "SEO title", "SEO description",
];

const SHOPIFY_LEGACY_NAMES: Record<string, string> = {
  "URL handle": "Handle", Description: "Body (HTML)", "Published on online store": "Published",
  SKU: "Variant SKU", Barcode: "Variant Barcode", "Option1 name": "Option1 Name", "Option1 value": "Option1 Value",
  "Option2 name": "Option2 Name", "Option2 value": "Option2 Value", "Option3 name": "Option3 Name",
  "Option3 value": "Option3 Value", Price: "Variant Price", "Compare-at price": "Variant Compare At Price",
  "Charge tax": "Variant Taxable", "Inventory tracker": "Variant Inventory Tracker",
  "Inventory quantity": "Variant Inventory Qty", "Continue selling when out of stock": "Variant Inventory Policy",
  "Weight value (grams)": "Variant Grams", "Requires shipping": "Variant Requires Shipping",
  "Fulfillment service": "Variant Fulfillment Service", "Product image URL": "Image Src",
  "Image position": "Image Position", "Variant image URL": "Variant Image", "SEO title": "SEO Title",
  "SEO description": "SEO Description",
};

function writeShopify(products: Product[], legacy: boolean): WriteResult {
  const rows: CsvRow[] = [];
  const warnings: string[] = [];
  let typedFromCategory = false;

  for (const p of products) {
    const names = optionNames(p);
    const lineCount = Math.max(p.variants.length, p.images.length);
    for (let i = 0; i < lineCount; i++) {
      const v = p.variants[i];
      const row: CsvRow = { "URL handle": p.key };
      if (i === 0) {
        if (!p.type && p.category) typedFromCategory = true;
        Object.assign(row, {
          Title: p.title,
          Description: textToHtml(p.description),
          Vendor: p.vendor,
          Type: p.type || (p.category.split(">").pop() ?? "").trim(),
          Tags: p.tags,
          "Published on online store": p.published,
          Status: p.status,
          "SEO title": p.seoTitle,
          "SEO description": p.seoDescription,
        });
      }
      if (v) {
        const tracked = v.qty !== "";
        Object.assign(row, {
          SKU: v.sku,
          Barcode: v.barcode,
          Price: v.price,
          "Compare-at price": v.compareAt,
          "Cost per item": v.cost,
          "Charge tax": v.taxable,
          "Inventory tracker": tracked ? "shopify" : "",
          "Inventory quantity": v.qty,
          "Continue selling when out of stock": v.policy || (tracked ? "deny" : ""),
          "Weight value (grams)": v.grams,
          "Requires shipping": v.requiresShipping,
          "Fulfillment service": tracked ? "manual" : "",
          "Variant image URL": v.image,
        });
        if (isMulti(p)) {
          names.forEach((n, k) => {
            if (i === 0) row[`Option${k + 1} name`] = n;
            row[`Option${k + 1} value`] = v.options[k]?.value ?? "";
          });
        } else {
          row["Option1 name"] = "Title";
          row["Option1 value"] = "Default Title";
        }
      }
      // One image per line: Shopify reads extra rows with just a handle + image as more images.
      if (p.images[i]) {
        row["Product image URL"] = p.images[i];
        row["Image position"] = String(i + 1);
      }
      rows.push(row);
    }
  }

  const tooManyOptions = products.filter((p) => p.variants.some((v) => v.options.length > 3)).length;
  if (tooManyOptions) {
    warnings.push(`${tooManyOptions} product(s) have more than 3 options; Shopify allows 3, so only the first 3 were kept.`);
  }

  if (typedFromCategory) {
    warnings.push("Store categories were written to Shopify's Type field. Shopify's Product category only accepts Shopify's own taxonomy, so set it in Shopify if you need it.");
  }

  let headers = compact(SHOPIFY_COLUMNS, rows, ["Title", "URL handle"]);
  let outRows = rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""])));
  if (legacy) {
    const rename = (h: string) => SHOPIFY_LEGACY_NAMES[h] ?? h;
    outRows = outRows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [rename(k), v])));
    headers = headers.map(rename);
  }
  return { headers, rows: outRows, warnings };
}

const WOO_COLUMNS = [
  "Type", "SKU", "GTIN, UPC, EAN, or ISBN", "Name", "Published", "Short description", "Description",
  "Tax status", "In stock?", "Stock", "Backorders allowed?", "Weight (kg)", "Sale price", "Regular price",
  "Categories", "Tags", "Images", "Parent",
  "Attribute 1 name", "Attribute 1 value(s)", "Attribute 1 visible", "Attribute 1 global",
  "Attribute 2 name", "Attribute 2 value(s)", "Attribute 2 visible", "Attribute 2 global",
  "Attribute 3 name", "Attribute 3 value(s)", "Attribute 3 visible", "Attribute 3 global",
];

function wooPrices(v: Variant) {
  const p = parseLocaleNumber(v.price);
  const c = parseLocaleNumber(v.compareAt);
  // Shopify-style compare-at (original) → WooCommerce regular price; selling price → sale price.
  return p != null && c != null && c > p ? { regular: v.compareAt, sale: v.price } : { regular: v.price, sale: "" };
}

function wooStock(v: Variant) {
  const q = parseLocaleNumber(v.qty);
  return {
    "In stock?": q == null ? "" : q > 0 ? "1" : v.policy === "continue" ? "backorder" : "0",
    Stock: v.qty,
    "Backorders allowed?": v.policy === "continue" ? "1" : v.policy === "deny" ? "0" : "",
  };
}

function writeWoo(products: Product[]): WriteResult {
  const rows: CsvRow[] = [];
  const warnings: string[] = [];
  const parentSkus = new Set<string>();
  const kg = (grams: string) => {
    const n = parseLocaleNumber(grams);
    return n == null ? "" : String(Math.round(n) / 1000);
  };
  // WooCommerce: 1 = published, 0 = private, -1 = draft.
  const published = (p: Product) =>
    p.status === "draft" || p.status === "archived" || p.published === "false" ? "-1" : p.status || p.published ? "1" : "";

  for (const p of products) {
    const base = {
      Name: p.title,
      Published: published(p),
      Description: textToHtml(p.description),
      Categories: p.category || p.type,
      Tags: p.tags,
      Images: p.images.join(", "),
    };
    if (!isMulti(p)) {
      const v = p.variants[0];
      const { regular, sale } = wooPrices(v);
      rows.push({
        Type: "simple", SKU: v.sku, "GTIN, UPC, EAN, or ISBN": v.barcode, ...base,
        "Tax status": v.taxable === "false" ? "none" : v.taxable ? "taxable" : "",
        ...wooStock(v), "Weight (kg)": kg(v.grams), "Regular price": regular, "Sale price": sale,
      });
      continue;
    }

    const names = optionNames(p);
    let parentSku = p.key.toUpperCase();
    while (parentSkus.has(parentSku) || p.variants.some((v) => v.sku === parentSku)) parentSku += "-P";
    parentSkus.add(parentSku);

    const parent: CsvRow = { Type: "variable", SKU: parentSku, ...base };
    names.forEach((n, k) => {
      const values = [...new Set(p.variants.map((v) => v.options[k]?.value).filter(Boolean))];
      parent[`Attribute ${k + 1} name`] = n;
      parent[`Attribute ${k + 1} value(s)`] = values.join(", ");
      parent[`Attribute ${k + 1} visible`] = "1";
      parent[`Attribute ${k + 1} global`] = "0";
    });
    rows.push(parent);

    for (const v of p.variants) {
      const { regular, sale } = wooPrices(v);
      const row: CsvRow = {
        Type: "variation", SKU: v.sku, "GTIN, UPC, EAN, or ISBN": v.barcode, Published: base.Published,
        "Tax status": v.taxable === "false" ? "none" : v.taxable ? "taxable" : "",
        ...wooStock(v), "Weight (kg)": kg(v.grams), "Regular price": regular, "Sale price": sale,
        Images: v.image, Parent: parentSku,
      };
      names.forEach((n, k) => {
        row[`Attribute ${k + 1} name`] = n;
        row[`Attribute ${k + 1} value(s)`] = v.options[k]?.value ?? "";
        row[`Attribute ${k + 1} global`] = "0";
      });
      rows.push(row);
    }
  }

  const headers = compact(WOO_COLUMNS, rows, ["Type", "Name"]);
  if (headers.includes("Weight (kg)")) {
    warnings.push("Weights are written in kg (WooCommerce's default). If your store uses another unit, rename the column to match, e.g. Weight (lbs), and convert the values.");
  }
  return { headers, rows: rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""]))), warnings };
}

// Etsy's listing limits: 140-character titles, 13 tags of at most 20 characters.
const ETSY_TITLE_MAX = 140;
const ETSY_TAGS_MAX = 13;
const ETSY_TAG_LEN = 20;

function writeEtsy(products: Product[]): WriteResult {
  const warnings: string[] = [];
  let collapsed = 0;
  let longTitles = 0;
  let droppedTags = 0;
  const rows = products.map((p) => {
    if (p.variants.length > 1) collapsed++;
    if (p.title.length > ETSY_TITLE_MAX) longTitles++;
    const allTags = [...new Set(splitList(p.tags).map((x) => x.replace(/[^\p{L}\p{N} '&-]/gu, "").trim()).filter(Boolean))];
    const tags = allTags.filter((x) => x.length <= ETSY_TAG_LEN).slice(0, ETSY_TAGS_MAX);
    droppedTags += allTags.length - tags.length;
    const prices = p.variants.map((v) => parseLocaleNumber(v.price)).filter((n): n is number => n != null);
    const qtys = p.variants.map((v) => parseLocaleNumber(v.qty)).filter((n): n is number => n != null);
    const row: CsvRow = {
      TITLE: p.title,
      DESCRIPTION: htmlToText(p.description),
      PRICE: prices.length ? formatShopifyMoney(Math.min(...prices)) : "",
      CURRENCY_CODE: "",
      QUANTITY: qtys.length ? String(Math.min(999, qtys.reduce((a, b) => a + b, 0))) : "",
      TAGS: tags.join(","),
      SKU: p.variants[0]?.sku ?? "",
    };
    p.images.slice(0, 10).forEach((u, i) => (row[`IMAGE${i + 1}`] = u));
    return row;
  });
  if (collapsed) {
    warnings.push(`${collapsed} product(s) with variants became single listings (lowest price, combined quantity). Add Etsy variations in Shop Manager.`);
  }
  if (longTitles) warnings.push(`${longTitles} title(s) are longer than Etsy's 140-character limit.`);
  if (droppedTags) warnings.push(`${droppedTags} tag(s) were left out: Etsy allows 13 tags per listing, each up to 20 characters.`);
  warnings.push("CURRENCY_CODE is left blank: Etsy listings use your shop's currency.");
  const imageCols = Array.from({ length: 10 }, (_, i) => `IMAGE${i + 1}`);
  const headers = compact(["TITLE", "DESCRIPTION", "PRICE", "CURRENCY_CODE", "QUANTITY", "TAGS", ...imageCols, "SKU"], rows, ["TITLE", "PRICE", "CURRENCY_CODE", "QUANTITY"]);
  return { headers, rows: rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""]))), warnings };
}

const EBAY_ACTION = "*Action(SiteID=US|Country=US|Currency=USD|Version=1193)";

function writeEbay(products: Product[]): WriteResult {
  const rows: CsvRow[] = [];
  let longTitles = 0;
  for (const p of products) {
    if (p.title.length > 80) longTitles++;
    const listing: CsvRow = {
      [EBAY_ACTION]: "Add",
      "*Category": "",
      "*Title": p.title,
      "*ConditionID": "",
      "*Description": textToHtml(p.description),
      PicURL: p.images.slice(0, 24).join("|"),
      "*Format": "FixedPrice",
      "*Duration": "GTC",
    };
    if (!isMulti(p)) {
      const v = p.variants[0];
      rows.push({ ...listing, CustomLabel: v.sku, "*StartPrice": v.price, "*Quantity": v.qty });
      continue;
    }
    const names = optionNames(p);
    listing.CustomLabel = p.key.toUpperCase();
    listing.RelationshipDetails = names
      .map((n, k) => `${n}=${[...new Set(p.variants.map((v) => v.options[k]?.value).filter(Boolean))].join(";")}`)
      .join("|");
    rows.push(listing);
    for (const v of p.variants) {
      rows.push({
        CustomLabel: v.sku,
        "*StartPrice": v.price,
        "*Quantity": v.qty,
        Relationship: "Variation",
        RelationshipDetails: names.map((n, k) => `${n}=${v.options[k]?.value ?? ""}`).join("|"),
      });
    }
  }

  const warnings = [
    "The first column targets eBay US (SiteID=US, Currency=USD). For another eBay site, change it to match a template downloaded from your Seller Hub.",
    "Fill in *Category (eBay's numeric category ID) and *ConditionID for each listing before uploading.",
  ];
  if (longTitles) warnings.push(`${longTitles} title(s) are longer than eBay's 80-character limit.`);
  const headers = compact(
    [EBAY_ACTION, "CustomLabel", "*Category", "*Title", "*ConditionID", "*Description", "PicURL", "*Format", "*Duration", "*StartPrice", "*Quantity", "Relationship", "RelationshipDetails"],
    rows,
    [EBAY_ACTION, "*Category", "*Title", "*ConditionID", "*StartPrice", "*Quantity"]
  );
  return { headers, rows: rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""]))), warnings };
}

function amazonIdType(id: string): string {
  if (/^\d{12}$/.test(id)) return "3"; // UPC
  if (/^\d{13}$/.test(id)) return id.startsWith("978") || id.startsWith("979") ? "2" : "4"; // ISBN-13 / EAN
  if (/^\d{9}[\dX]$/i.test(id)) return "2"; // ISBN-10
  if (/^[A-Z0-9]{10}$/i.test(id)) return "1"; // ASIN
  return "";
}

function writeAmazon(products: Product[]): WriteResult {
  const rows: CsvRow[] = [];
  let noSku = 0;
  let noId = 0;
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.sku) {
        noSku++;
        continue;
      }
      if (!v.barcode) noId++;
      rows.push({
        sku: v.sku,
        "product-id": v.barcode,
        "product-id-type": v.barcode ? amazonIdType(v.barcode) : "",
        price: v.price,
        "item-condition": "",
        quantity: v.qty,
        "add-delete": "a",
        "fulfillment-center-id": "DEFAULT",
      });
    }
  }
  const warnings = [
    "Amazon's Inventory Loader adds offers to products that already exist on Amazon; it cannot create new product pages.",
    "Fill in item-condition (11 = New) for each offer before uploading.",
  ];
  if (noSku) warnings.push(`${noSku} variant(s) without a SKU were skipped; Amazon requires a SKU for every offer.`);
  if (noId) warnings.push(`${noId} offer(s) have no product-id (UPC/EAN/ASIN), so Amazon can only update them if the SKU already exists in your account.`);
  const headers = ["sku", "product-id", "product-id-type", "price", "item-condition", "quantity", "add-delete", "fulfillment-center-id"];
  return { headers, rows, warnings };
}

const WRITERS: Record<string, (p: Product[]) => WriteResult> = {
  shopify_products: (p) => writeShopify(p, false),
  shopify_products_legacy: (p) => writeShopify(p, true),
  woocommerce_products: writeWoo,
  woocommerce_variable_products: writeWoo,
  etsy_listings: writeEtsy,
  ebay_listings: writeEbay,
  amazon_inventory_loader: writeAmazon,
};

// User-facing display names for the converter UI
export const CONVERT_FORMAT_OPTIONS = [
  { id: "shopify_products", label: "Shopify (new template)" },
  { id: "shopify_products_legacy", label: "Shopify (legacy)" },
  { id: "woocommerce_products", label: "WooCommerce Products" },
  { id: "woocommerce_variable_products", label: "WooCommerce Variable Products" },
  { id: "etsy_listings", label: "Etsy Listings" },
  { id: "ebay_listings", label: "eBay Listings" },
  { id: "amazon_inventory_loader", label: "Amazon Inventory Loader" },
];

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

export type ConvertResult = {
  headers: string[];
  rows: CsvRow[];
  warnings: string[];
  rowsProcessed: number;
  rowsTotal: number;
  truncated: boolean;
  unmappedSourceFields: string[];
};

export function convertCsv(
  sourceHeaders: string[],
  sourceRows: CsvRow[],
  sourceFormatId: string,
  targetFormatId: string,
  /** Rows to convert at most; null converts everything. */
  limit: number | null = null
): ConvertResult {
  const normalizedSourceId = sourceFormatId === "shopify_products_legacy" ? "shopify_products" : sourceFormatId;
  const read = READERS[normalizedSourceId];
  const write = WRITERS[targetFormatId];

  const unsupported = (message: string): ConvertResult => ({
    headers: sourceHeaders,
    rows: sourceRows,
    warnings: [message],
    rowsProcessed: 0,
    rowsTotal: sourceRows.length,
    truncated: false,
    unmappedSourceFields: [],
  });
  if (!read) return unsupported(`Unsupported source format: ${sourceFormatId}`);
  if (!write) return unsupported(`Unsupported target format: ${targetFormatId}`);

  const totalRows = sourceRows.length;
  const truncated = limit !== null && totalRows > limit;
  const rowsToProcess = truncated ? sourceRows.slice(0, limit) : sourceRows;

  const source = read(sourceHeaders, rowsToProcess);
  const target = write(source.products);
  const warnings = [...source.warnings, ...target.warnings];

  const unmappedSourceFields = sourceHeaders.filter((h) => !source.consumed.has(h));
  if (unmappedSourceFields.length) {
    warnings.unshift(
      `${unmappedSourceFields.length} source column(s) have no equivalent in the target format and were left out: ${unmappedSourceFields.slice(0, 5).join(", ")}${unmappedSourceFields.length > 5 ? ` (+${unmappedSourceFields.length - 5})` : ""}.`
    );
  }
  if (truncated) {
    warnings.push(`Only the first ${limit} rows were converted (${totalRows} total). Upgrade your plan to convert larger files.`);
  }

  return {
    headers: target.headers,
    rows: target.rows,
    warnings,
    rowsProcessed: rowsToProcess.length,
    rowsTotal: totalRows,
    truncated,
    unmappedSourceFields,
  };
}
