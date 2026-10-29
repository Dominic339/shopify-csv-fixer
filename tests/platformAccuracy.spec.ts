/**
 * WooCommerce / eBay / Amazon / Etsy accuracy regressions. Each test pins a real-world
 * file shape the fixer used to reject, rewrite, or silently damage.
 */
import { describe, it, expect } from "vitest";
import { processCsvText, resolveFormat } from "@/lib/processCsv";
import { exportFileFor, parseCsv } from "@/lib/csv";

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

describe("eBay Seller Hub templates", () => {
  const US = "*Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)";

  it("reads the header below eBay's INFO lines and keeps them for export", () => {
    const csv = [
      "\u00ef\u00bb\u00bf#INFO,Version=1.0.0,Template=fx_category_template_EBAY_US,,",
      "#INFO Action and Category ID are required fields,,,,",
      `${US},*Category,*Title,*StartPrice,*Quantity`,
      "Add,15687,Band Tee,12.50,3",
    ].join("\n");
    const parsed = parseCsv(csv);
    expect(parsed.preamble).toEqual(["#INFO,Version=1.0.0,Template=fx_category_template_EBAY_US,,", "#INFO Action and Category ID are required fields,,,,"]);
    const res = run("ebay_listings", csv);
    expect(res.fixedHeaders[0]).toBe(US);
    expect(codes(res, "error")).toEqual([]);
    const out = exportFileFor("ebay_listings", res.fixedHeaders, res.fixedRows, parsed.preamble).text;
    expect(out.startsWith("#INFO,Version=1.0.0,Template=fx_category_template_EBAY_US,,\r\n#INFO Action")).toBe(true);
  });

  it("accepts the drafts template (Action=Draft, only Category required)", () => {
    const res = run("ebay_listings", "Action(SiteID=US|Country=US|Currency=USD|Version=1193),Custom label (SKU),Category ID,Title,Condition ID,Item photo URL\nDraft,MUG-01,20625,,New,https://example.com/mug one.jpg\nDraft,MUG-02,,,,");
    expect(res.issues.map((i) => [i.rowIndex, i.code])).toEqual([[1, "ebay/missing_category_id"]]);
    expect(res.fixedRows[0]["Condition ID"]).toBe("1000");
    expect(res.fixedRows[0]["Item photo URL"]).toBe("https://example.com/mug%20one.jpg");
  });

  it("flags item numbers and UPCs in scientific notation", () => {
    const res = run("ebay_listings", `${US},Item number,P:UPC,*StartPrice\nRevise,1.23457E+11,012345678905,9.99\nRevise,123456789012,1.23457E+11,9.99`);
    expect(res.issues.map((i) => [i.rowIndex, i.column, i.code])).toEqual([
      [0, "Item number", "ebay/number_in_scientific_notation"],
      [1, "P:UPC", "ebay/number_in_scientific_notation"],
    ]);
  });

  it("converts eBay's own condition names", () => {
    const res = run("ebay_listings", `${US},*Title,*Category,*StartPrice,*Quantity,*ConditionID\nAdd,A,1,1,1,Open box\nAdd,B,1,1,1,Pre-owned - Fair\nAdd,C,1,1,1,New with tags`);
    expect(res.fixedRows.map((r) => r["*ConditionID"])).toEqual(["1500", "3010", "1000"]);
  });
});

describe("Amazon Inventory Loader", () => {
  it("accepts numeric product-id-type codes and keeps fulfillment-center-id", () => {
    const res = run("amazon_inventory_loader", "sku,product-id,product-id-type,price,quantity,fulfillment-center-id\nA-1,B08XYZABCD,1,19.99,,AMAZON_EU");
    expect(res.issues).toEqual([]);
    expect(res.fixedHeaders).toContain("fulfillment-center-id");
  });

  it("does not require item-name or rename category template columns", () => {
    const res = run("amazon_inventory_loader", "item_sku,external_product_id,external_product_id_type,standard_price,quantity\nA-1,012345678905,UPC,10,1");
    expect(res.issues).toEqual([]);
    expect(res.fixedHeaders[0]).toBe("item_sku");
  });

  it("converts type and condition names to the codes Inventory Loader requires", () => {
    const res = run("amazon_inventory_loader", "sku,product-id,product-id-type,price,item-condition,quantity,add-delete\nA,B08XYZABCD,ASIN,10,New,1,a\nB,012345678905,upc,10,Used; Like New,1,a");
    expect(res.issues).toEqual([]);
    expect(res.fixedRows.map((r) => [r["product-id-type"], r["item-condition"]])).toEqual([["1", "11"], ["3", "1"]]);
  });

  it("checks the price against the seller-allowed range", () => {
    const res = run(
      "amazon_inventory_loader",
      "sku,product-id,product-id-type,price,minimum-seller-allowed-price,maximum-seller-allowed-price,quantity\nA,B08XYZABCD,1,12,15,10,1\nB,B08XYZABCE,1,9,10,20,1\nC,B08XYZABCF,1,15,10,20,1"
    );
    expect(res.issues.map((i) => [i.rowIndex, i.code])).toEqual([
      [0, "amazon/min_above_max_price"],
      [1, "amazon/price_outside_allowed_range"],
    ]);
  });

  it("catches barcodes damaged by spreadsheets", () => {
    const res = run("amazon_inventory_loader", "sku,product-id,product-id-type,price,quantity\nA,1.23457E+11,3,1,1\nB,01234567890,3,1,1");
    expect(codes(res)).toEqual(["amazon/product_id_scientific_notation", "amazon/invalid_product_id"]);
  });

  // Amazon's Inventory Loader guide: will-ship-internationally takes 1/n (US only) or
  // 2/y (international); expedited-shipping lists Next, Second, Domestic, International,
  // Plus separated by commas, or N for none.
  it("accepts every documented shipping value", () => {
    const res = run(
      "amazon_inventory_loader",
      "sku,product-id,product-id-type,price,quantity,will-ship-internationally,expedited-shipping\nA,B08XYZABCD,1,10,1,2,\"Next,Second\"\nB,B08XYZABCE,1,10,1,1,N\nC,B08XYZABCF,1,10,1,Y,\"domestic, international\"\nD,B08XYZABCG,1,10,1,n,"
    );
    expect(codes(res)).toEqual([]);
  });

  it("accepts delete in the min/max price columns and flags 0", () => {
    const res = run(
      "amazon_inventory_loader",
      "sku,product-id,product-id-type,price,minimum-seller-allowed-price,maximum-seller-allowed-price,quantity\nA,B08XYZABCD,1,10,delete,DELETE,1\nB,B08XYZABCE,1,10,0,,1"
    );
    expect(res.issues.map((i) => [i.rowIndex, i.column, i.code])).toEqual([[1, "minimum-seller-allowed-price", "amazon/invalid_price"]]);
    expect(res.fixedRows[0]["minimum-seller-allowed-price"]).toBe("delete");
  });

  it("flags a quantity on an FBA offer and condition code 9", () => {
    const res = run(
      "amazon_inventory_loader",
      "sku,product-id,product-id-type,price,quantity,item-condition,fulfillment-center-id\nA,B08XYZABCD,1,10,5,11,AMAZON_NA\nB,B08XYZABCE,1,10,5,9,DEFAULT"
    );
    expect(res.issues.map((i) => [i.rowIndex, i.code])).toEqual([
      [0, "amazon/quantity_on_fba_offer"],
      [1, "amazon/invalid_item_condition"],
    ]);
  });

  it("flags yes/no words in the shipping fields", () => {
    const res = run(
      "amazon_inventory_loader",
      "sku,product-id,product-id-type,price,quantity,will-ship-internationally,expedited-shipping\nA,B08XYZABCD,1,10,1,yes,y\nB,B08XYZABCE,1,10,1,3,\"Next,Standard\""
    );
    expect(res.issues.map((i) => [i.rowIndex, i.column, i.code])).toEqual([
      [0, "will-ship-internationally", "amazon/invalid_boolean_field"],
      [0, "expedited-shipping", "amazon/invalid_expedited_shipping"],
      [1, "will-ship-internationally", "amazon/invalid_boolean_field"],
      [1, "expedited-shipping", "amazon/invalid_expedited_shipping"],
    ]);
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
