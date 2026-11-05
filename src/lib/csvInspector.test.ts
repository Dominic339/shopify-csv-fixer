import { describe, expect, it } from "vitest";
import { detectPlatform } from "./csvInspector";

const FEED = ["id", "title", "description", "availability", "price", "link", "image_link"];

describe("detectPlatform: Google and Meta feeds", () => {
  it("reads a feed with Google's in_stock as Merchant Center", () => {
    expect(detectPlatform(FEED, [["1", "Mug", "A mug", "in_stock", "9 USD", "https://a.b/p", "https://a.b/i.jpg"]])).toBe("google_merchant_center");
  });

  it("reads Meta's in stock, or a Meta-only column, as a Meta catalog", () => {
    expect(detectPlatform(FEED, [["1", "Mug", "A mug", "in stock", "9 USD", "https://a.b/p", "https://a.b/i.jpg"]])).toBe("meta_catalog");
    expect(detectPlatform([...FEED, "fb_product_category"])).toBe("meta_catalog");
  });

  it("falls back to Merchant Center from the headers alone", () => {
    expect(detectPlatform(FEED)).toBe("google_merchant_center");
  });
});
