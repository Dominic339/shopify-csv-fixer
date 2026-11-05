import { describe, expect, it } from "vitest";
import { validateAndFixMetaCatalog } from "./metaCatalogOptimizer";

const H = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];
const row = (o: Record<string, string> = {}) => ({
  id: "MUG-01",
  title: "Ceramic Mug",
  description: "A mug.",
  availability: "in stock",
  condition: "new",
  price: "18.00 USD",
  link: "https://shop.example.com/products/mug",
  image_link: "https://shop.example.com/mug.jpg",
  brand: "Acme",
  ...o,
});
const codes = (r: ReturnType<typeof validateAndFixMetaCatalog>) => r.issues.map((i) => i.code);

describe("validateAndFixMetaCatalog", () => {
  it("accepts a clean product", () => {
    expect(codes(validateAndFixMetaCatalog(H, [row()]))).toEqual([]);
  });

  it("flags missing required columns, including condition", () => {
    const r = validateAndFixMetaCatalog(["id", "title", "price"], [{ id: "1", title: "Mug", price: "5 USD" }]);
    const missing = r.issues.filter((i) => i.code === "meta/missing_required_header").map((i) => i.column);
    expect(missing).toEqual(["description", "availability", "condition", "link", "image_link"]);
  });

  it("converts Google and store availability spellings to Meta's", () => {
    const r = validateAndFixMetaCatalog(H, [row({ availability: "in_stock" }), row({ id: "2", availability: "Sold Out" })]);
    expect(r.fixedRows.map((x) => x.availability)).toEqual(["in stock", "out of stock"]);
    expect(codes(r)).toEqual([]);
  });

  it("explains retired availability values instead of guessing", () => {
    const r = validateAndFixMetaCatalog(H, [row({ availability: "preorder" })]);
    expect(r.issues[0].message).toBe("availability 'preorder' is no longer accepted. Meta takes in stock or out of stock.");
    expect(r.fixedRows[0].availability).toBe("preorder");
  });

  it("needs a brand, gtin or mpn", () => {
    expect(codes(validateAndFixMetaCatalog(H, [row({ brand: "" })]))).toEqual(["meta/missing_identifier"]);
    expect(codes(validateAndFixMetaCatalog([...H, "mpn"], [row({ brand: "", mpn: "AC-1" })]))).toEqual([]);
  });

  it("uses Meta's longer limits", () => {
    expect(codes(validateAndFixMetaCatalog(H, [row({ title: "x".repeat(180) })]))).toEqual([]);
    expect(codes(validateAndFixMetaCatalog(H, [row({ title: "x".repeat(201) })]))).toEqual(["meta/title_too_long"]);
    expect(codes(validateAndFixMetaCatalog(H, [row({ id: "x".repeat(80) })]))).toEqual([]);
  });

  it("normalizes prices and age groups, and keeps a bare $ for the user to decide", () => {
    const r = validateAndFixMetaCatalog([...H, "age_group"], [row({ price: "18,00 EUR", age_group: "Teens" }), row({ id: "2", price: "$18" })]);
    expect(r.fixedRows[0].price).toBe("18.00 EUR");
    expect(r.fixedRows[0].age_group).toBe("teen");
    expect(codes(r)).toEqual(["meta/price_missing_currency"]);
  });

  it("reads extra images separated by commas, semicolons, spaces or bars", () => {
    const urls = Array.from({ length: 51 }, (_, i) => `https://shop.example.com/${i}.jpg`);
    const r = validateAndFixMetaCatalog([...H, "additional_image_link"], [row({ additional_image_link: urls.slice(0, 3).join(" | ") }), row({ id: "2", additional_image_link: urls.join(";") })]);
    expect(codes(r)).toEqual(["meta/too_many_images"]);
  });

  it("flags duplicate ids and bad GTINs", () => {
    const r = validateAndFixMetaCatalog([...H, "gtin"], [row({ gtin: "4006381333932" }), row({ title: "Other" })]);
    expect(codes(r).sort()).toEqual(["meta/duplicate_id", "meta/duplicate_id", "meta/invalid_gtin"]);
  });
});
