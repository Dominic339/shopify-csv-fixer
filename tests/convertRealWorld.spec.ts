/**
 * Converter accuracy against exports shaped like the real ones each platform produces:
 * full header sets, HTML with commas and quotes, multi-option variants, extra image rows,
 * WooCommerce's escapes, Etsy's HTML entities, Amazon's tab-separated reports.
 */
import { describe, it, expect } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";
import { convertCsv, decodeEntities, htmlToText, textToHtml } from "@/lib/convertCsv";
import { decodeBytes } from "@/lib/textFile";

const run = (csv: string, from: string, to: string) => {
  const { headers, rows } = parseCsv(csv);
  return convertCsv(headers, rows, from, to);
};

// Shopify's legacy export (still what most stores download), two options, an extra image row.
const SHOPIFY_LEGACY = [
  "Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Variant Image,Variant Weight Unit,Cost per item,Status",
  'trail-jacket,Trail Jacket,"<p>Windproof, packable &amp; ""ready"" for rain.</p>\n<ul><li>Recycled nylon</li><li>Hood</li></ul>",Northwind,Apparel & Accessories > Clothing,Jackets,"outdoor, rain",TRUE,Color,Blue,Size,M,,,TJ-BLU-M,420,shopify,5,deny,manual,119.00,149.00,TRUE,TRUE,0012345678905,https://cdn.example.com/jacket-blue.jpg,1,Blue jacket,FALSE,Trail Jacket | Northwind,Light rain shell,https://cdn.example.com/jacket-blue.jpg,g,52.00,active',
  "trail-jacket,,,,,,,,,Blue,,L,,,TJ-BLU-L,430,shopify,0,continue,manual,119.00,149.00,TRUE,TRUE,0012345678912,https://cdn.example.com/jacket-back.jpg,2,Back,,,,,g,52.00,",
  "trail-jacket,,,,,,,,,Red,,M,,,TJ-RED-M,420,shopify,3,deny,manual,125.00,,TRUE,TRUE,,,,,,,,https://cdn.example.com/jacket-red.jpg,g,52.00,",
  "trail-jacket,,,,,,,,,,,,,,,,,,,,,,,,,https://cdn.example.com/jacket-detail.jpg,3,Detail,,,,,,,",
  "gift-wrap,Gift Wrap,Recycled paper.,Northwind,,Extras,,FALSE,Title,Default Title,,,,,GW-1,0,,,deny,manual,4.50,,FALSE,TRUE,,,,,FALSE,,,,g,,draft",
].join("\n");

// A WooCommerce 8 export: full header set, Parent as id:NNN, escaped line breaks and commas.
const WOO_EXPORT = [
  'ID,Type,SKU,"GTIN, UPC, EAN, or ISBN",Name,Published,"Is featured?","Visibility in catalog","Short description",Description,"Date sale price starts","Date sale price ends","Tax status","Tax class","In stock?",Stock,"Low stock amount","Backorders allowed?","Sold individually?","Weight (kg)","Length (cm)","Width (cm)","Height (cm)","Allow customer reviews?","Purchase note","Sale price","Regular price",Categories,Tags,"Shipping class",Images,"Download limit","Download expiry days",Parent,"Grouped products",Upsells,Cross-sells,"External URL","Button text",Position,"Attribute 1 name","Attribute 1 value(s)","Attribute 1 visible","Attribute 1 global","Attribute 2 name","Attribute 2 value(s)","Attribute 2 visible","Attribute 2 global"',
  '101,variable,HOODIE,,"Logo Hoodie, Heavyweight",1,0,visible,"Warm hoodie","Brushed fleece.\\n\\nMachine wash cold.",,,taxable,,1,,,0,0,0.65,,,,1,,,,"Clothing > Hoodies, Sale","fleece, winter\\, warm",,"https://shop.example.com/hoodie-1.jpg, https://shop.example.com/hoodie-2.jpg",,,,,,,,,0,Color,"Black, Grey",1,1,Size,"S, M",1,1',
  '102,variation,HOODIE-BLK-S,,"Logo Hoodie, Heavyweight - Black, S",1,0,visible,,,,,taxable,parent,1,7,,0,0,0.6,,,,0,,,55,,,,https://shop.example.com/hoodie-black.jpg,,,id:101,,,,,,1,Color,Black,,1,Size,S,,1',
  '103,variation,HOODIE-BLK-M,,"Logo Hoodie, Heavyweight - Black, M",1,0,visible,,,,,taxable,parent,1,0,,notify,0,0.65,,,,0,,45,55,,,,,,,id:101,,,,,,2,Color,Black,,1,Size,M,,1',
  '104,variation,HOODIE-GRY-M,,"Logo Hoodie, Heavyweight - Grey, M",1,0,visible,,,,,taxable,parent,1,4,,0,0,0.65,,,,0,,,55,,,,,,,id:101,,,,,,3,Color,Grey,,1,Size,M,,1',
  '110,simple,STICKER,4006381333931,Sticker,0,0,visible,,Vinyl sticker.,,,none,,1,100,,0,0,0.01,,,,1,,,3.5,Extras,,,,,,,,,,,,0,,,,,,,,',
].join("\n");

// Etsy's "Currently for Sale Listings" download, with the entities Etsy puts in it.
const ETSY_EXPORT = [
  "TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,IMAGE2,IMAGE3,IMAGE4,IMAGE5,IMAGE6,IMAGE7,IMAGE8,IMAGE9,IMAGE10,VARIATION 1 TYPE,VARIATION 1 NAME,VARIATION 1 VALUES,VARIATION 2 TYPE,VARIATION 2 NAME,VARIATION 2 VALUES,SKU",
  '"Mom&#39;s Recipe Box &amp; Cards","Solid oak box.\n\nHolds 200 cards.\nFree engraving.",45.00,USD,8,"recipe box,kitchen gift,mother&#39;s day",oak,https://i.etsystatic.com/a/1.jpg,https://i.etsystatic.com/a/2.jpg,,,,,,,,,Size,Size,"Small,Large",,,,BOX-OAK',
].join("\n");

// Amazon's All Listings Report (tab-separated).
const AMAZON_ALL_LISTINGS = [
  "item-name\titem-description\tlisting-id\tseller-sku\tprice\tquantity\topen-date\timage-url\titem-is-marketplace\tproduct-id-type\tzshop-shipping-fee\titem-note\titem-condition\tzshop-category1\tzshop-browse-path\tzshop-storefront-feature\tasin1\tasin2\tasin3\twill-ship-internationally\texpedited-shipping\tzshop-boldface\tproduct-id\tbid-for-featured-placement\tadd-delete\tpending-quantity\tfulfillment-channel\tmerchant-shipping-group\tstatus",
  "Ceramic Pour-Over Coffee Dripper &amp; Filter Set\tDishwasher safe.\t0101ABCDEF\tPOUR-01\t32.00\t15\t2025-01-10 10:00:00 PST\thttps://m.media-amazon.com/images/I/pour.jpg\ty\t1\t\t\t11\t\t\t\tB0ABCDEFGH\t\t\t\t\t\tB0ABCDEFGH\t\t\t0\tDEFAULT\tMigrated Template\tActive",
  "Paper Filters (100 pack)\t\t0101ABCDEG\tFILT-100\t8,50\t200\t2025-01-10 10:00:00 PST\t\ty\t3\t\t\t11\t\t\t\tB0ABCDEFGJ\t\t\t\t\t\t012345678905\t\t\t0\tDEFAULT\tMigrated Template\tActive",
].join("\n");

describe("Shopify legacy export → other platforms", () => {
  it("→ WooCommerce: one variable product with every option, sale prices and grams to kg", () => {
    const out = run(SHOPIFY_LEGACY, "shopify_products", "woocommerce_products");
    const parent = out.rows.find((r) => r.Type === "variable")!;
    const vars = out.rows.filter((r) => r.Type === "variation");
    expect(parent.Name).toBe("Trail Jacket");
    expect(parent["Attribute 1 name"]).toBe("Color");
    expect(parent["Attribute 1 value(s)"]).toBe("Blue, Red");
    expect(parent["Attribute 2 name"]).toBe("Size");
    expect(parent["Attribute 2 value(s)"]).toBe("M, L");
    expect(vars).toHaveLength(3);
    const blueM = vars.find((r) => r.SKU === "TJ-BLU-M")!;
    expect(blueM["Regular price"]).toBe("149.00");
    expect(blueM["Sale price"]).toBe("119.00");
    expect(blueM["Weight (kg)"]).toBe("0.42");
    expect(blueM["GTIN, UPC, EAN, or ISBN"]).toBe("0012345678905");
    expect(blueM.Parent).toBe(parent.SKU);
    const blueL = vars.find((r) => r.SKU === "TJ-BLU-L")!;
    expect(blueL["Backorders allowed?"]).toBe("1");
    expect(parent.Images.split(", ")).toEqual([
      "https://cdn.example.com/jacket-blue.jpg",
      "https://cdn.example.com/jacket-back.jpg",
      "https://cdn.example.com/jacket-detail.jpg",
    ]);
    expect(parent.Description).toContain('"ready"');
    const wrap = out.rows.find((r) => r.SKU === "GW-1")!;
    expect(wrap.Type).toBe("simple");
    expect(wrap.Published).toBe("0");
  });

  it("→ Etsy: plain-text description, lowest price, combined stock", () => {
    const out = run(SHOPIFY_LEGACY, "shopify_products", "etsy_listings");
    const jacket = out.rows.find((r) => r.TITLE === "Trail Jacket")!;
    expect(jacket.DESCRIPTION).not.toMatch(/<[a-z]/i);
    expect(jacket.DESCRIPTION).toContain('Windproof, packable & "ready" for rain.');
    expect(jacket.DESCRIPTION).toContain("• Recycled nylon");
    expect(jacket.PRICE).toBe("119.00");
    expect(jacket.QUANTITY).toBe("8");
    expect(jacket.IMAGE3).toBe("https://cdn.example.com/jacket-detail.jpg");
  });

  it("→ eBay: a multi-variation listing with two dimensions", () => {
    const out = run(SHOPIFY_LEGACY, "shopify_products", "ebay_listings");
    const parent = out.rows.find((r) => r["*Title"] === "Trail Jacket")!;
    expect(parent.RelationshipDetails).toBe("Color=Blue;Red|Size=M;L");
    const vars = out.rows.filter((r) => r.Relationship === "Variation");
    expect(vars.map((v) => v.RelationshipDetails)).toEqual(["Color=Blue|Size=M", "Color=Blue|Size=L", "Color=Red|Size=M"]);
    expect(vars[0]["*StartPrice"]).toBe("119.00");
  });

  it("→ Amazon: one offer per variant, barcode kept with its leading zeros", () => {
    const out = run(SHOPIFY_LEGACY, "shopify_products", "amazon_inventory_loader");
    const offer = out.rows.find((r) => r.sku === "TJ-BLU-M")!;
    expect(offer["product-id"]).toBe("0012345678905");
    expect(offer["product-id-type"]).toBe("4");
    expect(out.rows).toHaveLength(4);
  });
});

describe("WooCommerce export → Shopify", () => {
  const out = run(WOO_EXPORT, "woocommerce_products", "shopify_products");
  const hoodie = out.rows.filter((r) => r["URL handle"] === "logo-hoodie-heavyweight");

  it("groups variations under the parent found by id:NNN", () => {
    expect(hoodie.filter((r) => r.SKU)).toHaveLength(3);
    expect(hoodie[0].Title).toBe("Logo Hoodie, Heavyweight");
    expect(hoodie[0]["Option1 name"]).toBe("Color");
    expect(hoodie[0]["Option2 name"]).toBe("Size");
    expect(hoodie.map((r) => [r["Option1 value"], r["Option2 value"]]).filter(([a]) => a)).toEqual([
      ["Black", "S"],
      ["Black", "M"],
      ["Grey", "M"],
    ]);
  });

  it("turns WooCommerce's escaped line breaks into paragraphs", () => {
    expect(hoodie[0].Description).toBe("<p>Brushed fleece.</p><p>Machine wash cold.</p>");
  });

  it("keeps escaped commas inside a tag", () => {
    expect(hoodie[0].Tags).toBe("fleece, winter, warm");
  });

  it("maps sale prices, backorders and weights", () => {
    const m = hoodie.find((r) => r.SKU === "HOODIE-BLK-M")!;
    expect(m.Price).toBe("45.00");
    expect(m["Compare-at price"]).toBe("55.00");
    expect(m["Continue selling when out of stock"]).toBe("continue");
    expect(m["Weight value (grams)"]).toBe("650");
  });

  it("uses the last level of the first category as the type", () => {
    expect(hoodie[0].Type).toBe("Hoodies");
  });

  it("keeps the barcode and draft status of a simple product", () => {
    const s = out.rows.find((r) => r.SKU === "STICKER")!;
    expect(s.Barcode).toBe("4006381333931");
    expect(s.Status).toBe("draft");
    expect(s["Charge tax"]).toBe("false");
  });
});

describe("Etsy export → Shopify / WooCommerce", () => {
  it("decodes Etsy's HTML entities and keeps paragraphs", () => {
    const out = run(ETSY_EXPORT, "etsy_listings", "shopify_products");
    const p = out.rows[0];
    expect(p.Title).toBe("Mom's Recipe Box & Cards");
    expect(p.Tags).toBe("recipe box, kitchen gift, mother's day");
    expect(p.Description).toBe("<p>Solid oak box.</p><p>Holds 200 cards.<br>Free engraving.</p>");
    expect(out.rows.filter((r) => r["Product image URL"])).toHaveLength(2);
    expect(out.warnings.some((w) => w.includes("variation"))).toBe(true);
  });

  it("→ WooCommerce gives a simple product with both images", () => {
    const out = run(ETSY_EXPORT, "etsy_listings", "woocommerce_products");
    expect(out.rows[0].Type).toBe("simple");
    expect(out.rows[0].Images).toBe("https://i.etsystatic.com/a/1.jpg, https://i.etsystatic.com/a/2.jpg");
    expect(out.rows[0]["Regular price"]).toBe("45.00");
  });
});

describe("Amazon All Listings Report → Shopify", () => {
  const out = run(AMAZON_ALL_LISTINGS, "amazon_inventory_loader", "shopify_products");

  it("reads the tab-separated report", () => {
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].Title).toBe("Ceramic Pour-Over Coffee Dripper & Filter Set");
    expect(out.rows[0].SKU).toBe("POUR-01");
  });

  it("does not put an ASIN in Shopify's barcode, but keeps a UPC", () => {
    expect(out.rows[0].Barcode ?? "").toBe("");
    expect(out.rows[1].Barcode).toBe("012345678905");
  });

  it("normalises a comma-decimal price", () => {
    expect(out.rows[1].Price).toBe("8.50");
  });
});

describe("round trips keep the catalogue intact", () => {
  it("Shopify → WooCommerce → Shopify keeps SKUs, prices, stock and options", () => {
    const woo = run(SHOPIFY_LEGACY, "shopify_products", "woocommerce_products");
    const back = run(toCsv(woo.headers, woo.rows), "woocommerce_products", "shopify_products");
    const variants = (rows: Record<string, string>[]) =>
      rows
        .filter((r) => r.SKU || r["Variant SKU"])
        .map((r) => [r.SKU ?? r["Variant SKU"], r.Price ?? r["Variant Price"], r["Compare-at price"] ?? r["Variant Compare At Price"] ?? "", r["Inventory quantity"] ?? r["Variant Inventory Qty"]])
        .sort();
    const original = run(SHOPIFY_LEGACY, "shopify_products", "shopify_products");
    expect(variants(back.rows)).toEqual(variants(original.rows));
  });

  it("Shopify → eBay → Shopify keeps variants and their options", () => {
    const ebay = run(SHOPIFY_LEGACY, "shopify_products", "ebay_listings");
    const back = run(toCsv(ebay.headers, ebay.rows), "ebay_listings", "shopify_products");
    const opts = back.rows.filter((r) => r["Option1 value"] && r["Option1 value"] !== "Default Title").map((r) => `${r.SKU}:${r["Option1 value"]}/${r["Option2 value"]}`);
    expect(opts).toEqual(["TJ-BLU-M:Blue/M", "TJ-BLU-L:Blue/L", "TJ-RED-M:Red/M"]);
  });
});

describe("Etsy limits", () => {
  it("keeps at most 13 tags of up to 20 characters", () => {
    const tags = Array.from({ length: 16 }, (_, i) => `tag${i}`).concat("a tag that is far too long for etsy").join(", ");
    const csv = `Title,URL handle,Tags,Price,SKU\nThing,thing,"${tags}",10,T-1`;
    const out = run(csv, "shopify_products", "etsy_listings");
    const kept = out.rows[0].TAGS.split(",");
    expect(kept).toHaveLength(13);
    expect(kept.every((x) => x.length <= 20)).toBe(true);
    expect(out.warnings.some((w) => w.includes("13 tags"))).toBe(true);
  });
});

describe("text helpers", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Mom&#39;s &amp; Dad&#x2019;s &quot;best&quot;")).toBe("Mom's & Dad’s \"best\"");
  });
  it("leaves plain text alone and converts HTML to text", () => {
    expect(htmlToText("Just text, 2 < 3")).toBe("Just text, 2 < 3");
    expect(htmlToText("<p>One</p><p>Two<br>Three</p>")).toBe("One\n\nTwo\nThree");
  });
  it("turns plain paragraphs into HTML, escaping markup characters", () => {
    expect(textToHtml("A & B\n\nC < D")).toBe("<p>A &amp; B</p><p>C &lt; D</p>");
    expect(textToHtml("single line")).toBe("single line");
  });
});

describe("file decoding", () => {
  it("reads UTF-8, UTF-8 with BOM, UTF-16 and Windows-1252", () => {
    const utf8 = new TextEncoder().encode("Café,Naïve");
    expect(decodeBytes(utf8).text).toBe("Café,Naïve");
    expect(decodeBytes(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8])).text).toBe("Café,Naïve");
    const cp1252 = new Uint8Array([0x43, 0x61, 0x66, 0xe9, 0x2c, 0x80, 0x35]); // "Café,€5"
    const d = decodeBytes(cp1252);
    expect(d.encoding).toBe("windows-1252");
    expect(d.text).toBe("Café,€5");
    const utf16 = new Uint8Array([0xff, 0xfe, 0x43, 0x00, 0xe9, 0x00]);
    expect(decodeBytes(utf16).text).toBe("Cé");
  });
});
