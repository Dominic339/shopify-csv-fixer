// Converting a store export to a Merchant Center feed: the result must pass the
// Merchant Center preset's own checks, and every warning must be translatable.
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { convertCsv, normalizeStoreUrl, type ConvertOptions } from "@/lib/convertCsv";
import { SAMPLE_EXPORTS } from "@/lib/convertRoutes";
import { validateAndFixGoogleMerchant } from "@/lib/googleMerchantOptimizer";
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

  it("normalizes store addresses", () => {
    expect(normalizeStoreUrl("shop.example.com/")).toBe("https://shop.example.com");
    expect(normalizeStoreUrl("http://example.com/store/")).toBe("http://example.com/store");
    expect(normalizeStoreUrl("not a url")).toBe("");
    expect(normalizeStoreUrl("localhost")).toBe("");
  });
});
