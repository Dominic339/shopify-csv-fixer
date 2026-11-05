import { describe, expect, it } from "vitest";
import { validateAndFixTikTokCatalog } from "./tiktokCatalogOptimizer";

const H = ["sku_id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];
const row = (o: Record<string, string> = {}) => ({
  sku_id: "MUG-01",
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
const codes = (r: ReturnType<typeof validateAndFixTikTokCatalog>) => r.issues.map((i) => i.code);

describe("validateAndFixTikTokCatalog", () => {
  it("accepts a clean product", () => {
    expect(codes(validateAndFixTikTokCatalog(H, [row()]))).toEqual([]);
  });

  it("flags missing required columns, including brand", () => {
    const r = validateAndFixTikTokCatalog(["sku_id", "title", "price"], [{ sku_id: "1", title: "Mug", price: "5 USD" }]);
    const missing = r.issues.filter((i) => i.code === "tiktok/missing_required_header").map((i) => i.column);
    expect(missing).toEqual(["description", "availability", "condition", "link", "image_link", "brand"]);
  });

  it("renames a Google or Meta id column to sku_id", () => {
    const headers = ["id", ...H.slice(1)];
    const { sku_id, ...rest } = row();
    const r = validateAndFixTikTokCatalog(headers, [{ id: sku_id, ...rest }]);
    expect(r.fixedHeaders[0]).toBe("sku_id");
    expect(r.fixedRows[0].sku_id).toBe("MUG-01");
    expect(r.fixesApplied).toContain("Renamed column 'id' to 'sku_id'");
    expect(codes(r)).toEqual([]);
  });

  it("leaves an id column alone when sku_id is already there", () => {
    const r = validateAndFixTikTokCatalog(["id", ...H], [{ id: "internal-1", ...row() }]);
    expect(r.fixedHeaders.slice(0, 2)).toEqual(["id", "sku_id"]);
    expect(r.fixedRows[0].sku_id).toBe("MUG-01");
  });

  it("converts availability spellings to TikTok's five values", () => {
    const vals = ["in_stock", "Sold Out", "pre_order", "Available for order", "discontinued"];
    const r = validateAndFixTikTokCatalog(H, vals.map((availability, i) => row({ sku_id: String(i), availability })));
    expect(r.fixedRows.map((x) => x.availability)).toEqual(["in stock", "out of stock", "preorder", "available for order", "discontinued"]);
    expect(codes(validateAndFixTikTokCatalog(H, [row({ availability: "backorder" })]))).toEqual(["tiktok/invalid_availability"]);
  });

  it("requires a brand, and treats a missing currency as a warning", () => {
    const r = validateAndFixTikTokCatalog(H, [row({ brand: "", price: "18.00" })]);
    expect(r.issues.map((i) => [i.code, i.severity])).toEqual([
      ["tiktok/missing_value", "error"],
      ["tiktok/price_missing_currency", "warning"],
    ]);
  });

  it("flags duplicate sku_ids on every row that uses them", () => {
    const r = validateAndFixTikTokCatalog(H, [row(), row()]);
    expect(codes(r)).toEqual(["tiktok/duplicate_id", "tiktok/duplicate_id"]);
  });

  it("flags images on hosts TikTok can't read, and non-JPG/PNG files", () => {
    const drive = validateAndFixTikTokCatalog(H, [row({ image_link: "https://drive.google.com/file/d/abc/view" })]);
    expect(drive.issues[0]).toMatchObject({ code: "tiktok/unsupported_image", severity: "error" });
    const webp = validateAndFixTikTokCatalog(H, [row({ image_link: "https://shop.example.com/mug.webp" })]);
    expect(webp.issues[0]).toMatchObject({ code: "tiktok/unsupported_image", severity: "warning" });
    expect(codes(validateAndFixTikTokCatalog(H, [row({ image_link: "https://cdn.example.com/mug?w=800" })]))).toEqual([]);
  });

  it("flags emoji and offers in titles but not trademark signs", () => {
    expect(codes(validateAndFixTikTokCatalog(H, [row({ title: "Mug 🔥" })]))).toEqual(["tiktok/title_promotional"]);
    expect(codes(validateAndFixTikTokCatalog(H, [row({ title: "Mug - Free Shipping" })]))).toEqual(["tiktok/title_promotional"]);
    expect(codes(validateAndFixTikTokCatalog(H, [row({ title: "Acme™ Mug®" })]))).toEqual([]);
  });

  it("accepts TikTok's age groups with or without their age ranges", () => {
    const h = [...H, "age_group"];
    expect(codes(validateAndFixTikTokCatalog(h, [row({ age_group: "Kids (5-13 years old)" })]))).toEqual([]);
    expect(codes(validateAndFixTikTokCatalog(h, [row({ age_group: "adult" })]))).toEqual([]);
    expect(codes(validateAndFixTikTokCatalog(h, [row({ age_group: "teen" })]))).toEqual(["tiktok/invalid_age_group"]);
  });

  it("caps extra images at 10", () => {
    const urls = Array.from({ length: 11 }, (_, i) => `https://shop.example.com/${i}.jpg`).join(",");
    expect(codes(validateAndFixTikTokCatalog([...H, "additional_image_link"], [row({ additional_image_link: urls })]))).toEqual(["tiktok/too_many_images"]);
  });
});
