// Content for the platform landing pages (/shopify-csv-fixer, ...). English only.
// What the fixer checks is not listed here: the page reads it from the issue metadata,
// and the before/after example is the fixer's real output for LANDING_DEMOS.

import type { GuidePlatform } from "@/lib/guidesConstants";

export type LandingSlug =
  | "shopify"
  | "woocommerce"
  | "woocommerce-variable"
  | "etsy"
  | "ebay"
  | "ebay-variations"
  | "amazon"
  | "google"
  | "meta"
  | "tiktok";

export type PlatformLanding = {
  slug: LandingSlug;
  path: string;
  presetId: string;
  guidePlatform: GuidePlatform;
  /** Tailwind classes for the accent colour (text + soft background + border). */
  accent: { text: string; soft: string; border: string };
  metaTitle: string;
  metaDescription: string;
  kicker: string;
  title: string;
  intro: string;
  exportTip: string;
  gotchas: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  related: LandingSlug[];
  /** Only an English page for now: no /<locale>/ copy, and no translation required. */
  englishOnly?: boolean;
};

export const PLATFORM_LANDINGS: Record<LandingSlug, PlatformLanding> = {
  shopify: {
    slug: "shopify",
    path: "/shopify-csv-fixer",
    presetId: "shopify_products",
    guidePlatform: "shopify",
    accent: { text: "text-emerald-700 dark:text-green-400", soft: "bg-green-500/10", border: "border-green-500/30" },
    metaTitle: "Shopify CSV Fixer | Fix Shopify Product CSV Import Errors | StriveFormats",
    metaDescription:
      "Check a Shopify product CSV against the official template before you import. Prices, handles and true/false values are fixed automatically; variant and overwrite problems are pinned to the exact row.",
    kicker: "Shopify products",
    title: "Shopify CSV Fixer",
    intro:
      "Shopify's importer is strict: one product with a bad handle or two identical variants can stop the whole file. Check your CSV here first, get the safe fixes for free, and see exactly which rows still need you.",
    exportTip: "In Shopify admin: Products → Export → \"Plain CSV file\". Or start from the official template.",
    gotchas: [
      {
        title: "Blank cells overwrite real data",
        body: "When you import with \"Overwrite products with matching handles\", an empty cell replaces the value already in your store. The fixer exports only the columns your file actually uses, so a missing column can't wipe anything.",
      },
      {
        title: "Variants are rows that share a handle",
        body: "Only the first row of a product carries its title and description. Each following row is a variant and needs its own option values. Two rows with the same options are rejected, and the fixer shows you both.",
      },
      {
        title: "Prices and booleans in Shopify's format",
        body: "\"$ 45\", \"45,00\" and \"yes\" look fine in a spreadsheet but fail on import. They are rewritten to 45.00 and true, and every change is listed in the fix log.",
      },
    ],
    faq: [
      {
        q: "Does it work with old Shopify exports?",
        a: "Yes. Older column names like \"Variant Price\" and \"Body (HTML)\" are recognised, and the fixed file uses the current template's names, which Shopify accepts.",
      },
      {
        q: "Will it delete rows?",
        a: "No. Every row with data is kept (only completely empty lines are skipped), and every automatic change is listed in the fix log.",
      },
      {
        q: "Why do I see so many issues on a big file?",
        a: "One structural problem, such as a missing option column, repeats on every variant row. Fix it once in the table and the count drops quickly.",
      },
    ],
    related: ["woocommerce", "etsy", "amazon"],
  },

  woocommerce: {
    slug: "woocommerce",
    path: "/woocommerce-csv-fixer",
    presetId: "woocommerce_products",
    guidePlatform: "woocommerce",
    accent: { text: "text-purple-700 dark:text-purple-400", soft: "bg-purple-500/10", border: "border-purple-500/30" },
    metaTitle: "WooCommerce CSV Fixer | Fix WooCommerce Product Import Errors | StriveFormats",
    metaDescription:
      "Check a WooCommerce product CSV before you run the importer. Prices, booleans and stock values are normalised; duplicate SKUs and sale-price mistakes are flagged by row.",
    kicker: "WooCommerce products",
    title: "WooCommerce CSV Fixer",
    intro:
      "WooCommerce's built-in importer skips rows it doesn't understand and doesn't always tell you why. Check the file here first: the fixer reads the same columns WooCommerce exports and points at the rows that would be skipped.",
    exportTip: "In WordPress: Products → Export. Keep \"Export all columns\" selected.",
    gotchas: [
      {
        title: "Yes/no columns are 1 and 0",
        body: "Published, \"In stock?\" and similar columns expect 1 or 0 (Published also allows -1 for drafts). Values like \"yes\" or \"TRUE\" are converted for you.",
      },
      {
        title: "SKUs must be unique",
        body: "The importer matches existing products by ID or SKU. Two rows with the same SKU means one of them fails or overwrites the other, so the fixer flags both rows.",
      },
      {
        title: "Sale price has to be lower",
        body: "A sale price equal to or above the regular price is accepted but shows a meaningless \"sale\". It's flagged as a warning so you can catch typos before customers do.",
      },
    ],
    faq: [
      {
        q: "Does it change my column names?",
        a: "No. The fixed file keeps exactly the columns you uploaded, in the same order, so it re-imports with the same column mapping.",
      },
      {
        q: "What about variable products?",
        a: "Use the WooCommerce Variable Products fixer. It also checks that each variation points at a parent and has a unique combination of attributes.",
      },
    ],
    related: ["woocommerce-variable", "shopify", "etsy"],
  },

  "woocommerce-variable": {
    slug: "woocommerce-variable",
    path: "/woocommerce-variable-csv-fixer",
    presetId: "woocommerce_variable_products",
    guidePlatform: "woocommerce",
    accent: { text: "text-purple-700 dark:text-purple-400", soft: "bg-purple-500/10", border: "border-purple-500/30" },
    metaTitle: "WooCommerce Variable Product CSV Fixer | Variations & Attributes | StriveFormats",
    metaDescription:
      "Check WooCommerce variable products and variations before importing: parent references, attribute values and duplicate variation combinations, row by row.",
    kicker: "WooCommerce variable products",
    title: "WooCommerce Variable Product Fixer",
    intro:
      "Variable products are where WooCommerce imports usually go wrong: a variation that points at the wrong parent, or two variations with the same attributes. The fixer checks the whole family together, not just one row at a time.",
    exportTip: "Export with Products → Export, including variations. Parents have Type \"variable\", children \"variation\".",
    gotchas: [
      {
        title: "Every variation needs a parent",
        body: "The Parent column holds the parent's SKU (or id:123). If the parent isn't in the file, it must already exist in your store; the fixer tells you which ones it couldn't find.",
      },
      {
        title: "One combination per variation",
        body: "Two variations of the same parent with the same attribute values can't both exist. The fixer flags the pair so you can change one.",
      },
      {
        title: "Parents list every value",
        body: "The parent row lists all values of an attribute separated by commas (\"S, M, L\"); each variation row lists just its own value.",
      },
    ],
    faq: [
      {
        q: "Can parents and variations be in separate files?",
        a: "Yes, as long as the parents are imported first. A variation whose parent isn't in the file is reported as information, not an error.",
      },
      {
        q: "Does it handle more than one attribute?",
        a: "Yes. Attribute 1, Attribute 2 and so on are all compared when looking for duplicate combinations.",
      },
    ],
    related: ["woocommerce", "ebay-variations", "shopify"],
  },

  etsy: {
    slug: "etsy",
    path: "/etsy-csv-fixer",
    presetId: "etsy_listings",
    guidePlatform: "etsy",
    accent: { text: "text-orange-700 dark:text-orange-400", soft: "bg-orange-500/10", border: "border-orange-500/30" },
    metaTitle: "Etsy CSV Fixer | Clean Up Etsy Listing CSVs | StriveFormats",
    metaDescription:
      "Clean up an Etsy listing CSV: prices, currency codes and tags are normalised, and tag limits, image URLs and missing details are flagged by row.",
    kicker: "Etsy listings",
    title: "Etsy CSV Fixer",
    intro:
      "Etsy's listing export is handy for bulk edits in a spreadsheet, and just as easy to break. The fixer tidies prices, currency codes and tags, and warns about anything Etsy would cut off or reject.",
    exportTip: "In Shop Manager: Settings → Options → Download Data → \"Download CSV\" under Listings.",
    gotchas: [
      {
        title: "13 tags, no more",
        body: "Etsy allows 13 tags per listing, each up to 20 characters. The fixer counts them for every listing, flags long tags and normalises the separators.",
      },
      {
        title: "Prices without symbols",
        body: "Prices are plain numbers in your shop currency: \"$18\" becomes 18.00, and currency codes are uppercased (usd → USD).",
      },
      {
        title: "Image links must be full URLs",
        body: "\"example.com/mug.jpg\" won't load; it needs https://. Broken image links are flagged before you upload.",
      },
    ],
    faq: [
      {
        q: "Can I upload the fixed file straight to Etsy?",
        a: "Etsy doesn't have a native CSV upload for listings, so most sellers use the fixed file with a bulk-editing app or as a clean master copy for their catalogue.",
      },
      {
        q: "Does it check Etsy's other limits?",
        a: "It checks tags, prices, quantities, currency codes and image URLs. Category and shipping-profile choices still need to be set in Etsy.",
      },
    ],
    related: ["shopify", "ebay", "amazon"],
  },

  ebay: {
    slug: "ebay",
    path: "/ebay-csv-fixer",
    presetId: "ebay_listings",
    guidePlatform: "ebay",
    accent: { text: "text-sky-700 dark:text-sky-400", soft: "bg-sky-500/10", border: "border-sky-500/30" },
    metaTitle: "eBay CSV Fixer | Fix eBay File Exchange & Seller Hub Uploads | StriveFormats",
    metaDescription:
      "Check an eBay listing file before you upload it to Seller Hub reports or File Exchange: actions, condition IDs, durations, categories, prices and quantities.",
    kicker: "eBay listings",
    title: "eBay CSV Fixer",
    intro:
      "eBay's upload templates are picky about codes: the action column, numeric condition IDs and listing durations all have to be exactly right. The fixer converts the common ones for you and points at the rest.",
    exportTip: "Seller Hub → Reports → Uploads → \"Download template\", or export your active listings.",
    gotchas: [
      {
        title: "Conditions are numbers",
        body: "eBay wants a ConditionID such as 1000 (New) or 3000 (Used). Words like \"Used\" are converted to the matching code.",
      },
      {
        title: "Fixed price means GTC",
        body: "Fixed-price listings always run \"Good 'Til Cancelled\". Any other duration on a fixed-price row is flagged (eBay would switch it to GTC), and values like \"30\" that aren't valid durations at all are errors.",
      },
      {
        title: "New listings need a category",
        body: "Adding a listing without a category number fails. Revisions can leave it blank, so the fixer only flags it on Add rows.",
      },
    ],
    faq: [
      {
        q: "Does it keep the *Action(SiteID=...) header?",
        a: "Yes. The first column's header carries your site and currency settings, and it is kept exactly as you uploaded it.",
      },
      {
        q: "What about multi-variation listings?",
        a: "Use the eBay Variations fixer, which also checks the parent and child rows of each listing against each other.",
      },
    ],
    related: ["ebay-variations", "amazon", "etsy"],
  },

  "ebay-variations": {
    slug: "ebay-variations",
    path: "/ebay-variations-csv-fixer",
    presetId: "ebay_variations",
    guidePlatform: "ebay",
    accent: { text: "text-sky-700 dark:text-sky-400", soft: "bg-sky-500/10", border: "border-sky-500/30" },
    metaTitle: "eBay Variations CSV Fixer | Check Multi-Variation Listings | StriveFormats",
    metaDescription:
      "Check eBay multi-variation listings before uploading: every variation's options must exist on the parent row, and no two variations may share a combination.",
    kicker: "eBay multi-variation listings",
    title: "eBay Variations Fixer",
    intro:
      "A multi-variation listing is one parent row and a child row per size or colour, tied together by RelationshipDetails. The fixer reads the whole group and tells you which child doesn't match its parent.",
    exportTip: "Download the variations template from Seller Hub → Reports → Uploads, or export listings with variations.",
    gotchas: [
      {
        title: "The parent lists every option",
        body: "The parent's RelationshipDetails looks like Size=8;9|Color=Blue. Each child may only use values that appear there.",
      },
      {
        title: "Children carry price and quantity",
        body: "Each Variation row has its own SKU, price and quantity, while the title and category live on the parent.",
      },
      {
        title: "No duplicate combinations",
        body: "Two children with Size=8|Color=Blue are rejected. The fixer flags the pair, and duplicate SKUs too.",
      },
    ],
    faq: [
      {
        q: "Can I mix single listings and variation listings?",
        a: "Yes. Rows without a Relationship are treated as single listings and checked like the eBay Listings preset.",
      },
      {
        q: "Does it reorder my rows?",
        a: "No. Each child belongs to the nearest parent above it, so the order you uploaded is kept.",
      },
    ],
    related: ["ebay", "woocommerce-variable", "shopify"],
  },

  amazon: {
    slug: "amazon",
    path: "/amazon-csv-fixer",
    presetId: "amazon_inventory_loader",
    guidePlatform: "amazon",
    accent: { text: "text-amber-700 dark:text-amber-400", soft: "bg-amber-500/10", border: "border-amber-500/30" },
    metaTitle: "Amazon Inventory Loader CSV Fixer | Fix Amazon Offer Files | StriveFormats",
    metaDescription:
      "Check an Amazon Inventory Loader file before uploading: product ID types and condition codes are converted, and broken barcodes, quantities and price ranges are flagged.",
    kicker: "Amazon Inventory Loader",
    title: "Amazon Inventory Loader Fixer",
    intro:
      "Inventory Loader adds or updates offers on products that already exist on Amazon. It's a short file, but it relies on codes and identifiers that spreadsheets love to damage. The fixer converts the codes and catches the damage.",
    exportTip: "Seller Central → Catalog → Add Products via Upload → Download an Inventory File (Inventory Loader).",
    gotchas: [
      {
        title: "Codes, not words",
        body: "product-id-type is 1 (ASIN), 2 (ISBN), 3 (UPC) or 4 (EAN), and item-condition is a number such as 11 for New. Words are converted automatically.",
      },
      {
        title: "Spreadsheets break barcodes",
        body: "Excel turns 012345678905 into 1.23457E+11 or drops the leading zero. Both are detected; for a dropped zero, the likely original number is suggested.",
      },
      {
        title: "Stay inside your price range",
        body: "If the price falls outside your minimum/maximum seller-allowed price, Amazon deactivates the offer. The fixer compares all three.",
      },
    ],
    faq: [
      {
        q: "Does it work with category (flat file) templates?",
        a: "It accepts their column names, like item_sku and external_product_id_type, and keeps them, but the checks are designed for offer files.",
      },
      {
        q: "My file is tab-delimited .txt. Can I use it?",
        a: "Yes, upload it as is, or upload a CSV. The fixed file downloads as tab-delimited text (.txt), the format Amazon's Inventory Loader guide asks for, so you can upload it to Seller Central directly.",
      },
    ],
    related: ["ebay", "shopify", "woocommerce"],
  },

  google: {
    slug: "google",
    path: "/google-merchant-center-feed-checker",
    presetId: "google_merchant_center",
    guidePlatform: "google",
    accent: { text: "text-blue-700 dark:text-blue-400", soft: "bg-blue-500/10", border: "border-blue-500/30" },
    metaTitle: "Google Merchant Center Feed Checker | Fix Product Feed Errors | StriveFormats",
    metaDescription:
      "Check a Google Merchant Center product feed before you upload it. Availability, condition and prices are converted to Google's format; missing currencies, bad GTINs and preorders without dates are flagged.",
    kicker: "Google Merchant Center",
    title: "Google Merchant Center Feed Checker",
    intro:
      "Merchant Center disapproves products for small things: a price without a currency code, \"In Stock\" instead of in_stock, a barcode a spreadsheet rounded off. Check your product file here before you upload it, and fix most of it in one click.",
    exportTip: "Export the product feed from your store or feed app, or start from the template. In Merchant Center, add the fixed file under Products → Add products from a file.",
    gotchas: [
      {
        title: "Prices need a currency code",
        body: "Google wants 19.99 USD, not $19.99 or 19,99. Symbols that name one currency, like € and £, are converted; a bare $ is flagged, because US, Canadian and Australian dollars all use it.",
      },
      {
        title: "Google's own words only",
        body: "availability must be in_stock, out_of_stock, preorder or backorder, and condition new, used or refurbished. Common spellings like \"In Stock\" or \"pre-order\" are rewritten automatically.",
      },
      {
        title: "Barcodes are checked digit by digit",
        body: "Every GTIN's check digit is recalculated. Spaces and dashes are removed, a leading zero the spreadsheet dropped is restored when the check digit proves it, and numbers in scientific notation are flagged.",
      },
    ],
    faq: [
      {
        q: "Which file format does it download?",
        a: "A tab-delimited .txt file with your original column names, which is what Merchant Center expects for uploaded feeds. You can upload a .txt, .tsv or .csv file.",
      },
      {
        q: "Does it check apparel attributes?",
        a: "It checks the values of gender and age_group and converts common spellings. It doesn't yet require color and size, so check those yourself for clothing.",
      },
      {
        q: "Does it visit my product pages or images?",
        a: "No. Everything runs in your browser and nothing is uploaded. Links and images are checked for being full https:// addresses, but Google still crawls them, so make sure they load.",
      },
    ],
    related: ["shopify", "woocommerce", "amazon"],
  },

  meta: {
    slug: "meta",
    path: "/meta-catalog-feed-checker",
    presetId: "meta_catalog",
    guidePlatform: "meta",
    accent: { text: "text-indigo-700 dark:text-indigo-400", soft: "bg-indigo-500/10", border: "border-indigo-500/30" },
    metaTitle: "Facebook & Instagram Catalog Feed Checker | Meta Catalog CSV | StriveFormats",
    metaDescription:
      "Check a Meta catalog feed before uploading it to Commerce Manager. Availability, condition and prices are converted to Meta's format; products with no brand, GTIN or MPN are flagged.",
    kicker: "Meta catalog",
    title: "Facebook & Instagram Catalog Checker",
    intro:
      "Meta's catalog drops products quietly: in_stock instead of in stock, a price with no currency code, a product with no brand. Check your catalog file here before you upload it to Commerce Manager, and fix most of it in one click.",
    exportTip: "Export the product feed from your store or feed app, or start from the template. In Commerce Manager, open your catalog, go to Data sources and add the fixed CSV.",
    gotchas: [
      {
        title: "Availability has a space",
        body: "Meta takes in stock and out of stock, not Google's in_stock. Feeds made for Merchant Center are converted automatically; retired values like preorder are flagged for you to change.",
      },
      {
        title: "Every product needs a brand, GTIN or MPN",
        body: "A product with none of the three may not upload. For products you make yourself, your store's name counts as the brand.",
      },
      {
        title: "Condition is required",
        body: "Unlike Google, Meta needs condition on every product: new, refurbished or used. Values like \"New\" or \"renewed\" are rewritten automatically.",
      },
    ],
    faq: [
      {
        q: "Can I reuse my Google Merchant Center feed?",
        a: "Mostly, because the field names are the same. Upload it here with the Meta preset: availability is converted to Meta's values, and anything Meta needs that Google doesn't, such as condition, is flagged.",
      },
      {
        q: "Which file format does it download?",
        a: "A CSV with your original column names, which Commerce Manager accepts for catalog data sources. You can upload a .csv, .txt or .tsv file.",
      },
      {
        q: "Does it check product images?",
        a: "It checks that every link and image is a full https:// address and that there are no more than 50 extra images. It doesn't download the images, so check that they load and meet Meta's size rules.",
      },
    ],
    related: ["google", "shopify", "woocommerce"],
  },

  tiktok: {
    slug: "tiktok",
    path: "/tiktok-catalog-feed-checker",
    presetId: "tiktok_catalog",
    guidePlatform: "tiktok",
    englishOnly: true,
    accent: { text: "text-pink-700 dark:text-pink-400", soft: "bg-pink-500/10", border: "border-pink-500/30" },
    metaTitle: "TikTok Catalog Feed Checker | TikTok Product Feed CSV | StriveFormats",
    metaDescription:
      "Check a TikTok catalog feed before uploading it to TikTok Ads Manager. The id column is renamed to sku_id, availability and prices are converted, and products with no brand or a broken image are flagged.",
    kicker: "TikTok catalog",
    title: "TikTok Catalog Feed Checker",
    intro:
      "A feed made for Google or Meta almost works on TikTok, and the gaps are what get products rejected: no sku_id column, a blank brand, an image on Google Drive. Check your catalog file here before you upload it to TikTok Ads Manager, and fix most of it in one click.",
    exportTip:
      "Export the product feed from your store or feed app, or reuse your Google or Meta feed, or start from the template. In TikTok Ads Manager, open Assets → Catalogs, choose your catalog and add products by data feed or file upload with the fixed CSV.",
    gotchas: [
      {
        title: "The identifier is sku_id, not id",
        body: "Google and Meta feeds call the product identifier id. TikTok reads only sku_id, so a reused feed has no identifier at all. The checker renames the column for you and flags any duplicate sku_ids, which TikTok quietly skips.",
      },
      {
        title: "Brand is required on every product",
        body: "Meta and Google accept a GTIN or MPN instead of a brand; TikTok doesn't. Products with a blank brand are flagged. For products you make yourself, your store's name is the brand.",
      },
      {
        title: "Images must be real JPG or PNG files",
        body: "Share links from Google Drive, Dropbox, Flickr or Pinterest open a web page, not an image, and TikTok lists them as unsupported. Images hosted on your store work. WebP and GIF files are flagged too.",
      },
    ],
    faq: [
      {
        q: "Can I upload my Google Merchant Center or Meta feed to TikTok?",
        a: "Yes, after a few changes, and this checker makes most of them. It renames id to sku_id, converts availability values like in_stock, and flags what you need to fill in yourself, usually brand.",
      },
      {
        q: "Which availability values does TikTok take?",
        a: "in stock, available for order, preorder, out of stock and discontinued, written with spaces. Google-style values such as in_stock and pre_order are converted automatically.",
      },
      {
        q: "Do prices need a currency code?",
        a: "TikTok uses the catalog country's currency when the code is missing, so the upload doesn't fail, but a feed in another currency would show the wrong prices. Prices without a code are flagged as a warning; write them like 9.99 USD.",
      },
      {
        q: "Does it check emoji and offers in titles?",
        a: "Yes. TikTok doesn't allow emoji or promotional text like \"free shipping\" in titles, so those are flagged for you to rewrite. Trademark signs such as ™ and ® are fine.",
      },
      {
        q: "Is my file uploaded anywhere?",
        a: "No. The check runs in your browser and the file stays on your computer. Image links are checked by their address only, so make sure they open.",
      },
    ],
    related: ["meta", "google", "shopify"],
  },
};
