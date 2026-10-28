// Small messy files used on the platform landing pages. The page runs each one through
// the real fixer at build time, so the "after" table is the fixer's actual output.

export type LandingDemo = { formatId: string; csv: string };

export const LANDING_DEMOS: Record<string, LandingDemo> = {
  shopify: {
    formatId: "shopify_products",
    csv: [
      "Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Inventory Qty,Published",
      "Linen Shirt!,Linen Shirt ,Size,Small,LS-S,$ 45,10,yes",
      "linen-shirt,,,Medium,LS-M,\"45,00\",4,",
      "linen-shirt,,,Medium,LS-M2,45.00,2,",
    ].join("\n"),
  },
  woocommerce: {
    formatId: "woocommerce_products",
    csv: [
      "ID,Type,SKU,Name,Published,Regular price,Sale price,Stock,In stock?,Categories",
      ",simple,MUG-01,Ceramic Mug ,yes,\"12,50\",14.00,25,TRUE,Kitchen > Mugs",
      ",simple,MUG-01,Travel Mug,1,9.99,,abc,1,Kitchen",
    ].join("\n"),
  },
  "woocommerce-variable": {
    formatId: "woocommerce_variable_products",
    csv: [
      "ID,Type,SKU,Name,Parent,Regular price,Attribute 1 name,Attribute 1 value(s),Attribute 1 visible,Attribute 1 global",
      ",variable,TEE,Logo Tee,,,Size,\"S, M\",1,1",
      ",variation,TEE-S,Logo Tee - S,TEE,15,Size,S,,1",
      ",variation,TEE-S2,Logo Tee - S,TEE,15,Size,S,,1",
      ",variation,TEE-L,Logo Tee - L,TEE-MISSING,15,Size,L,,1",
    ].join("\n"),
  },
  etsy: {
    formatId: "etsy_listings",
    csv: [
      "TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,SKU",
      "Handmade Ceramic Mug ,A wheel-thrown mug.,$18,usd,3,\"mug, coffee mug, handmade, ceramic, gift for her, kitchen, stoneware, pottery, tea, cup, latte, espresso, rustic, extra\",clay,http://example.com/mug.jpg,MUG-1",
      "Pottery Bowl,,24.00,USD,0,bowl,,example.com/bowl.jpg,",
    ].join("\n"),
  },
  ebay: {
    formatId: "ebay_listings",
    csv: [
      "*Action(SiteID=US|Country=US|Currency=USD|Version=1193),CustomLabel,*Category,*Title,*ConditionID,*C:Brand,*Format,*Duration,*StartPrice,*Quantity,PicURL",
      "Add,CAM-01,31388,Vintage Film Camera 35mm Rangefinder with Original Leather Case and Strap,Used,Canon,FixedPrice,GTC,\"$ 89,00\",1,http://example.com/cam.jpg",
      "add,CAM-02,,Film Camera,3000,,FixedPrice,30,49.99,-1,",
    ].join("\n"),
  },
  "ebay-variations": {
    formatId: "ebay_variations",
    csv: [
      "*Action(SiteID=US|Country=US|Currency=USD|Version=1193),CustomLabel,*Category,*Title,Relationship,RelationshipDetails,*StartPrice,*Quantity",
      "add,SHOE,63889,Trail Running Shoe,,Size=8;9|Color=Blue,,",
      ",SHOE-8B,,,Variation,Size=8|Color=Blue,$59.99,3",
      ",SHOE-8B,,,Variation,Size=8|Color=Blue,59.99,2",
      ",SHOE-10,,,Variation,Size=10|Color=Red,59.99,1",
    ].join("\n"),
  },
  amazon: {
    formatId: "amazon_inventory_loader",
    csv: [
      "sku,product-id,product-id-type,price,minimum-seller-allowed-price,maximum-seller-allowed-price,item-condition,quantity,add-delete",
      "BK-001,B00EXAMPLE,ASIN,\"14,99\",,,New,5,a",
      "BK-002,9780306406157,1,$12,15,10,11,two,a",
    ].join("\n"),
  },
};
