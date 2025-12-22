import Link from "next/link";

function Card({ title, price, bullets, cta }: { title: string; price: string; bullets: string[]; cta: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-[var(--text)]">{price}</p>
      <ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      <Link
        href="/app"
        className="rgb-btn bg-[var(--primary)] text-white text-sm w-full"
      >
        {cta}
      </Link>
    </div>
  );
}

export function PricingCards() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--text)]">Pricing</h2>
      <p className="mt-2 text-[var(--muted)]">Start free. Upgrade only when you need more exports or advanced formats.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card title="Free" price="$0" bullets={["3 exports per month per device", "Unlimited previews and diagnostics", "No account required"]} cta="Start free" />
        <Card title="Basic" price="$3 / month" bullets={["Shopify product CSV exports", "100 exports per month", "Self-serve cancellation"]} cta="Open app" />
        <Card title="Advanced" price="$10 / month" bullets={["Advanced Shopify formats", "Saved mappings + batch tools", "Higher export limits"]} cta="Open app" />
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">Subscriptions are handled securely by Stripe. Cancel anytime from your billing portal.</p>
    </div>
  );
}
