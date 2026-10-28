# StriveFormats

Fix product CSVs for Shopify, WooCommerce, Etsy, eBay and Amazon before importing them.
Files are parsed, checked, fixed and exported **in the browser**; the server only handles
accounts, export quotas and billing. The site is in 13 languages.

Live: <https://striveformats.com>

## What's in it

| Tool | Route | What it does |
| --- | --- | --- |
| CSV Fixer | `/app` | Validates against a platform's rules, applies safe fixes, lets you edit the rest in a table, exports the file and a fix log. |
| CSV Inspector | `/csv-inspector` | Structure check for any CSV: delimiter, quoting, encoding, empty/duplicate columns, platform detection. |
| Format Converter | `/convert` | Moves products between the five platforms' layouts. |
| CSV Merger | `/merge` | Combines two files, optionally de-duplicating on a column. |
| Custom Formats | `/formats` | User-defined columns and rules, created from a sample CSV (Advanced plan). |

Platform landing pages (`/shopify-csv-fixer`, …), presets (`/presets/<id>`) and ~170 guides (`/guides/...`) are statically generated.

## Running it locally

Requires Node 22+ (CI uses 24; see `.nvmrc`).

```bash
npm ci
cp .env.example .env.local   # or create it; see below. Everything is optional for local work.
npm run dev                  # http://localhost:3000
```

Without any environment variables, every tool works; sign-in, the server-side quota and billing are simply unavailable (the free per-device quota still applies).

### Checks

```bash
npm run lint
npm test                 # Vitest unit tests
npm run build
npm run test:e2e         # Playwright (starts `next start` in CI, `next dev` locally)
```

CI (`.github/workflows/ci.yml`) runs all four on every push.

## Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirects | e.g. `https://striveformats.com`. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Accounts | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Quota, webhook, events | **Server only.** Never expose to the browser. |
| `STRIPE_SECRET_KEY` | Billing | Billing shows as unavailable when missing. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing | |
| `STRIPE_WEBHOOK_SECRET` | Billing | Signing secret of the webhook endpoint below. |
| `STRIPE_PRICE_BASIC` | Billing | Price ID (`price_...`) of the Basic plan. Also used to tell plans apart in webhooks. |
| `STRIPE_PRICE_ADVANCED` | Billing | Price ID of the Advanced plan. |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Optional. `/api/*` is rate limited when set (fails open when not). |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Optional. |
| `NEXT_PUBLIC_GA_ID` | Analytics | Optional Google Analytics ID. |

## Supabase

Run the files in `supabase/migrations/` in order, in the Supabase SQL Editor. Each one is safe to run more than once.

1. `20260101000000_base_schema.sql`: `profiles`, `user_subscriptions`, `export_usage`, RLS.
2. `20260301000000_profiles_events_leads.sql`: profile trigger, `tool_events`, `lead_emails`.
3. `20261028000000_atomic_quota_and_stripe_events.sql`: `consume_exports()` (atomic quota), `stripe_events` (webhook de-duplication), and removal of a direct-insert policy on `tool_events`.

The code falls back to slower, non-atomic behaviour if migration 3 hasn't been run yet.

## Stripe

1. Create two recurring prices (Basic and Advanced) and put their IDs in `STRIPE_PRICE_BASIC` / `STRIPE_PRICE_ADVANCED`.
2. Add a webhook endpoint at `https://<your-site>/api/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Put the endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Enable the Customer Portal (used for "Manage billing").

## Plans and quota

Defined in `src/lib/plans.ts`. Checking and fixing are always free; only exports count.

- **Free:** 3 exports a month, counted per device in `localStorage` (no account needed) or per account when signed in.
- **Basic:** 100 exports a month.
- **Advanced:** unlimited, plus Custom Formats.

The server is the source of truth for signed-in users (`/api/quota/consume` calls `consume_exports()`); the client falls back to the local count only when the server can't be reached.

## How the code is organised

```
src/
  app/                 Routes. Most pages are thin wrappers around src/views/*.
    [locale]/          The same pages under /de, /ja, ... (English lives at the root).
    app/fixer/         The CSV Fixer: useFixer.ts (state + logic) and its panels.
    api/               Quota, Stripe checkout/portal/webhook, events, leads.
  views/               Page bodies shared by the English and localized routes.
  lib/
    formats/           Format registry, engine, custom (user) formats.
    shopify*.ts        Shopify schema, validation and output shaping.
    *Optimizer.ts      WooCommerce, Etsy, eBay, Amazon validators/fixers.
    validation/        Issue metadata (titles, explanations, blocking), scoring, readiness.
    processCsv*.ts     Parsing + validation, in a Web Worker for large files.
    convertCsv.ts      Cross-platform converter (Product/Variant model).
    landing/           Content and live demos for the platform landing pages.
    i18n/              Locale helpers, translation loading, hreflang/SEO.
  i18n/*.json          Translations. en.json is the source of truth; a test fails
                       if any locale is missing a key or a {placeholder}.
supabase/migrations/   Database schema.
tests/                 Accuracy tests per platform, converter, inspector; e2e/ for Playwright.
```

### Adding or changing a check

1. Emit the issue from the platform's validator with a stable `code` (e.g. `amazon/invalid_quantity`).
2. Add metadata for the code in `src/lib/validation/issueMeta<Platform>.ts`. This drives the issue tooltip, whether it blocks the import, scoring, the preset page's check list and an auto-generated guide page.
3. Add a test in `tests/platformAccuracy.spec.ts` (or `shopifyAccuracy.spec.ts`).

Errors block the import unless their metadata says `blocking: false`.

### Translations

User-facing strings live in `src/i18n/<locale>.json`. Add the English key to `en.json`, then the same key to every other locale with the same `{placeholders}`; `src/lib/i18n/i18n.test.ts` checks both. Guide articles and preset write-ups are English only, and their localized URLs point their canonical at the English page.

## Deployment

Built for Vercel's free tier: pages are statically generated where possible, CSV work happens in the browser, and the only server work is auth, quota and billing. Set the environment variables above in the Vercel project and run the Supabase migrations once.
