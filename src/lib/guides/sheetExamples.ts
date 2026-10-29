// src/lib/guides/sheetExamples.ts
// A small before/after spreadsheet for each issue guide: the rows as they look in a
// broken file, and the same rows once fixed. Cells that differ are highlighted. Column
// names are the platform's real headers, so they are not translated.

export type SheetExample = {
  /** Header row of the broken file. */
  cols: string[];
  /** Header row after the fix, when the fix adds or renames a column. */
  colsAfter?: string[];
  before: string[][];
  after: string[][];
  /** Extra cells to mark in the broken file ([row, column]) that the fix leaves as they are, such as the first of two duplicates. */
  flag?: [number, number][];
};

const S = ["Title", "URL handle"];
const W = ["Type", "SKU", "Name"];
const E = ["*Action(…)", "CustomLabel", "*Title"];
const T = ["Title", "SKU"];
const A = ["sku", "item-name"];

/** One product row per value pair, in the issue's column. */
function column(context: string[], ctxRows: string[][], col: string, pairs: [string, string][]): SheetExample {
  const cols = [...context, col];
  return {
    cols,
    before: pairs.map(([bad], i) => [...ctxRows[i % ctxRows.length], bad]),
    after: pairs.map(([, good], i) => [...ctxRows[i % ctxRows.length], good]),
  };
}

const shopRows = [
  ["Linen Shirt", "linen-shirt"],
  ["Ceramic Mug", "ceramic-mug"],
  ["Canvas Tote", "canvas-tote"],
];
const wooRows = [
  ["simple", "MUG-01", "Ceramic Mug"],
  ["simple", "TOTE-01", "Canvas Tote"],
  ["simple", "CAP-01", "Wool Cap"],
];
const ebayRows = [
  ["Add", "MUG-01", "Ceramic Coffee Mug 12oz"],
  ["Add", "TOTE-01", "Canvas Tote Bag Natural"],
  ["Add", "CAP-01", "Wool Beanie Hat Grey"],
];
const etsyRows = [
  ["Ceramic Coffee Mug", "MUG-01"],
  ["Canvas Tote Bag", "TOTE-01"],
  ["Wool Beanie", "CAP-01"],
];
const amzRows = [
  ["MUG-01", "Acme Ceramic Coffee Mug, 12 oz"],
  ["TOTE-01", "Acme Canvas Tote Bag, Natural"],
  ["CAP-01", "Acme Wool Beanie, Grey"],
];

const shop = (col: string, pairs: [string, string][]) => column(S, shopRows, col, pairs);
const woo = (col: string, pairs: [string, string][]) => column(W, wooRows, col, pairs);
const ebay = (col: string, pairs: [string, string][]) => column(E, ebayRows, col, pairs);
const etsy = (col: string, pairs: [string, string][]) => column(T, etsyRows, col, pairs);
const amz = (col: string, pairs: [string, string][]) => column(A, amzRows, col, pairs);

const LONG_TITLE = "Handmade Ceramic Coffee Mug 12oz Speckled Glaze Stoneware Tea Cup Gift for Him Her Coffee Lover Birthday Christmas Present";

export const SHEET_EXAMPLES: Record<string, SheetExample> = {
  // ── Shopify ──
  "shopify/missing_required_header": {
    cols: ["URL handle", "Price"],
    colsAfter: ["Title", "URL handle", "Price"],
    before: [["linen-shirt", "45.00"]],
    after: [["Linen Shirt", "linen-shirt", "45.00"]],
  },
  "shopify/blank_title": { cols: S, before: [["", "linen-shirt"]], after: [["Linen Shirt", "linen-shirt"]] },
  "shopify/blank_handle": { cols: S, before: [["Linen Shirt", ""]], after: [["Linen Shirt", "linen-shirt"]] },
  "shopify/invalid_handle": {
    cols: S,
    before: [
      ["Linen Shirt!", "Linen Shirt!"],
      ["Café Mug", "café mug"],
    ],
    after: [
      ["Linen Shirt!", "linen-shirt"],
      ["Café Mug", "cafe-mug"],
    ],
  },
  "shopify/handle_rewritten": { cols: S, before: [["Rock & Roll Tee", "Rock & Roll Tee"]], after: [["Rock & Roll Tee", "rock-and-roll-tee"]] },
  "shopify/handle_generated_column": { cols: ["Title", "Price"], colsAfter: ["Title", "URL handle", "Price"], before: [["Linen Shirt", "45.00"]], after: [["Linen Shirt", "linen-shirt", "45.00"]] },
  "shopify/invalid_boolean_published": shop("Published on online store", [
    ["yes", "true"],
    ["0", "false"],
    ["TRUE", "true"],
  ]),
  "shopify/invalid_charge_tax": shop("Charge tax", [
    ["Y", "true"],
    ["no", "false"],
  ]),
  "shopify/invalid_requires_shipping": shop("Requires shipping", [
    ["yes", "true"],
    ["N", "false"],
  ]),
  "shopify/invalid_gift_card": shop("Gift card", [
    ["no", "false"],
    ["1", "true"],
  ]),
  "shopify/invalid_status": shop("Status", [
    ["Live", "active"],
    ["Hidden", "draft"],
    ["ACTIVE", "active"],
  ]),
  "shopify/status_unrecognized": shop("Status", [["published", "active"]]),
  "shopify/missing_status_value": shop("Status", [["", "active"]]),
  "shopify/blank_price": shop("Price", [["", "45.00"]]),
  "shopify/invalid_numeric_price": shop("Price", [
    ["$45", "45.00"],
    ["18,50", "18.50"],
    ["1,200.00", "1200.00"],
  ]),
  "shopify/invalid_numeric_compare_at": shop("Compare-at price", [
    ["$60", "60.00"],
    ["n/a", ""],
  ]),
  "shopify/invalid_numeric_cost": shop("Cost per item", [["€12", "12.00"]]),
  "shopify/compare_at_lt_price": {
    cols: [...S, "Price", "Compare-at price"],
    before: [["Linen Shirt", "linen-shirt", "45.00", "39.00"]],
    after: [["Linen Shirt", "linen-shirt", "45.00", "59.00"]],
    flag: [[0, 2]],
  },
  "shopify/invalid_integer_inventory_qty": shop("Inventory quantity", [
    ["10.5", "10"],
    ["ten", "10"],
  ]),
  "shopify/negative_inventory": shop("Inventory quantity", [["-3", "0"]]),
  "shopify/invalid_inventory_policy": shop("Continue selling when out of stock", [
    ["no", "deny"],
    ["yes", "continue"],
  ]),
  "shopify/invalid_inventory_tracker": shop("Inventory tracker", [["yes", "shopify"]]),
  "shopify/invalid_fulfillment_service": shop("Fulfillment service", [["Manual", "manual"]]),
  "shopify/invalid_weight": shop("Weight value (grams)", [
    ["0.5 kg", "500"],
    ["250g", "250"],
  ]),
  "shopify/invalid_weight_unit": shop("Weight unit for display", [
    ["grams", "g"],
    ["pounds", "lb"],
  ]),
  "shopify/invalid_image_url": shop("Product image URL", [
    ["shirt.jpg", "https://cdn.shopify.com/s/files/shirt.jpg"],
    ["C:\\Photos\\mug.png", "https://cdn.shopify.com/s/files/mug.png"],
  ]),
  "shopify/image_url_not_https": shop("Product image URL", [["http://example.com/shirt.jpg", "https://example.com/shirt.jpg"]]),
  "shopify/invalid_image_position": shop("Image position", [
    ["first", "1"],
    ["2.0", "2"],
  ]),
  "shopify/image_alt_text_too_long": shop("Image alt text", [[`${LONG_TITLE} on a wooden table with morning light`, "Speckled ceramic coffee mug on a wooden table"]]),
  "shopify/seo_title_too_long": shop("SEO title", [[LONG_TITLE, "Handmade Speckled Ceramic Coffee Mug, 12oz"]]),
  "shopify/seo_title_missing": shop("SEO title", [["", "Linen Shirt – Breathable Summer Shirt"]]),
  "shopify/seo_description_missing": shop("SEO description", [["", "A breathable linen shirt for warm days."]]),
  "shopify/seo_description_too_long": shop("SEO description", [[`${LONG_TITLE}. ${LONG_TITLE}.`, "Handmade speckled stoneware mug that holds 12oz. A gift for coffee lovers."]]),
  "shopify/product_category_looks_like_google": shop("Product category", [["212", "Apparel & Accessories > Clothing > Shirts & Tops"]]),
  "shopify/too_many_tags": shop("Tags", [["linen, shirt, summer, … (260 tags)", "linen, shirt, summer, … (250 tags)"]]),
  "shopify/duplicate_sku": {
    cols: [...S, "Option1 value", "SKU"],
    before: [
      ["Linen Shirt", "linen-shirt", "S", "LS-1"],
      ["", "linen-shirt", "M", "LS-1"],
    ],
    after: [
      ["Linen Shirt", "linen-shirt", "S", "LS-S"],
      ["", "linen-shirt", "M", "LS-M"],
    ],
  },
  "shopify/duplicate_sku_across_products": {
    cols: [...S, "SKU"],
    before: [
      ["Linen Shirt", "linen-shirt", "SKU-100"],
      ["Ceramic Mug", "ceramic-mug", "SKU-100"],
    ],
    after: [
      ["Linen Shirt", "linen-shirt", "SKU-100"],
      ["Ceramic Mug", "ceramic-mug", "SKU-200"],
    ],
    flag: [[0, 2]],
  },
  "shopify/handle_title_mismatch": {
    cols: S,
    before: [
      ["Linen Shirt", "linen-shirt"],
      ["Linen Shirt Blue", "linen-shirt"],
    ],
    after: [
      ["Linen Shirt", "linen-shirt"],
      ["", "linen-shirt"],
    ],
    flag: [[0, 0]],
  },
  "shopify/duplicate_handle_not_variants": {
    cols: [...S, "Option1 value", "SKU"],
    before: [
      ["Linen Shirt", "linen-shirt", "M", "LS-M"],
      ["Linen Shirt", "linen-shirt", "M", "LS-M"],
    ],
    after: [
      ["Linen Shirt", "linen-shirt", "M", "LS-M"],
      ["", "", "", ""],
    ],
    flag: [[0, 1]],
  },
  "shopify/option_order_invalid": {
    cols: [...S, "Option1 name", "Option1 value", "Option2 name", "Option2 value"],
    before: [["Linen Shirt", "linen-shirt", "", "", "Size", "M"]],
    after: [["Linen Shirt", "linen-shirt", "Size", "M", "", ""]],
  },
  "shopify/variant_option_missing_value": {
    cols: [...S, "Option1 name", "Option1 value"],
    before: [["Linen Shirt", "linen-shirt", "Size", ""]],
    after: [["Linen Shirt", "linen-shirt", "Size", "M"]],
  },
  "shopify/missing_option1_for_variant_data": {
    cols: ["URL handle", "Option1 name", "Option1 value", "SKU"],
    before: [
      ["linen-shirt", "Size", "S", "LS-S"],
      ["linen-shirt", "", "", "LS-M"],
    ],
    after: [
      ["linen-shirt", "Size", "S", "LS-S"],
      ["linen-shirt", "", "M", "LS-M"],
    ],
  },
  "shopify/option_name_inconsistent": {
    cols: ["URL handle", "Option1 name", "Option1 value"],
    before: [
      ["linen-shirt", "Size", "S"],
      ["linen-shirt", "size", "M"],
    ],
    after: [
      ["linen-shirt", "Size", "S"],
      ["linen-shirt", "", "M"],
    ],
    flag: [[0, 1]],
  },
  "shopify/options_not_unique": {
    cols: ["URL handle", "Option1 name", "Option1 value", "SKU"],
    before: [
      ["linen-shirt", "Size", "M", "LS-M"],
      ["linen-shirt", "", "M", "LS-L"],
    ],
    after: [
      ["linen-shirt", "Size", "M", "LS-M"],
      ["linen-shirt", "", "L", "LS-L"],
    ],
    flag: [[0, 2]],
  },
  "shopify/mixed_default_title_with_options": {
    cols: ["URL handle", "Option1 name", "Option1 value"],
    before: [
      ["linen-shirt", "Title", "Default Title"],
      ["linen-shirt", "Size", "M"],
    ],
    after: [
      ["linen-shirt", "Size", "S"],
      ["linen-shirt", "", "M"],
    ],
  },
  "shopify/duplicate_image_position": {
    cols: ["URL handle", "Product image URL", "Image position"],
    before: [
      ["linen-shirt", "https://…/front.jpg", "1"],
      ["linen-shirt", "https://…/back.jpg", "1"],
    ],
    after: [
      ["linen-shirt", "https://…/front.jpg", "1"],
      ["linen-shirt", "https://…/back.jpg", "2"],
    ],
    flag: [[0, 2]],
  },
  "shopify/image_row_has_variant_fields": {
    cols: ["URL handle", "SKU", "Price", "Product image URL"],
    before: [["linen-shirt", "LS-M", "45.00", "https://…/back.jpg"]],
    after: [["linen-shirt", "", "", "https://…/back.jpg"]],
  },
  "shopify/packed_dimensions_incomplete": {
    cols: ["URL handle", "Packed product length", "Packed product width", "Packed product height", "Packed product dimension unit"],
    before: [["ceramic-mug", "12", "10", "", ""]],
    after: [["ceramic-mug", "12", "10", "11", "cm"]],
  },
  "shopify/description_too_short": shop("Description", [["Mug", "<p>Hand-thrown stoneware mug with a speckled glaze. Holds 12oz and is dishwasher safe.</p>"]]),
  "shopify/product_category_missing": shop("Product category", [["", "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs"]]),
  "shopify/vendor_missing": shop("Vendor", [["", "Acme Studio"]]),
  "shopify/tags_missing": shop("Tags", [["", "linen, shirt, summer"]]),

  // ── WooCommerce ──
  "woocommerce/missing_required_header": {
    cols: ["SKU", "Name"],
    colsAfter: ["Type", "SKU", "Name"],
    before: [["MUG-01", "Ceramic Mug"]],
    after: [["simple", "MUG-01", "Ceramic Mug"]],
  },
  "woocommerce/unknown_header": {
    cols: ["Type", "SKU", "Product Name"],
    colsAfter: ["Type", "SKU", "Name"],
    before: [["simple", "MUG-01", "Ceramic Mug"]],
    after: [["simple", "MUG-01", "Ceramic Mug"]],
  },
  "woocommerce/missing_type": { cols: W, before: [["", "MUG-01", "Ceramic Mug"]], after: [["simple", "MUG-01", "Ceramic Mug"]] },
  "woocommerce/invalid_type": {
    cols: W,
    before: [
      ["Simple product", "MUG-01", "Ceramic Mug"],
      ["variant", "TEE-M", "T-shirt - M"],
    ],
    after: [
      ["simple", "MUG-01", "Ceramic Mug"],
      ["variation", "TEE-M", "T-shirt - M"],
    ],
  },
  "woocommerce/missing_name": { cols: W, before: [["simple", "MUG-01", ""]], after: [["simple", "MUG-01", "Ceramic Mug"]] },
  "woocommerce/missing_sku": { cols: W, before: [["simple", "", "Ceramic Mug"]], after: [["simple", "MUG-01", "Ceramic Mug"]] },
  "woocommerce/duplicate_sku": {
    cols: W,
    before: [
      ["simple", "MUG-01", "Ceramic Mug"],
      ["simple", "MUG-01", "Travel Mug"],
    ],
    after: [
      ["simple", "MUG-01", "Ceramic Mug"],
      ["simple", "MUG-02", "Travel Mug"],
    ],
    flag: [[0, 1]],
  },
  "woocommerce/invalid_regular_price": woo("Regular price", [
    ["$18", "18.00"],
    ["18,50", "18.50"],
  ]),
  "woocommerce/invalid_sale_price": woo("Sale price", [["£14", "14.00"]]),
  "woocommerce/invalid_price": woo("Regular price", [
    ["free", "0.00"],
    ["1,200", "1200"],
  ]),
  "woocommerce/sale_price_not_lower": {
    cols: [...W, "Regular price", "Sale price"],
    before: [["simple", "MUG-01", "Ceramic Mug", "18.00", "22.00"]],
    after: [["simple", "MUG-01", "Ceramic Mug", "18.00", "15.00"]],
    flag: [[0, 3]],
  },
  "woocommerce/invalid_int": woo("Stock", [
    ["12.5", "12"],
    ["twenty", "20"],
  ]),
  "woocommerce/invalid_bool": woo("Published", [
    ["yes", "1"],
    ["False", "0"],
  ]),
  "woocommerce/invalid_visibility": woo("Visibility in catalog", [
    ["Visible", "visible"],
    ["shop only", "catalog"],
  ]),
  "woocommerce/invalid_value": woo("Tax status", [["Taxable", "taxable"]]),
  "woocommerce/missing_image": woo("Images", [["", "https://example.com/mug.jpg"]]),
  "woocommerce/invalid_image_url": woo("Images", [["mug.jpg", "https://example.com/mug.jpg"]]),
  "woocommerce/variation_missing_parent": {
    cols: [...W, "Parent"],
    before: [
      ["variable", "TEE", "T-shirt", ""],
      ["variation", "TEE-M", "T-shirt - M", ""],
    ],
    after: [
      ["variable", "TEE", "T-shirt", ""],
      ["variation", "TEE-M", "T-shirt - M", "TEE"],
    ],
  },
  "woocommerce/parent_not_in_file": {
    cols: [...W, "Parent"],
    before: [["variation", "TEE-M", "T-shirt - M", "TEE"]],
    after: [
      ["variable", "TEE", "T-shirt", ""],
      ["variation", "TEE-M", "T-shirt - M", "TEE"],
    ],
    flag: [[0, 3]],
  },
  "woocommerce/variation_missing_attributes": {
    cols: ["Type", "SKU", "Parent", "Attribute 1 name", "Attribute 1 value(s)"],
    before: [["variation", "TEE-M", "TEE", "", ""]],
    after: [["variation", "TEE-M", "TEE", "Size", "M"]],
  },
  "woocommerce/variation_multiple_values": {
    cols: ["Type", "SKU", "Attribute 1 name", "Attribute 1 value(s)"],
    before: [
      ["variable", "TEE", "Size", "S, M"],
      ["variation", "TEE-S", "Size", "S, M"],
    ],
    after: [
      ["variable", "TEE", "Size", "S, M"],
      ["variation", "TEE-S", "Size", "S"],
    ],
  },
  "woocommerce/duplicate_variation_combo": {
    cols: ["Type", "SKU", "Parent", "Attribute 1 value(s)"],
    before: [
      ["variation", "TEE-M", "TEE", "M"],
      ["variation", "TEE-L", "TEE", "M"],
    ],
    after: [
      ["variation", "TEE-M", "TEE", "M"],
      ["variation", "TEE-L", "TEE", "L"],
    ],
    flag: [[0, 3]],
  },

  // ── eBay ──
  "ebay/missing_required_header": {
    cols: ["*Action(…)", "*Title", "*StartPrice"],
    colsAfter: ["*Action(…)", "*Title", "*StartPrice", "*Quantity"],
    before: [["Add", "Ceramic Coffee Mug 12oz", "18.00"]],
    after: [["Add", "Ceramic Coffee Mug 12oz", "18.00", "5"]],
  },
  "ebay/missing_action_column": {
    cols: ["CustomLabel", "*Title"],
    colsAfter: ["*Action(…)", "CustomLabel", "*Title"],
    before: [["MUG-01", "Ceramic Coffee Mug 12oz"]],
    after: [["Add", "MUG-01", "Ceramic Coffee Mug 12oz"]],
  },
  "ebay/missing_action": { cols: E, before: [["", "MUG-01", "Ceramic Coffee Mug 12oz"]], after: [["Add", "MUG-01", "Ceramic Coffee Mug 12oz"]] },
  "ebay/invalid_action": {
    cols: E,
    before: [
      ["Create", "MUG-01", "Ceramic Coffee Mug 12oz"],
      ["update", "TOTE-01", "Canvas Tote Bag Natural"],
    ],
    after: [
      ["Add", "MUG-01", "Ceramic Coffee Mug 12oz"],
      ["Revise", "TOTE-01", "Canvas Tote Bag Natural"],
    ],
  },
  "ebay/missing_title": { cols: E, before: [["Add", "MUG-01", ""]], after: [["Add", "MUG-01", "Ceramic Coffee Mug 12oz"]] },
  "ebay/title_too_long": { cols: E, before: [["Add", "MUG-01", LONG_TITLE]], after: [["Add", "MUG-01", "Handmade Ceramic Coffee Mug 12oz Speckled Stoneware Tea Cup Gift Coffee Lover"]] },
  "ebay/missing_price": ebay("*StartPrice", [["", "18.00"]]),
  "ebay/invalid_price": ebay("*StartPrice", [
    ["$18", "18.00"],
    ["18,00", "18.00"],
  ]),
  "ebay/invalid_quantity": ebay("*Quantity", [
    ["2.5", "2"],
    ["-1", "0"],
  ]),
  "ebay/missing_condition": ebay("*ConditionID", [["", "1000"]]),
  "ebay/invalid_condition_id": ebay("*ConditionID", [
    ["New", "1000"],
    ["Used", "3000"],
  ]),
  "ebay/invalid_duration": ebay("*Duration", [
    ["30 days", "Days_30"],
    ["forever", "GTC"],
  ]),
  "ebay/fixed_price_not_gtc": {
    cols: [...E, "*Format", "*Duration"],
    before: [["Add", "MUG-01", "Ceramic Coffee Mug 12oz", "FixedPrice", "Days_30"]],
    after: [["Add", "MUG-01", "Ceramic Coffee Mug 12oz", "FixedPrice", "GTC"]],
    flag: [[0, 3]],
  },
  "ebay/invalid_format": ebay("*Format", [
    ["Buy It Now", "FixedPrice"],
    ["auction", "Auction"],
  ]),
  "ebay/invalid_dispatch_time": ebay("DispatchTimeMax", [["2 days", "2"]]),
  "ebay/missing_category_id": ebay("*Category", [["", "20625"]]),
  "ebay/invalid_category_id": ebay("*Category", [["Mugs", "20625"]]),
  "ebay/invalid_picture_url": ebay("PicURL", [["mug.jpg", "https://example.com/mug.jpg"]]),
  "ebay/too_many_images": ebay("PicURL", [["https://…/1.jpg|…|https://…/30.jpg (30)", "https://…/1.jpg|…|https://…/24.jpg (24)"]]),
  "ebay/duplicate_sku": {
    cols: E,
    before: [
      ["Add", "MUG-01", "Ceramic Coffee Mug 12oz"],
      ["Add", "MUG-01", "Ceramic Travel Mug 16oz"],
    ],
    after: [
      ["Add", "MUG-01", "Ceramic Coffee Mug 12oz"],
      ["Add", "MUG-02", "Ceramic Travel Mug 16oz"],
    ],
    flag: [[0, 1]],
  },
  "ebay/missing_item_id": {
    cols: ["*Action(…)", "ItemID", "*StartPrice"],
    before: [["Revise", "", "16.00"]],
    after: [["Revise", "315123456789", "16.00"]],
  },
  "ebay/missing_end_code": {
    cols: ["*Action(…)", "ItemID", "EndCode"],
    before: [["End", "315123456789", ""]],
    after: [["End", "315123456789", "NotAvailable"]],
  },
  "ebay/invalid_relationship_details": {
    cols: ["*Action(…)", "Relationship", "RelationshipDetails"],
    before: [
      ["Add", "", "Size: S, M"],
      ["", "Variation", "M"],
    ],
    after: [
      ["Add", "", "Size=S;M"],
      ["", "Variation", "Size=M"],
    ],
  },
  "ebay/variation_without_parent": {
    cols: ["*Action(…)", "Relationship", "RelationshipDetails", "*Title"],
    before: [
      ["", "Variation", "Size=M", ""],
      ["Add", "", "Size=S;M", "Linen Shirt"],
    ],
    after: [
      ["Add", "", "Size=S;M", "Linen Shirt"],
      ["", "Variation", "Size=M", ""],
    ],
  },
  "ebay/variation_value_not_in_parent": {
    cols: ["*Action(…)", "Relationship", "RelationshipDetails"],
    before: [
      ["Add", "", "Size=S;M"],
      ["", "Variation", "Size=L"],
    ],
    after: [
      ["Add", "", "Size=S;M;L"],
      ["", "Variation", "Size=L"],
    ],
    flag: [[1, 2]],
  },
  "ebay/variation_specifics_mismatch": {
    cols: ["CustomLabel", "VariationSpecificsName", "VariationSpecificsValue"],
    before: [["TEE-M", "Size", ""]],
    after: [["TEE-M", "Size", "M"]],
  },
  "ebay/duplicate_variation_combo": {
    cols: ["CustomLabel", "VariationSpecificsName", "VariationSpecificsValue"],
    before: [
      ["TEE-M", "Size", "M"],
      ["TEE-L", "Size", "M"],
    ],
    after: [
      ["TEE-M", "Size", "M"],
      ["TEE-L", "Size", "L"],
    ],
    flag: [[0, 2]],
  },

  // ── Etsy ──
  "etsy/missing_required_header": {
    cols: ["Title", "Price"],
    colsAfter: ["Title", "Description", "Price"],
    before: [["Ceramic Coffee Mug", "18.00"]],
    after: [["Ceramic Coffee Mug", "Hand-thrown stoneware mug.", "18.00"]],
  },
  "etsy/unknown_header": {
    cols: ["Title", "Cost"],
    colsAfter: ["Title", "Price"],
    before: [["Ceramic Coffee Mug", "18.00"]],
    after: [["Ceramic Coffee Mug", "18.00"]],
  },
  "etsy/duplicate_listing_id": {
    cols: ["Listing ID", ...T],
    before: [
      ["1543210987", "Ceramic Coffee Mug", "MUG-01"],
      ["1543210987", "Ceramic Travel Mug", "MUG-02"],
    ],
    after: [
      ["1543210987", "Ceramic Coffee Mug", "MUG-01"],
      ["", "Ceramic Travel Mug", "MUG-02"],
    ],
    flag: [[0, 0]],
  },
  "etsy/missing_title": { cols: T, before: [["", "MUG-01"]], after: [["Ceramic Coffee Mug", "MUG-01"]] },
  "etsy/title_too_long": { cols: T, before: [[`${LONG_TITLE} Mothers Day Fathers Day`, "MUG-01"]], after: [[LONG_TITLE.slice(0, 120), "MUG-01"]] },
  "etsy/missing_price": etsy("Price", [["", "18.00"]]),
  "etsy/invalid_price": etsy("Price", [
    ["$18", "18.00"],
    ["18,50", "18.50"],
  ]),
  "etsy/invalid_quantity": etsy("Quantity", [
    ["3.5", "3"],
    ["many", "10"],
  ]),
  "etsy/quantity_too_high": etsy("Quantity", [["1500", "999"]]),
  "etsy/invalid_currency": etsy("Currency", [
    ["usd", "USD"],
    ["$", "USD"],
  ]),
  "etsy/tags_too_many": etsy("Tags", [["mug, coffee, … (16 tags)", "mug, coffee, … (13 tags)"]]),
  "etsy/too_many_tags": etsy("Tags", [["mug, coffee, … (16 tags)", "mug, coffee, … (13 tags)"]]),
  "etsy/tag_too_long": etsy("Tags", [["handmade ceramic coffee mug gift", "ceramic coffee mug"]]),
  "etsy/duplicate_tags": etsy("Tags", [["mug, coffee, Mug, gift", "mug, coffee, gift"]]),
  "etsy/too_many_materials": etsy("Materials", [["clay, glaze, … (15 materials)", "clay, glaze, … (13 materials)"]]),
  "etsy/invalid_image_url": etsy("Image URLs", [["mug.jpg", "https://example.com/mug.jpg"]]),
  "etsy/duplicate_sku": {
    cols: T,
    before: [
      ["Ceramic Coffee Mug", "MUG-01"],
      ["Ceramic Travel Mug", "MUG-01"],
    ],
    after: [
      ["Ceramic Coffee Mug", "MUG-01"],
      ["Ceramic Travel Mug", "MUG-02"],
    ],
    flag: [[0, 1]],
  },

  // ── Amazon ──
  "amazon/missing_required_header": {
    cols: ["item-name", "price"],
    colsAfter: ["sku", "item-name", "price"],
    before: [["Acme Ceramic Coffee Mug, 12 oz", "18.00"]],
    after: [["MUG-01", "Acme Ceramic Coffee Mug, 12 oz", "18.00"]],
  },
  "amazon/missing_sku": { cols: A, before: [["", "Acme Ceramic Coffee Mug, 12 oz"]], after: [["MUG-01", "Acme Ceramic Coffee Mug, 12 oz"]] },
  "amazon/sku_too_long": {
    cols: A,
    before: [["ACME-CERAMIC-COFFEE-MUG-12OZ-SPECKLED-WHITE", "Acme Ceramic Coffee Mug, 12 oz"]],
    after: [["ACME-MUG-12OZ-SPECKLED-WHT", "Acme Ceramic Coffee Mug, 12 oz"]],
  },
  "amazon/duplicate_sku": {
    cols: A,
    before: [
      ["MUG-01", "Acme Ceramic Coffee Mug, 12 oz"],
      ["MUG-01", "Acme Travel Mug, 16 oz"],
    ],
    after: [
      ["MUG-01", "Acme Ceramic Coffee Mug, 12 oz"],
      ["MUG-02", "Acme Travel Mug, 16 oz"],
    ],
    flag: [[0, 0]],
  },
  "amazon/item_name_too_long": { cols: A, before: [["MUG-01", `${LONG_TITLE} … (520 characters)`]], after: [["MUG-01", "Acme Handmade Ceramic Coffee Mug, 12 oz, Speckled Stoneware"]] },
  "amazon/description_too_long": amz("item-description", [["Hand-thrown stoneware mug… (2,300 characters)", "Hand-thrown stoneware mug… (1,950 characters)"]]),
  "amazon/missing_item_name": { cols: A, before: [["MUG-01", ""]], after: [["MUG-01", "Acme Ceramic Coffee Mug, 12 oz"]] },
  "amazon/missing_price": amz("price", [["", "18.00"]]),
  "amazon/invalid_price": amz("price", [
    ["$18.00", "18.00"],
    ["18,00", "18.00"],
  ]),
  "amazon/invalid_quantity": amz("quantity", [
    ["2.5", "2"],
    ["-1", "0"],
  ]),
  "amazon/invalid_product_id_type": amz("product-id-type", [
    ["UPC", "3"],
    ["ean", "4"],
  ]),
  "amazon/product_id_scientific_notation": amz("product-id", [["1.23457E+11", "012345678905"]]),
  "amazon/invalid_product_id": amz("product-id", [["12345678901", "012345678905"]]),
  "amazon/invalid_item_condition": amz("item-condition", [
    ["New", "11"],
    ["used", "3"],
  ]),
  "amazon/invalid_add_delete": amz("add-delete", [
    ["add", "a"],
    ["delete", "d"],
  ]),
  "amazon/invalid_fulfillment_channel": amz("fulfillment-center-id", [
    ["FBA", "AMAZON_NA"],
    ["merchant", "DEFAULT"],
  ]),
  "amazon/invalid_image_url": amz("image-url", [["mug.jpg", "https://example.com/mug.jpg"]]),
  "amazon/invalid_boolean_field": amz("will-ship-internationally", [
    ["yes", "y"],
    ["FALSE", "n"],
  ]),
  "amazon/invalid_expedited_shipping": amz("expedited-shipping", [
    ["y", "Next,Second"],
    ["no", "N"],
  ]),
  "amazon/quantity_on_fba_offer": {
    cols: ["sku", "price", "quantity", "fulfillment-center-id"],
    before: [["MUG-01", "15.00", "40", "AMAZON_NA"]],
    after: [["MUG-01", "15.00", "", "AMAZON_NA"]],
  },
  "amazon/brand_name_too_long": amz("brand-name", [["Acme Handmade Ceramics and Home Goods Company International", "Acme Ceramics"]]),
  "amazon/min_above_max_price": {
    cols: [...A, "minimum-seller-allowed-price", "maximum-seller-allowed-price"],
    before: [["MUG-01", "Acme Ceramic Coffee Mug, 12 oz", "25.00", "15.00"]],
    after: [["MUG-01", "Acme Ceramic Coffee Mug, 12 oz", "15.00", "25.00"]],
  },
  "amazon/price_outside_allowed_range": {
    cols: ["sku", "price", "minimum-seller-allowed-price", "maximum-seller-allowed-price"],
    before: [["MUG-01", "30.00", "15.00", "25.00"]],
    after: [["MUG-01", "22.00", "15.00", "25.00"]],
    flag: [
      [0, 2],
      [0, 3],
    ],
  },
};

/** The example for an issue code, or null when there is none. */
export function sheetExampleFor(issueCode: string | undefined): SheetExample | null {
  return (issueCode && SHEET_EXAMPLES[issueCode]) || null;
}
