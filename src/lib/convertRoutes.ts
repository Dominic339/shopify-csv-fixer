// src/lib/convertRoutes.ts
// Store-migration pages (/migrate/<slug>): one per source → target pair, each
// with the converter preset, the platform-specific export and import steps,
// and a worked example run through the real converter at build time.
//
// English only for now; the converter UI on these pages is translated.

export type ConvertRoute = {
  slug: string;
  source: string; // convert format id
  target: string;
  sourceName: string;
  targetName: string;
  /** Format id of the fixer preset for the target, for the "check it" step. */
  targetPreset: string;
  /** Platform landing page for the target fixer. */
  targetLanding: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  exportSteps: string[];
  importSteps: string[];
  /** What the converter can't carry over, so nobody is surprised after import. */
  notCarried: string[];
  faqs: { q: string; a: string }[];
};

/** Small, realistic exports used for the worked example on each page. */
export const SAMPLE_EXPORTS: Record<string, string> = {
  etsy_listings: [
    "TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,IMAGE2,SKU",
    '"Hand-thrown Ceramic Mug","Speckled stoneware mug, 350 ml.",28.00,USD,12,"mug,ceramic,handmade",stoneware,https://i.etsystatic.com/1/mug-1.jpg,https://i.etsystatic.com/1/mug-2.jpg,MUG-SPK',
    '"Linen Tea Towel","Natural linen, 50 x 70 cm.",16.50,USD,30,"linen,kitchen",linen,https://i.etsystatic.com/1/towel.jpg,,TOWEL-NAT',
    '"Walnut Serving Board","Oiled walnut, one of a kind.",64.00,USD,1,"walnut,wood,board",walnut,https://i.etsystatic.com/1/board.jpg,,BOARD-WAL',
  ].join("\n"),
  woocommerce_products: [
    "ID,Type,SKU,Name,Published,Short description,Description,Regular price,Sale price,Stock,Categories,Tags,Images,Parent,Attribute 1 name,Attribute 1 value(s)",
    ",variable,TEE,Organic Cotton Tee,1,Soft everyday tee,<p>100% organic cotton.</p>,,,,Clothing > T-shirts,cotton,https://shop.example.com/tee.jpg,,Size,S | M | L",
    ",variation,TEE-S,Organic Cotton Tee - S,1,,,24.00,,8,,,,TEE,Size,S",
    ",variation,TEE-M,Organic Cotton Tee - M,1,,,24.00,19.00,14,,,,TEE,Size,M",
    ",variation,TEE-L,Organic Cotton Tee - L,1,,,24.00,,0,,,,TEE,Size,L",
    ",simple,CAP-BLK,Canvas Cap,1,Six-panel cap,<p>Adjustable strap.</p>,18.00,,25,Accessories,cap,https://shop.example.com/cap.jpg,,,",
  ].join("\n"),
  ebay_listings: [
    "*Action(SiteID=US|Country=US|Currency=USD|Version=1193),CustomLabel,*Category,*Title,*ConditionID,*Description,PicURL,*Format,*Duration,*StartPrice,*Quantity,Relationship,RelationshipDetails",
    "Add,KB-01,33963,Mechanical Keyboard 75%,1000,<p>Hot-swappable switches.</p>,https://i.ebayimg.com/kb.jpg,FixedPrice,GTC,,,,Color=Black;White",
    ",KB-01-BLK,,,,,,,,89.00,6,Variation,Color=Black",
    ",KB-01-WHT,,,,,,,,92.00,3,Variation,Color=White",
    "Add,MP-XL,23895,Desk Mat XL,1000,\"<p>90 x 40 cm, stitched edges.</p>\",https://i.ebayimg.com/mat.jpg,FixedPrice,GTC,24.99,40,,",
  ].join("\n"),
  amazon_inventory_loader: [
    "sku\tproduct-id\tproduct-id-type\titem-name\tbrand-name\tprice\tquantity\titem-condition\tmain_image_url",
    "BTL-750-STL\t012345678905\t3\tInsulated Steel Bottle 750 ml\tTrailCo\t29.95\t48\t11\thttps://m.media-amazon.com/images/I/bottle.jpg",
    "BTL-500-STL\t012345678912\t3\tInsulated Steel Bottle 500 ml\tTrailCo\t24.95\t60\t11\thttps://m.media-amazon.com/images/I/bottle-500.jpg",
  ].join("\n"),
  shopify_products: [
    "Title,URL handle,Description,Vendor,Type,Tags,Published on online store,Status,SKU,Option1 name,Option1 value,Price,Compare-at price,Inventory quantity,Product image URL,Image position",
    "Merino Beanie,merino-beanie,<p>Fine-knit merino wool.</p>,North Knit,Hats,\"wool, winter\",TRUE,Active,BEANIE-GRY,Color,Grey,32.00,,20,https://cdn.shopify.com/s/files/beanie-grey.jpg,1",
    ",merino-beanie,,,,,,,BEANIE-NVY,Color,Navy,32.00,38.00,11,,",
    "Wool Socks,wool-socks,<p>Two pairs.</p>,North Knit,Socks,wool,TRUE,Active,SOCKS-2P,,,18.00,,50,https://cdn.shopify.com/s/files/socks.jpg,1",
  ].join("\n"),
};

const exportSteps: Record<string, string[]> = {
  etsy_listings: [
    "In Etsy, open Shop Manager → Settings → Options, then the Download Data tab.",
    "Under Currently for Sale Listings, click Download CSV.",
    "Keep the file as it is: the converter reads Etsy's own column names (TITLE, PRICE, IMAGE1 and so on).",
  ],
  woocommerce_products: [
    "In WordPress, go to Products → All Products and click Export at the top.",
    "Leave \"Which columns should be exported?\" and \"Which product types?\" on all, and tick Export custom meta only if you need it.",
    "Click Generate CSV. Variable products come out as a parent row plus one row per variation, which is what the converter expects.",
  ],
  ebay_listings: [
    "In Seller Hub, open Reports → Downloads and click Create report (or schedule one) for your active listings.",
    "If you list with File Exchange or Seller Hub Reports uploads, you can also use the CSV you last uploaded: it already has the Action, CustomLabel and StartPrice columns.",
    "Download the CSV. Listings with variations keep their parent row and one Variation row per option.",
  ],
  amazon_inventory_loader: [
    "In Seller Central, go to Inventory → Inventory Reports and request an Active Listings Report.",
    "Download it when it's ready. It's a tab-separated text file; the converter reads tabs and commas alike.",
    "Product titles, brand, price, stock and the UPC/EAN carry over. Long-form copy and bullet points live in Amazon's catalogue, not this report.",
  ],
  shopify_products: [
    "In Shopify admin, go to Products and click Export.",
    "Choose All products and CSV for Excel, Numbers, or other spreadsheet programs, then click Export products.",
    "Shopify emails you the file (or downloads it right away for small stores). Both the new and the older column names are understood.",
  ],
};

const importSteps: Record<string, string[]> = {
  shopify_products: [
    "Run the converted file through the CSV Fixer with the Shopify preset to catch anything Shopify would reject.",
    "In Shopify admin, go to Products → Import, choose the file and click Upload and preview.",
    "Check the preview (product count, a few variants), then click Import products. Shopify emails you when it's done.",
  ],
  woocommerce_products: [
    "Run the converted file through the CSV Fixer with the WooCommerce preset.",
    "In WordPress, go to Products → All Products → Import, choose the file and click Continue.",
    "The column names already match WooCommerce's, so the mapping screen should need no changes. Click Run the importer.",
  ],
  etsy_listings: [
    "Etsy has no built-in CSV import for new listings. Use the file with a listing-upload app from the Etsy App Gallery, most of which read Etsy's own export columns.",
    "Or use it as a checklist while you create listings in Shop Manager; titles, descriptions, prices, tags and image links are all in one place.",
    "Either way, add a category, shipping profile and any variations in Etsy after the upload; those can't come from another platform's file.",
  ],
  ebay_listings: [
    "Fill in *Category (eBay's numeric category ID) and *ConditionID (1000 for new) for each listing; the converter leaves them blank because other platforms don't use eBay's codes.",
    "Run the file through the CSV Fixer with the eBay preset to check titles, condition IDs and variation rows.",
    "In Seller Hub, go to Reports → Uploads, click Upload template and choose the file. eBay emails a results file when it has processed it.",
  ],
};

const notCarried: Record<string, string[]> = {
  "etsy_listings>shopify_products": [
    "Etsy variations (size, colour) list values but not per-option prices or stock, so each listing becomes one Shopify product. Add variants in Shopify afterwards.",
    "Shipping profiles, materials and Etsy categories have no Shopify equivalent and are left out.",
    "Reviews and sales history stay on Etsy.",
  ],
  "woocommerce_products>shopify_products": [
    "Categories become the Shopify product type, keeping the last level (Clothing > T-shirts becomes T-shirts). Create collections in Shopify; automated collections by type or tag work well.",
    "The short description has no Shopify column and is left out; the main description carries over.",
    "Customers, orders and reviews need a separate migration.",
  ],
  "ebay_listings>shopify_products": [
    "Item specifics, eBay category numbers and listing durations don't exist in Shopify and are left out.",
    "Auction listings are converted at their start price.",
    "Feedback and sales history stay on eBay.",
  ],
  "amazon_inventory_loader>shopify_products": [
    "The Active Listings Report has no long descriptions or bullet points; add them in Shopify or paste them from your Amazon listing pages.",
    "FBA stock is reported per fulfilment centre; check quantities before you start selling on Shopify.",
    "Only the main image is in the report. Upload the rest in Shopify.",
  ],
  "shopify_products>woocommerce_products": [
    "Shopify collections aren't in the product export. Product type becomes the WooCommerce category; recreate other groupings as categories or tags.",
    "Shopify metafields and SEO fields beyond the title and description aren't carried over.",
    "Weights are written in kg; if your store uses another unit, change the column header before importing.",
  ],
  "etsy_listings>woocommerce_products": [
    "Etsy variations don't include per-option prices or stock, so each listing becomes a simple WooCommerce product.",
    "Shipping profiles and Etsy categories are left out; set shipping classes and categories in WooCommerce.",
    "Reviews stay on Etsy.",
  ],
  "shopify_products>etsy_listings": [
    "Products with variants become single Etsy listings at the lowest price with the combined quantity. Add Etsy variations in Shop Manager.",
    "CURRENCY_CODE is left blank because Etsy always uses your shop's currency.",
    "Etsy needs a category, who-made/when-made answers and a shipping profile, which no Shopify file contains.",
  ],
  "shopify_products>ebay_listings": [
    "eBay needs a category ID and a condition ID for every listing; the columns are there but empty.",
    "The file targets eBay US (SiteID=US, USD). For another eBay site, change the first column header to match a template from your Seller Hub.",
    "Titles longer than eBay's 80-character limit are flagged so you can shorten them.",
  ],
};

type RouteText = Pick<ConvertRoute, "metaTitle" | "metaDescription" | "h1" | "intro" | "faqs">;

const text: Record<string, RouteText> = {
  "etsy-to-shopify": {
    metaTitle: "Etsy to Shopify CSV Converter: Move Your Listings Free",
    metaDescription: "Convert your Etsy listings CSV into a Shopify product import file in your browser. Titles, descriptions, prices, stock, tags and images carry over.",
    h1: "Move your Etsy listings to Shopify",
    intro: "Download your listings from Etsy, convert them here, and import the result into Shopify. The conversion runs in your browser, so your file never leaves your computer.",
    faqs: [
      { q: "Will my Etsy images come across?", a: "Yes. Etsy's IMAGE1 to IMAGE10 links become Shopify product images in the same order. Shopify downloads them during the import, so the links must still work at that point." },
      { q: "What happens to my Etsy variations?", a: "Etsy's export lists variation values but not a price or stock level for each option, so each listing is converted as a single Shopify product. You can add variants in Shopify after the import." },
      { q: "Do I need a Shopify plan to test the import?", a: "Shopify's free trial includes product imports, so you can import, check the result and delete it before you commit." },
    ],
  },
  "woocommerce-to-shopify": {
    metaTitle: "WooCommerce to Shopify CSV Converter: Products and Variants",
    metaDescription: "Convert a WooCommerce product export into a Shopify import CSV, including variable products, sale prices, stock and images. Free and private.",
    h1: "Move your WooCommerce products to Shopify",
    intro: "Export your products from WooCommerce, convert them here, and import them into Shopify with variants intact. Variable products become Shopify products with one variant per variation.",
    faqs: [
      { q: "Are variable products supported?", a: "Yes. A WooCommerce parent row and its variation rows become one Shopify product with a variant per variation, using the attribute names as Shopify options (up to Shopify's three options)." },
      { q: "What about sale prices?", a: "When a variation has a sale price, it becomes the Shopify price and the regular price becomes the compare-at price, so the sale shows the same way." },
      { q: "Does this move customers and orders?", a: "No, only products. Customers and orders need Shopify's Store Migration app or a migration service." },
    ],
  },
  "ebay-to-shopify": {
    metaTitle: "eBay to Shopify CSV Converter: Listings and Variations",
    metaDescription: "Turn an eBay listings CSV (File Exchange or Seller Hub) into a Shopify product import, with variations, prices, quantities and pictures.",
    h1: "Move your eBay listings to Shopify",
    intro: "Use your eBay listings file to create the same products in Shopify. Multi-variation listings become Shopify products with one variant per variation.",
    faqs: [
      { q: "Which eBay file do I need?", a: "A listings CSV in File Exchange / Seller Hub Reports format, with columns such as CustomLabel, Title, StartPrice and Quantity. Variation listings need their Relationship and RelationshipDetails columns." },
      { q: "Will my eBay pictures transfer?", a: "PicURL links (separated by |) become Shopify product images. Images hosted by eBay may stop working after a listing ends, so import into Shopify while your listings are still live." },
      { q: "What about eBay categories and item specifics?", a: "They have no equivalent in Shopify and are left out. Use Shopify's product type and tags instead." },
    ],
  },
  "amazon-to-shopify": {
    metaTitle: "Amazon to Shopify CSV Converter: Listings Report to Products",
    metaDescription: "Convert your Amazon Active Listings Report or inventory file into a Shopify product import with titles, brand, price, stock and UPC/EAN barcodes.",
    h1: "Bring your Amazon catalogue to Shopify",
    intro: "Start selling on your own Shopify store with the products you already list on Amazon. The converter turns Amazon's listings file into a Shopify import, keeping SKUs and barcodes.",
    faqs: [
      { q: "Does it keep my UPC or EAN codes?", a: "Yes. When product-id-type is a UPC, EAN, ISBN or GTIN, the code goes into Shopify's Barcode field. ASINs are Amazon-only and are not copied." },
      { q: "Can I keep selling on Amazon at the same time?", a: "Yes. Nothing changes on Amazon. Keep SKUs the same on both so stock-sync apps can match the products." },
      { q: "Why are descriptions missing?", a: "Amazon's listings report doesn't include them. Add descriptions in Shopify, or paste them from your Amazon detail pages." },
    ],
  },
  "shopify-to-woocommerce": {
    metaTitle: "Shopify to WooCommerce CSV Converter: Products and Variants",
    metaDescription: "Convert a Shopify product export into a WooCommerce import CSV with variable products, attributes, prices, stock and images. Free and in your browser.",
    h1: "Move your Shopify products to WooCommerce",
    intro: "Export from Shopify, convert here, and import with WooCommerce's built-in product importer. Products with variants become variable products with one variation each.",
    faqs: [
      { q: "Do Shopify variants become WooCommerce variations?", a: "Yes. Each Shopify product with variants becomes a variable product, Shopify's option names become attributes, and every variant becomes a variation row linked to its parent." },
      { q: "Do I need a plugin to import?", a: "No. WooCommerce's built-in importer (Products → Import) reads the file directly; the column names already match." },
      { q: "Are images transferred?", a: "Shopify image links go into the Images column. WooCommerce downloads them into your media library during the import." },
    ],
  },
  "etsy-to-woocommerce": {
    metaTitle: "Etsy to WooCommerce CSV Converter: Listings to Products",
    metaDescription: "Convert your Etsy listings CSV into a WooCommerce product import file with titles, descriptions, prices, stock, tags and images.",
    h1: "Move your Etsy listings to WooCommerce",
    intro: "Download your Etsy listings, convert them here, and import them into your WordPress store with WooCommerce's own importer.",
    faqs: [
      { q: "Will this create variable products?", a: "Etsy's export doesn't contain per-option prices or stock, so each listing becomes a simple product. Add variations in WooCommerce afterwards if you need them." },
      { q: "Are tags kept?", a: "Yes. Etsy tags become WooCommerce product tags." },
      { q: "Is anything uploaded to your servers?", a: "No. The file is read and converted in your browser and the result is saved straight to your computer." },
    ],
  },
  "shopify-to-etsy": {
    metaTitle: "Shopify to Etsy CSV Converter: Products to Etsy Listings",
    metaDescription: "Convert a Shopify product export into an Etsy listings CSV with titles, descriptions, prices, quantities, tags and image links.",
    h1: "List your Shopify products on Etsy",
    intro: "Turn your Shopify product export into a file in Etsy's own listing columns, ready for an Etsy listing-upload app or as a checklist for creating listings.",
    faqs: [
      { q: "Can I upload the file to Etsy directly?", a: "Etsy doesn't offer a built-in CSV import for new listings. Listing-upload apps in the Etsy App Gallery accept files in this layout, or you can use it to fill in listings by hand." },
      { q: "What happens to products with variants?", a: "They become one Etsy listing at the lowest variant price with the combined quantity. Add Etsy variations in Shop Manager." },
      { q: "How many images are kept?", a: "Up to ten, Etsy's limit, in IMAGE1 to IMAGE10." },
    ],
  },
  "shopify-to-ebay": {
    metaTitle: "Shopify to eBay CSV Converter: Products to File Exchange",
    metaDescription: "Convert your Shopify product export into an eBay listings upload CSV with variations, prices, quantities and pictures. Free and private.",
    h1: "List your Shopify products on eBay",
    intro: "Create eBay fixed-price listings from your Shopify products. Products with variants become multi-variation eBay listings.",
    faqs: [
      { q: "Is the file ready to upload?", a: "Almost. eBay needs a category ID and a condition ID for each listing, which no Shopify file contains. Fill in *Category and *ConditionID, then upload in Seller Hub under Reports → Uploads." },
      { q: "Are variants supported?", a: "Yes. A product with variants becomes a parent row with RelationshipDetails plus one Variation row per variant, each with its own SKU, price and quantity." },
      { q: "Which eBay site does it target?", a: "eBay US. The first column says SiteID=US and Currency=USD; for eBay UK, Germany or another site, change it to match a template downloaded from your own Seller Hub." },
    ],
  },
};

const NAMES: Record<string, string> = {
  shopify_products: "Shopify",
  woocommerce_products: "WooCommerce",
  etsy_listings: "Etsy",
  ebay_listings: "eBay",
  amazon_inventory_loader: "Amazon",
};

const PRESET: Record<string, { preset: string; landing: string }> = {
  shopify_products: { preset: "shopify_products", landing: "/shopify-csv-fixer" },
  woocommerce_products: { preset: "woocommerce_products", landing: "/woocommerce-csv-fixer" },
  etsy_listings: { preset: "etsy_listings", landing: "/etsy-csv-fixer" },
  ebay_listings: { preset: "ebay_listings", landing: "/ebay-csv-fixer" },
};

const PAIRS: [string, string, string][] = [
  ["etsy-to-shopify", "etsy_listings", "shopify_products"],
  ["woocommerce-to-shopify", "woocommerce_products", "shopify_products"],
  ["ebay-to-shopify", "ebay_listings", "shopify_products"],
  ["amazon-to-shopify", "amazon_inventory_loader", "shopify_products"],
  ["shopify-to-woocommerce", "shopify_products", "woocommerce_products"],
  ["etsy-to-woocommerce", "etsy_listings", "woocommerce_products"],
  ["shopify-to-etsy", "shopify_products", "etsy_listings"],
  ["shopify-to-ebay", "shopify_products", "ebay_listings"],
];

export const CONVERT_ROUTES: ConvertRoute[] = PAIRS.map(([slug, source, target]) => ({
  slug,
  source,
  target,
  sourceName: NAMES[source],
  targetName: NAMES[target],
  targetPreset: PRESET[target].preset,
  targetLanding: PRESET[target].landing,
  exportSteps: exportSteps[source],
  importSteps: importSteps[target],
  notCarried: notCarried[`${source}>${target}`],
  ...text[slug],
}));

export function getConvertRoute(slug: string): ConvertRoute | undefined {
  return CONVERT_ROUTES.find((r) => r.slug === slug);
}

/** The migration page for a source/target pair, if there is one. */
export function routeFor(source: string, target: string): ConvertRoute | undefined {
  return CONVERT_ROUTES.find((r) => r.source === source && r.target === target);
}
