import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { parseGooglePrice, validateAndFixGoogleMerchant } from "./googleMerchantOptimizer";

const H = ["id", "title", "description", "link", "image_link", "availability", "price", "condition", "brand", "gtin", "mpn"];
const row = (o: Record<string, string> = {}) => ({
  id: "SKU-1",
  title: "Blue Shirt",
  description: "A shirt.",
  link: "https://example.com/p/1",
  image_link: "https://example.com/i/1.jpg",
  availability: "in_stock",
  price: "19.99 USD",
  condition: "new",
  brand: "Acme",
  gtin: "012345678905",
  mpn: "",
  ...o,
});
const codes = (r: ReturnType<typeof validateAndFixGoogleMerchant>) => r.issues.map((i) => i.code).sort();

describe("parseGooglePrice", () => {
  it("reads the formats sellers use", () => {
    expect(parseGooglePrice("19.99 USD")).toEqual({ amount: 19.99, currency: "USD" });
    expect(parseGooglePrice("USD 19.99")).toEqual({ amount: 19.99, currency: "USD" });
    expect(parseGooglePrice("USD19.99")).toEqual({ amount: 19.99, currency: "USD" });
    expect(parseGooglePrice("19,99 EUR")).toEqual({ amount: 19.99, currency: "EUR" });
    expect(parseGooglePrice("€19.99")).toEqual({ amount: 19.99, currency: "EUR" });
    expect(parseGooglePrice("£5")).toEqual({ amount: 5, currency: "GBP" });
  });
  it("does not guess a currency for $ or a bare number", () => {
    expect(parseGooglePrice("$19.99")).toBe("no-currency");
    expect(parseGooglePrice("19.99")).toBe("no-currency");
  });
  it("rejects text", () => {
    expect(parseGooglePrice("call us")).toBeNull();
  });
});

describe("validateAndFixGoogleMerchant", () => {
  it("passes a clean row", () => {
    expect(codes(validateAndFixGoogleMerchant(H, [row()]))).toEqual([]);
  });

  it("flags missing required columns and blank required values", () => {
    const r = validateAndFixGoogleMerchant(["id", "title"], [{ id: "1", title: "" }]);
    expect(codes(r).filter((c) => c === "google/missing_required_header")).toHaveLength(5);
    expect(r.issues.some((i) => i.code === "google/missing_value" && i.column === "title")).toBe(true);
  });

  it("normalises availability, condition, price and yes/no values, and keeps the file's headers", () => {
    const headers = ["ID", "Title", "description", "link", "image link", "Availability", "price", "condition", "brand", "gtin", "mpn", "identifier_exists"];
    const r = validateAndFixGoogleMerchant(headers, [
      { ID: "1", Title: "T", description: "D", link: "https://e.com/1", "image link": "https://e.com/1.jpg", Availability: "In Stock", price: "19,99 EUR", condition: "New", brand: "", gtin: "", mpn: "", identifier_exists: "FALSE" },
    ]);
    expect(r.fixedHeaders).toEqual(headers);
    expect(r.fixedRows[0]).toMatchObject({ Availability: "in_stock", price: "19.99 EUR", condition: "new", identifier_exists: "no" });
    // identifier_exists=no, so no identifier warning; brand is blank on a new product.
    expect(codes(r)).toEqual(["google/missing_brand"]);
    expect(r.issues[0].column).toBe("brand");
  });

  it("does not guess the currency of a $ price", () => {
    const r = validateAndFixGoogleMerchant(H, [row({ price: "$19.99" })]);
    expect(codes(r)).toEqual(["google/price_missing_currency"]);
    expect(r.fixedRows[0].price).toBe("$19.99");
  });

  it("flags duplicate ids, long ids, bad URLs and bad availability", () => {
    const r = validateAndFixGoogleMerchant(H, [row(), row({ link: "example.com/p", availability: "maybe" }), row({ id: "X".repeat(51) })]);
    expect(codes(r)).toEqual(["google/duplicate_id", "google/duplicate_id", "google/id_too_long", "google/invalid_availability", "google/invalid_url"]);
  });

  it("requires availability_date for preorders", () => {
    const r = validateAndFixGoogleMerchant([...H, "availability_date"], [row({ availability: "pre-order", availability_date: "" })]);
    expect(r.fixedRows[0].availability).toBe("preorder");
    expect(r.issues.find((i) => i.code === "google/missing_availability_date")?.severity).toBe("error");
  });

  it("checks GTINs: restores a proven leading zero, flags bad check digits and scientific notation", () => {
    const r = validateAndFixGoogleMerchant(H, [row({ gtin: "12345678905" }), row({ id: "2", gtin: "012345678906" }), row({ id: "3", gtin: "1.23457E+11" })]);
    expect(r.fixedRows[0].gtin).toBe("012345678905");
    expect(r.issues.filter((i) => i.code === "google/invalid_gtin").map((i) => i.rowIndex)).toEqual([1, 2]);
  });

  it("asks for a gtin or mpn on new products, unless identifier_exists is no", () => {
    expect(codes(validateAndFixGoogleMerchant(H, [row({ gtin: "" })]))).toEqual(["google/missing_identifiers"]);
    expect(codes(validateAndFixGoogleMerchant(H, [row({ gtin: "", mpn: "AC-1" })]))).toEqual([]);
    expect(codes(validateAndFixGoogleMerchant(H, [row({ gtin: "", condition: "used" })]))).toEqual([]);
  });

  it("flags a sale price that isn't lower", () => {
    const r = validateAndFixGoogleMerchant([...H, "sale_price"], [row({ sale_price: "25 USD" })]);
    expect(codes(r)).toEqual(["google/invalid_sale_price"]);
  });

  it("replaces tabs and line breaks inside values", () => {
    const r = validateAndFixGoogleMerchant(H, [row({ description: "Line one\nLine two\tend" })]);
    expect(r.fixedRows[0].description).toBe("Line one Line two end");
  });

  it("asks clothing for color, size, gender and age_group", () => {
    const shirt = { google_product_category: "Apparel & Accessories > Clothing > Shirts & Tops" };
    const r = validateAndFixGoogleMerchant([...H, "google_product_category", "color", "size"], [row({ ...shirt, color: "Blue" })]);
    const issue = r.issues.find((i) => i.code === "google/missing_apparel_attributes");
    expect(issue?.message).toBe("This looks like clothing, but size, gender, age_group are blank.");
    expect(issue?.severity).toBe("warning");
    const full = validateAndFixGoogleMerchant([...H, "google_product_category", "color", "size", "gender", "age_group"], [row({ google_product_category: "212", color: "Blue", size: "M", gender: "unisex", age_group: "adult" })]);
    expect(codes(full)).toEqual([]);
    // A mug is not clothing.
    expect(codes(validateAndFixGoogleMerchant([...H, "product_type"], [row({ product_type: "Kitchen > Mugs" })]))).toEqual([]);
  });

  it("reads a tab-delimited file", () => {
    const text = H.join("\t") + "\n" + H.map((h) => row()[h as keyof ReturnType<typeof row>]).join("\t");
    const { headers, rows } = parseCsv(text);
    expect(headers).toEqual(H);
    expect(codes(validateAndFixGoogleMerchant(headers, rows))).toEqual([]);
  });
});
