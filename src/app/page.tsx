// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero */}
      <section className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">Shopify CSV Fixer</p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Fix Shopify CSV import issues in seconds
          </h1>

          <p className="mt-4 text-lg text-[var(--muted)]">
            Upload your CSV, instantly see what’s wrong, auto-fix what’s safe, and export a clean
            file ready for Shopify.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rgb-btn bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white"
            >
              Start free — no account required
            </Link>

            <Link href="#how-it-works" className="rgb-btn bg-[var(--surface)] px-6 py-3 text-sm">
              See how it works
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
            <span>Files processed locally</span>
            <span>No forced signup</span>
            <span>Cancel anytime</span>
          </div>
        </div>

        {/* Visual placeholder */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--text)]">What it does</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Fix common CSV issues that break Shopify imports</li>
            <li>Validate files and explain errors in plain English</li>
            <li>Build Shopify-ready product CSVs from scratch</li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mt-20">
        <h2 className="text-2xl font-semibold">How it works</h2>

        <ol className="mt-6 grid gap-6 md:grid-cols-4">
          {[
            "Upload a CSV or start from scratch",
            "Fix or validate automatically",
            "Preview results",
            "Export a Shopify-ready CSV",
          ].map((step, i) => (
            <li
              key={i}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm"
            >
              <p className="font-semibold">Step {i + 1}</p>
              <p className="mt-1 text-[var(--muted)]">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing preview */}
      <section className="mt-24">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2 text-[var(--muted)]">
          Start free. Upgrade only when you need more exports or advanced formats.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <PricingCard
            title="Free"
            price="$0"
            features={[
              "3 exports per month per device",
              "Unlimited previews and diagnostics",
              "No account required",
            ]}
            cta="Start free"
            href="/app"
          />

          <PricingCard
            title="Basic"
            price="$3 / month"
            features={["Shopify product CSV exports", "100 exports per month", "Self-serve cancellation"]}
            cta="Choose Basic"
            href="/app"
          />

          <PricingCard
            title="Advanced"
            price="$10 / month"
            features={["Advanced Shopify formats", "Saved mappings + batch tools", "Higher export limits"]}
            cta="Choose Advanced"
            href="/app"
          />
        </div>
      </section>

      <footer className="mt-24 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
        Shopify is a trademark of Shopify Inc. This tool is not affiliated with or endorsed by Shopify.
      </footer>
    </main>
  );
}

function PricingCard({
  title,
  price,
  features,
  cta,
  href,
}: {
  title: string;
  price: string;
  features: string[];
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-2xl font-bold">{price}</p>

      <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
        {features.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>

      <Link
        href={href}
        className="rgb-btn mt-6 block bg-[var(--primary)] px-4 py-3 text-center text-sm font-semibold text-white"
      >
        {cta}
      </Link>
    </div>
  );
}
