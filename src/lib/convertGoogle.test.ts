// Converting a store export to a Merchant Center feed: the result must pass the
// Merchant Center preset's own checks, and every warning must be translatable.
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { convertCsv, normalizeStoreUrl, type ConvertOptions } from "@/lib/convertCsv";
import { SAMPLE_EXPORTS } from "@/lib/convertRoutes";
import { validateAndFixGoogleMerchant } from "@/lib/googleMerchantOptimizer";
import { validateAndFixMetaCatalog } from "@/lib/metaCatalogOptimizer";
import { validateAndFixTikTokCatalog } from "@/lib/tiktokCatalogOptimizer";
import { matchTemplate } from "@/lib/i18n/messages";

const options = { storeUrl: "shop.example.com/", currency: "USD" };

function convert(source: string, opts: ConvertOptions = options) {
  const { headers, rows } = parseCsv(SAMPLE_EXPORTS[source]);
  return convertCsv(headers, rows, source, "google_merchant_center", null, opts);
}

describe("convert to Google Merchant Center", () => {
  for (const source of ["shopify_products", "woocommerce_products"]) {
    it(`${source}: the feed has no blocking problems`, () => {
      const out = convert(source);
      const checked = validateAndFixGoogleMerchant(out.headers, out.rows);
      expect(checked.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(out.warnings.every((w) => matchTemplate(w))).toBe(true);
    });
  }

  it("links each Shopify product to /products/<handle> and keeps variants grouped", () => {
    const out = convert("shopify_products");
    const beanie = out.rows.filter((r) => r.item_group_id === "merino-beanie");
    expect(beanie).toHaveLength(2);
    expect(beanie[0].link).toBe("https://shop.example.com/products/merino-beanie");
    expect(beanie.map((r) => r.color)).toEqual(["Grey", "Navy"]);
  });

  it("puts the regular price in price and a lower current price in sale_price", () => {
    const navy = convert("shopify_products").rows.find((r) => r.id === "BEANIE-NVY")!;
    expect(navy.price).toBe("38.00 USD");
    expect(navy.sale_price).toBe("32.00 USD");
  });

  it("marks variants without stock out_of_stock", () => {
    const large = convert("woocommerce_products").rows.find((r) => r.id === "TEE-L")!;
    expect(large.availability).toBe("out_of_stock");
    expect(large.link).toBe("https://shop.example.com/product/organic-cotton-tee");
  });

  it("says what is missing when the store address and currency aren't given", () => {
    const out = convert("shopify_products", {});
    expect(out.rows[0].link).toBe("");
    expect(out.rows[0].price).toBe("32.00");
    expect(out.warnings.some((w) => w.startsWith("Prices have no currency code"))).toBe(true);
    expect(out.warnings.some((w) => w.startsWith("link is blank."))).toBe(true);
  });

  it("builds links from a pattern with {handle} or {sku}", () => {
    const out = convert("woocommerce_products", { storeUrl: "shop.example.com/p/{sku}", currency: "USD" });
    expect(out.rows.find((r) => r.id === "TEE-M")!.link).toBe("https://shop.example.com/p/TEE-M");
    expect(out.warnings[1]).toBe("Each link was built from the pattern https://shop.example.com/p/{sku}. Open a few to check they reach the right product page.");
    expect(out.warnings.every((w) => matchTemplate(w))).toBe(true);
  });

  it("keeps Amazon and eBay item conditions", () => {
    const { headers, rows } = parseCsv(["sku\tprice\titem-condition\titem-name", "A1\t10\t11\tNew mug", "A2\t8\t2\tUsed mug", "A3\t9\t10\tRenewed mug"].join("\n"));
    const out = convertCsv(headers, rows, "amazon_inventory_loader", "google_merchant_center", null, options);
    expect(out.rows.map((r) => r.condition)).toEqual(["new", "used", "refurbished"]);
    expect(out.warnings.some((w) => w.startsWith("condition is set to new"))).toBe(false);
    const ebay = convert("ebay_listings");
    expect(ebay.rows.every((r) => r.condition === "new")).toBe(true);
  });

  it("normalizes store addresses", () => {
    expect(normalizeStoreUrl("shop.example.com/")).toBe("https://shop.example.com");
    expect(normalizeStoreUrl("http://example.com/store/")).toBe("http://example.com/store");
    expect(normalizeStoreUrl("not a url")).toBe("");
    expect(normalizeStoreUrl("localhost")).toBe("");
  });

  for (const source of ["shopify_products", "woocommerce_products"]) {
    it(`${source} to Meta: availability uses Meta's spelling and the feed has no blocking problems`, () => {
      const { headers, rows } = parseCsv(SAMPLE_EXPORTS[source]);
      const out = convertCsv(headers, rows, source, "meta_catalog", null, options);
      expect(new Set(out.rows.map((r) => r.availability))).toEqual(new Set(source === "shopify_products" ? ["in stock"] : ["in stock", "out of stock"]));
      const checked = validateAndFixMetaCatalog(out.headers, out.rows);
      // WooCommerce exports have no brand, so Meta's brand/gtin/mpn rule is the only error left there.
      const errors = new Set(checked.issues.filter((i) => i.severity === "error").map((i) => i.code));
      expect([...errors]).toEqual(source === "shopify_products" ? [] : ["meta/missing_identifier"]);
      expect(out.warnings.every((w) => matchTemplate(w))).toBe(true);
    });
  }

  for (const source of ["shopify_products", "woocommerce_products"]) {
    it(`${source} to TikTok: sku_id column, TikTok's availability, and no blocking problems beyond brand`, () => {
      const { headers, rows } = parseCsv(SAMPLE_EXPORTS[source]);
      const out = convertCsv(headers, rows, source, "tiktok_catalog", null, options);
      expect(out.headers[0]).toBe("sku_id");
      expect(out.headers).not.toContain("id");
      expect(out.rows.every((r) => r.sku_id)).toBe(true);
      const checked = validateAndFixTikTokCatalog(out.headers, out.rows);
      const errors = new Set(checked.issues.filter((i) => i.severity === "error").map((i) => i.code));
      // WooCommerce exports have no brand, which TikTok requires; the converter warns about it.
      expect([...errors]).toEqual(source === "shopify_products" ? [] : ["tiktok/missing_value"]);
      if (source !== "shopify_products") expect(out.warnings.some((w) => w.includes("TikTok requires a brand"))).toBe(true);
      expect(out.warnings.every((w) => matchTemplate(w))).toBe(true);
    });
  }
});
