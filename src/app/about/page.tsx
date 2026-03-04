import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About StriveFormats",
  description:
    "StriveFormats is an in-browser CSV fixer for ecommerce imports. Validate Shopify and other templates, apply safe auto-fixes, and export clean import-ready files.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--text)]">About StriveFormats</h1>
        <p className="mt-3 text-base text-[color:rgba(var(--muted-rgb),1)]">
          StriveFormats helps you clean, standardize, and validate CSV files before you import them into ecommerce
          platforms. It runs in the browser, applies format-specific checks, and exports a file you can trust.
        </p>
      </header>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">What it does</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-[color:rgba(var(--muted-rgb),1)]">
          <li>Validates your CSV against a known import template (starting with Shopify Products).</li>
          <li>Auto-fixes safe issues (whitespace, basic normalization) and flags risky issues for review.</li>
          <li>Exports a clean CSV using the expected headers and consistent formatting.</li>
          <li>Provides preset templates and “View information” pages so you can see what each platform expects.</li>
        </ul>
      </section>

      <section className="mt-7 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">1) Pick a format</div>
            <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Use a preset (Shopify, WooCommerce, Etsy, Amazon, eBay) or create a reusable Custom Format on the
              Advanced plan.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">2) Upload and validate</div>
            <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              StriveFormats reads your CSV, normalizes headers, and runs checks for missing required fields,
              inconsistent values, and import blockers.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">3) Auto-fix safe issues</div>
            <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Safe fixes can be applied automatically. Risky issues are shown as warnings or errors so you can
              make informed changes.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">4) Export clean CSV</div>
            <p className="mt-2 text-base text-[color:rgba(var(--muted-rgb),1)]">
              Export a clean file with the expected headers and normalized values so imports succeed more
              reliably.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">Privacy and where your data goes</h2>
        <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          StriveFormats is designed to run in-browser for fast iteration and a simple workflow. Your CSV is
          processed on your device for validation and export. If you choose to use account features (like plan
          status, usage limits, or Custom Formats), the app may store small settings locally and call the StriveFormats
          API to verify your subscription.
        </p>
      </section>

      <section className="mt-7 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h2 className="text-xl font-semibold text-[var(--text)]">Why presets and landing pages matter</h2>
        <p className="mt-4 text-base text-[color:rgba(var(--muted-rgb),1)]">
          Each preset format includes a landing page that documents expected columns, example rows, common fixes,
          and how the import template works. These pages help users choose the right template quickly and also
          improve discoverability through search.
        </p>
      </section>
    </main>
  );
}
