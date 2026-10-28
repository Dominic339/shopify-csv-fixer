# Getting the translated pages into Google

Every page that exists in other languages has its own address (`/de/…`, `/ja/…`).
Each one lists all its language versions in the page head (hreflang), and every
version is in `https://striveformats.com/sitemap.xml`. Crawlers are never redirected
by language: a request without an `Accept-Language` header gets the English page,
which links to the others.

These steps need your Google account, so only you can do them. Do them after the
branch is merged and deployed.

## One-time setup

1. Open [Google Search Console](https://search.google.com/search-console) and add
   the property. A **Domain** property (`striveformats.com`, verified with a DNS TXT
   record at your domain registrar) covers `www`, `http` and every path in one go.
2. Go to **Sitemaps**, enter `sitemap.xml` and press **Submit**. The status should
   turn to "Success" within a day, listing the translated URLs as well as the English ones.
3. Optional: do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters).
   It can import the site straight from Search Console, and Bing also feeds DuckDuckGo
   and Yahoo. If you want reach in Korea or China, Naver Search Advisor and Baidu
   Webmaster Tools work the same way (sign up, verify, submit the sitemap).

## Speed up the first crawl (optional)

Use **URL Inspection** on a few key translated pages, for example
`https://striveformats.com/de/shopify-csv-fixer`, then press **Request indexing**.
Google allows about 10 of these a day; the sitemap covers the rest.

## Check that it worked (after 1 to 3 weeks)

- **Pages** (indexing report): the `/de/`, `/fr/`, `/ja/`… URLs should move to
  "Indexed". "Discovered – currently not indexed" just means Google has not got to
  them yet. "Duplicate, Google chose different canonical" on a translated page is
  worth looking into, so send me the URL.
- **URL Inspection** on a translated page: "User-declared canonical" should be the
  page itself (for example `/de/shopify-csv-fixer`), not the English one.
- **Performance**: add a **Country** filter (Germany, Japan, Brazil…) and look at
  the **Pages** tab to see which language versions are getting impressions, and at
  **Queries** to see the words people in that country actually type. If you send me
  that list, I can tune the titles and descriptions further.
