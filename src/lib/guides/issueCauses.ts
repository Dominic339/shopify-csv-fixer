// src/lib/guides/issueCauses.ts
// Hand-written "Common causes" for the issue guides where the generated text alone says
// least: the variant and structure errors people search for. Each line is translated through
// src/i18n/guideText/<locale>.json like the rest of the generated guide.

export const ISSUE_CAUSES: Record<string, string[]> = {
  "shopify/invalid_handle": [
    "The handle was typed by hand with capitals, spaces or an ampersand, as in \"Linen Shirt & Tie\".",
    "Titles in other alphabets or with accents were copied into the handle column unchanged.",
    "A spreadsheet formula built the handle from the title and kept punctuation like apostrophes and slashes.",
  ],
  "shopify/duplicate_sku": [
    "Variants were created by copying a row and the SKU wasn't changed on the copy.",
    "Two products from different suppliers use the same supplier code as their SKU.",
    "Rows from two exports were merged, so the same variant appears twice.",
  ],
  "shopify/option_order_invalid": [
    "A product with one option had it typed into the Option2 columns, leaving Option1 empty.",
    "Columns were rearranged in a spreadsheet, so Option2 values ended up under a blank Option1.",
    "An option was removed from the product by clearing Option1 instead of the last option.",
  ],
  "shopify/variant_option_missing_value": [
    "Option names are filled on every row, but some variant rows were added without their size or colour.",
    "A value was deleted while editing, for example a size that was discontinued.",
    "The file was exported from another platform that keeps option values in a different column.",
  ],
  "shopify/option_name_inconsistent": [
    "One variant row says Colour and another says Color, so Shopify sees two different options.",
    "Option names were translated or retyped on some rows, for example Size and size.",
    "Two products accidentally share a handle, so their different options end up in one product.",
  ],
  "shopify/mixed_default_title_with_options": [
    "A product was first exported without variants, then rows with real options were added under the same handle.",
    "Rows from two exports of the same product were merged, one before and one after adding variants.",
    "Option1 value was left as Default Title on one row while the others list sizes or colours.",
  ],
  "woocommerce/missing_name": [
    "A parent variable product row was added without a Name, because the name was only filled on its variations.",
    "Names were stored in a column the importer doesn't map, such as Title or Product name.",
    "Rows were sorted, separating a product's name from the rest of its data.",
  ],
  "woocommerce/invalid_type": [
    "Type was filled with a description such as Product, Variable product or Simple product.",
    "Several types were combined in one cell, as in \"simple, downloadable\", instead of using the Downloadable and Virtual columns.",
    "The file came from another platform that uses its own product kinds.",
  ],
  "woocommerce/variation_missing_parent": [
    "Variation rows were exported from a plugin that leaves Parent empty and relies on row order instead.",
    "The parent was referenced by name rather than by its SKU or id:123.",
    "The parent row was deleted or filtered out of the file, so its variations point at nothing.",
  ],
  "woocommerce/variation_missing_attributes": [
    "The parent lists the sizes, but the variation rows were saved without their own Attribute 1 value(s).",
    "Attribute columns were renamed in a spreadsheet, so the importer no longer recognises them.",
    "A variation was meant to cover any size, which WooCommerce writes as a blank value on export but doesn't accept on every import.",
  ],
  "ebay/invalid_relationship_details": [
    "Values were separated with commas instead of semicolons, as in Color=Blue,Red.",
    "Name and value pairs were written with a colon, as in Color: Blue, instead of Color=Blue.",
    "The parent row lists the option names without any values.",
  ],
  "ebay/variation_without_parent": [
    "The file was sorted by SKU or price, which separated variation rows from their parent.",
    "The parent row was deleted while the variations were kept.",
    "A blank row was left between the parent and its variations.",
  ],
  "ebay/variation_value_not_in_parent": [
    "A new size or colour was added to a variation row but not to the parent's RelationshipDetails.",
    "The same value is spelled differently on the two rows, for example Grey and Gray.",
    "Capitalisation or spacing differs, as in X-Large and XL.",
  ],
  "ebay/variation_specifics_mismatch": [
    "Only VariationSpecificsName was filled, with the values left for later.",
    "The number of names and values differs, such as Color|Size with only Blue.",
    "One of the two columns was dropped when the file was copied from another template.",
  ],
  "etsy/invalid_price": [
    "The price was copied from a listing page with the currency sign, as in $24.00.",
    "A spreadsheet set to a European locale saved the price with a decimal comma, as in 24,00.",
    "A price range such as 18-24 was typed for a listing whose variations have different prices.",
  ],
  "etsy/missing_price": [
    "The listing has variations, and the prices were only entered on the variations in Shop Manager, so the export has none.",
    "Rows were added for listings still in draft, before a price was set.",
    "A formula that looked up prices from another sheet returned nothing for new SKUs.",
  ],
  "etsy/invalid_quantity": [
    "A note such as \"made to order\" or \"in stock\" was typed instead of a number.",
    "The quantity came from an inventory sheet that stores fractions, as in 2.5.",
    "A stock count went below zero after an oversold item and was copied as -1.",
  ],
  "ebay/invalid_price": [
    "StartPrice was written with the currency, as in $19.99 or 19.99 USD; the currency is set in the Action column header.",
    "Thousands were separated with a comma, as in 1,299.00.",
    "An auction-style \"best offer\" note was typed into the price cell.",
  ],
  "ebay/missing_price": [
    "On a listing with variations, the price was put on the parent row instead of on each Variation row, or the other way round.",
    "Rows meant only to revise one field (Action=Revise) were treated as new listings.",
    "The price column came from a template that calls it Price instead of *StartPrice.",
  ],
  "ebay/invalid_quantity": [
    "Quantity was filled on the parent row of a multi-variation listing, as text such as \"varies\".",
    "Stock was exported from a warehouse system with decimals or negative numbers.",
    "A spreadsheet turned an empty quantity into a dash or the word none.",
  ],
  "amazon/invalid_price": [
    "The price was pasted from Seller Central with the currency sign, as in $29.99.",
    "A European locale saved the price with a decimal comma, as in 29,99.",
    "The cell holds a note like \"see listing\" or a price range instead of one number.",
  ],
  "amazon/missing_price": [
    "The file was meant to update only quantity, but add-delete is a (add/update), which needs a price.",
    "Prices were kept in a separate repricing tool and never copied into the file.",
    "Rows for new offers were added before the price was decided.",
  ],
  "amazon/invalid_quantity": [
    "Quantity was filled for an offer fulfilled by Amazon (FBA), where Amazon counts stock itself, as text like \"FBA\".",
    "A stock count went negative after overselling and was copied as -2.",
    "The value came from an inventory sheet with decimals, such as cases of 0.5.",
  ],
  "shopify/handle_title_mismatch": [
    "Variant rows repeat the product title with the option added, as in \"Linen Shirt - Blue\"; only the first row needs the Title.",
    "Two different products were given the same handle, so Shopify would merge them into one.",
    "The title was edited on one row during a spreadsheet clean-up, but not on the others.",
  ],
  "shopify/blank_handle": [
    "Products were added by hand to the bottom of an export, and only the Title column was filled.",
    "A file from another platform has no handle column, so every row is blank.",
    "Variant rows were left with an empty handle, expecting Shopify to use the row above; it needs the handle on every row.",
  ],
  "shopify/options_not_unique": [
    "A variant row was copied to add a new colour, and the option value wasn't changed on the copy.",
    "The product has two options, but only Option1 was filled, so Small/Blue and Small/Red both read as Small.",
    "Rows from two exports of the same product were combined, repeating every variant.",
  ],
  "shopify/missing_option1_for_variant_data": [
    "A variant row has its own SKU and price, but its size or colour was never filled in.",
    "Option values were cleared while an option was being removed, but the variant rows stayed.",
    "A product with one variant was given extra rows for stock in other locations, which look like new variants.",
  ],
  "woocommerce/parent_not_in_file": [
    "Only the variations were exported, for example by filtering the export to variable products' children.",
    "The parent's SKU was changed after the variations were created, so Parent no longer matches it.",
    "The file was split into several smaller files, and the parent ended up in a different one.",
  ],
  "woocommerce/variation_multiple_values": [
    "The parent's list of values, such as S | M | L, was copied down to every variation row.",
    "A variation meant for several sizes was given all of them, instead of one variation per size.",
    "Values were separated with commas on a variation row, which WooCommerce reads as a list.",
  ],
  "woocommerce/invalid_price": [
    "The price was copied with the currency symbol, as in €24.00.",
    "A spreadsheet in a European locale saved the price with a decimal comma, as in 24,00.",
    "Variable product parent rows were given a price range such as 18-24; prices belong on the variations.",
  ],
  "shopify/invalid_image_url": [
    "The image column holds a file name such as shirt.jpg from a folder on your computer; Shopify can only download from the web.",
    "The address was copied without https://, as in cdn.example.com/shirt.jpg.",
    "The address has spaces from the original file name, as in my shirt.jpg.",
  ],
  "etsy/invalid_image_url": [
    "IMAGE columns hold file names from your computer instead of web addresses.",
    "The address was copied without https://, as in i.etsystatic.com/photo.jpg.",
    "Several image addresses were put in one cell instead of in IMAGE1, IMAGE2 and so on.",
  ],
  "woocommerce/invalid_image_url": [
    "The Images column holds file names from the media folder instead of full addresses.",
    "Several images were separated with semicolons or line breaks; WooCommerce expects commas.",
    "The address was copied without https://, or contains spaces from the original file name.",
  ],
  "amazon/invalid_image_url": [
    "The cell holds a file name or a path on your computer instead of a web address.",
    "Several image addresses were put in one cell, separated by commas.",
    "The address was copied without https://, as in m.media-amazon.com/images/bottle.jpg.",
  ],
  "shopify/blank_title": [
    "A product's first row was deleted or sorted away, leaving only its variant rows, which have no Title.",
    "New products were added at the bottom of the file with a handle and price but no title yet.",
    "Titles were kept in a separate sheet and never copied into the file.",
  ],
  "etsy/missing_title": [
    "Rows were added for draft listings before their titles were written.",
    "Titles were kept in a separate sheet and never copied into the file.",
    "A formula that builds titles from other columns returned blank for some rows.",
  ],
  "ebay/missing_title": [
    "On a multi-variation listing, the title was put on a Variation row instead of on the parent row.",
    "The parent row was rebuilt by hand and only the SKU, price and quantity were filled in.",
    "Titles were left blank for listings that were only meant to be revised, but the Action is Add.",
  ],
  "etsy/duplicate_sku": [
    "Listings were duplicated in Shop Manager to create similar items, and the SKU was copied with them.",
    "The same supplier code is used for two different listings.",
    "Rows from two exports of the shop were combined.",
  ],
  "woocommerce/duplicate_sku": [
    "A variation has the same SKU as its parent product.",
    "Rows were copied in a spreadsheet to create similar products, and the SKU was kept on the copy.",
    "Two exports were combined, so products appear twice.",
  ],
  "amazon/duplicate_sku": [
    "The same offer was listed twice, for example once for each condition, under one SKU.",
    "Rows from two inventory files were merged without removing the overlap.",
    "SKUs were shortened to fit a character limit, and two of them became identical.",
  ],
  "shopify/invalid_integer_inventory_qty": [
    "Stock came from a warehouse system that counts in decimals, such as 2.5 boxes.",
    "The cell holds text such as \"in stock\", \"10+\" or \"n/a\".",
    "A spreadsheet formula returned an error such as #N/A for products it couldn't find.",
  ],
  "tiktok/missing_required_header": [
    "The feed was made for Google Merchant Center or Meta, which name the product identifier id; TikTok reads only sku_id.",
    "The file was exported straight from a store, so its columns use the store's names, such as Handle or Variant Price, instead of TikTok's.",
    "brand was left out because the feed was built for Meta or Google, where a GTIN or MPN can stand in for it.",
  ],
  "tiktok/missing_value": [
    "Products you make yourself have no brand in the store, so the brand column is empty for them.",
    "New products were added after the feed was set up and some fields were never filled in.",
    "A spreadsheet formula that builds a column returned an empty cell for some rows.",
  ],
  "tiktok/duplicate_id": [
    "Variants share their parent's sku_id because the feed used the product's ID instead of each variant's SKU.",
    "A row was copied to make a new variant and its sku_id wasn't changed.",
    "Two exports were combined, so some products appear twice.",
  ],
  "tiktok/unsupported_image": [
    "Images were stored in Google Drive or Dropbox and the share link was pasted into the feed.",
    "The store serves images as .webp or .gif, and the link points to that file.",
    "The image link was copied from a Pinterest or Flickr page rather than from your own store.",
  ],
  "tiktok/title_promotional": [
    "Store titles include offers such as \"Free Shipping\" or \"20% Off\" that work on the website but not in a catalog.",
    "Emoji were added to titles for social posts and the same titles were reused in the feed.",
    "A sale was added to every title in bulk and not removed afterwards.",
  ],
};

/** The common causes for an issue code, or an empty list. */
export function issueCauses(code: string): string[] {
  return ISSUE_CAUSES[code] ?? [];
}
