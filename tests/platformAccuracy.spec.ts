/**
 * WooCommerce / eBay / Amazon / Etsy accuracy regressions. Each test pins a real-world
 * file shape the fixer used to reject, rewrite, or silently damage.
 */
import { describe, it, expect } from "vitest";
import { processCsvText, resolveFormat } from "@/lib/processCsv";

function run(formatId: string, csv: string) {
  const format = resolveFormat({ kind: "builtin", id: formatId })!;
  return processCsvText(csv.trim(), format, { strictShopify: false });
}
const codes = (res: ReturnType<typeof run>, severity?: string) =>
  res.issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);

describe("WooCommerce", () => {
  const VARIABLE = [
    "Type,SKU,Name,Published,In stock?,Backorders allowed?,Regular price,Parent,Attribute 1 name,Attribute 1 value(s),Attribute 1 global,Meta: _custom",
    'variable,TEE,T-Shirt,-1,1,notify,,,Size,"S, M",1,hello',
    'variation,TEE-S,,1,backorder,notify,"12,50",TEE,Size,S,1,',
    "variation,TEE-M,,1,1,0,13,TEE,Size,M,1,",
  ].join("\n");

  it("accepts a real variable product export without false errors", () => {
    expect(codes(run("woocommerce_products", VARIABLE), "error")).toEqual([]);
  });

  it("keeps the file's columns and never adds blank ones", () => {
    const res = run("woocommerce_products", VARIABLE);
    expect(res.fixedHeaders).toEqual(VARIABLE.split("\n")[0].split(","));
  });

  it("accepts private products, backorder stock status and combined types", () => {
    const res = run("woocommerce_products", "Type,Name,Published,In stock?\n\"simple, virtual\",E-book,-1,backorder");
    expect(res.issues).toEqual([]);
  });

  it("converts European prices", () => {
    expect(run("woocommerce_products", VARIABLE).fixedRows[1]["Regular price"]).toBe("12.50");
  });

  it("flags duplicate variations and variations with several values", () => {
    const res = run(
      "woocommerce_products",
      "Type,SKU,Parent,Attribute 1 name,Attribute 1 value(s)\nvariation,A,TEE,Size,S\nvariation,B,TEE,Size,S\nvariation,C,TEE,Size,\"S, M\""
    );
    expect(codes(res)).toEqual(expect.arrayContaining(["woocommerce/duplicate_variation_combo", "woocommerce/variation_multiple_values"]));
  });
});

describe("eBay", () => {
  const UK = "*Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193)";

  it("keeps the site/currency Action header exactly", () => {
    const res = run("ebay_listings", `${UK},*Category,*Title,*ConditionID,*Format,*Duration,*StartPrice,*Quantity\nAdd,15687,Shirt,1000,FixedPrice,GTC,9.99,1`);
    expect(res.fixedHeaders[0]).toBe(UK);
    expect(res.issues).toEqual([]);
  });

  it("validates parent/child variation listings", () => {
    const res = run(
      "ebay_variations",
      [
        `${UK},CustomLabel,*Category,*Title,*ConditionID,*StartPrice,*Quantity,Relationship,RelationshipDetails`,
        "Add,TEE,15687,Band Tee,1000,,,,Color=Blue;Red|Size=M;L",
        ",TEE-BM,,,,12.50,3,Variation,Color=Blue|Size=M",
        ",TEE-RL,,,,13.00,2,Variation,Color=Red|Size=L",
      ].join("\n")
    );
    expect(res.issues).toEqual([]);
  });

  it("flags undeclared and duplicate variation values", () => {
    const res = run(
      "ebay_variations",
      [
        `${UK},*Title,*Category,*StartPrice,*Quantity,Relationship,RelationshipDetails`,
        "Add,Tee,15687,,,,Color=Blue|Size=M",
        ",,,10,1,Variation,Color=Blue|Size=M",
        ",,,10,1,Variation,Color=Blue|Size=M",
        ",,,10,1,Variation,Color=Green|Size=M",
      ].join("\n")
    );
    expect(codes(res)).toEqual(expect.arrayContaining(["ebay/duplicate_variation_combo", "ebay/variation_value_not_in_parent"]));
  });

  it("only requires an ItemID for Revise and End rows", () => {
    const res = run("ebay_listings", `${UK},ItemID,*StartPrice\nRevise,123456789012,8.99\nEnd,123456789013,`);
    expect(codes(res, "error")).toEqual([]);
  });

  it("converts condition names and accepts all current condition IDs", () => {
    const res = run("ebay_listings", `${UK},*Title,*Category,*StartPrice,*Quantity,*ConditionID\nAdd,A,1,1,1,Used\nAdd,B,1,1,1,2990\nAdd,C,1,1,1,3010`);
    expect(res.fixedRows[0]["*ConditionID"]).toBe("3000");
    expect(res.issues).toEqual([]);
  });
});

describe("Amazon Inventory Loader", () => {
  it("accepts numeric product-id-type codes and keeps fulfillment-center-id", () => {
    const res = run("amazon_inventory_loader", "sku,product-id,product-id-type,price,quantity,fulfillment-center-id\nA-1,B08XYZABCD,1,19.99,5,AMAZON_EU");
    expect(res.issues).toEqual([]);
    expect(res.fixedHeaders).toContain("fulfillment-center-id");
  });

  it("does not require item-name or rename category template columns", () => {
    const res = run("amazon_inventory_loader", "item_sku,external_product_id,external_product_id_type,standard_price,quantity\nA-1,012345678905,UPC,10,1");
    expect(res.issues).toEqual([]);
    expect(res.fixedHeaders[0]).toBe("item_sku");
  });

  it("catches barcodes damaged by spreadsheets", () => {
    const res = run("amazon_inventory_loader", "sku,product-id,product-id-type,price,quantity\nA,1.23457E+11,3,1,1\nB,01234567890,3,1,1");
    expect(codes(res)).toEqual(["amazon/product_id_scientific_notation", "amazon/invalid_product_id"]);
  });
});

describe("Etsy", () => {
  it("keeps Etsy's export headers and checks IMAGE columns and quantity limit", () => {
    const res = run("etsy_listings", "TITLE,PRICE,CURRENCY_CODE,QUANTITY,IMAGE1\nWallet,\"45,00\",EUR,1200,not-a-url");
    expect(res.fixedHeaders).toEqual(["TITLE", "PRICE", "CURRENCY_CODE", "QUANTITY", "IMAGE1"]);
    expect(res.fixedRows[0]["PRICE"]).toBe("45.00");
    expect(codes(res)).toEqual(expect.arrayContaining(["etsy/quantity_too_high", "etsy/invalid_image_url"]));
  });

  it("does not silently truncate fractional quantities", () => {
    const res = run("etsy_listings", "Title,Price,Quantity\nBelt,20,5.5");
    expect(res.fixedRows[0]["Quantity"]).toBe("5.5");
    expect(codes(res)).toContain("etsy/invalid_quantity");
  });
});
