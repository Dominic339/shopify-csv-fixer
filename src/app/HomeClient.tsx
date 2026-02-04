// src/app/HomeClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

export default function HomeClient() {
  const [sub, setSub] = useState<SubStatus | null>(null);

  async function refresh() {
    const r = await fetch("/api/subscription/status", { cache: "no-store" });
    const j = (await r.json()) as SubStatus;
    setSub(j);
  }

  useEffect(() => {
    refresh().catch(() => setSub(null));
  }, []);

  const isActive = sub?.signedIn && sub?.plan !== "free";

  const planLabel = useMemo(() => {
    if (!sub?.signedIn) return "Free (not signed in)";
    if (sub.plan === "basic") return "Basic";
    if (sub.plan === "advanced") return "Advanced";
    return "Free";
  }, [sub]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-sm text-[var(--muted)]">Shopify CSV Fixer</p>

          <h1 className="mt-2 text-4xl font-semibold leading-tight text-[var(--text)]">
            Fix Shopify CSV import issues in seconds
          </h1>

          <p className="mt-4 max-w-xl text-[var(--muted)]">
            Upload your CSV, instantly see what&apos;s wrong, auto-fix what’s safe, and export a clean
            file ready for Shopify.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {/* FIX: remove text-white so it’s black in light mode */}
            <Link
              href="/app"
              className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)]"
            >
              Start free no account required
            </Link>

            <Link
              href="/how-it-works"
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)]"
            >
              See how it works
            </Link>
          </div>

          <div className="mt-4 text-xs text-[var(--muted)]">
            Files processed locally · No forced signup · Cancel anytime
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-base font-semibold text-[var(--text)]">What it does</h2>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Fix common CSV issues that break Shopify imports</li>
            <li>Validate files and explain errors in plain English</li>
            <li>Build Shopify-ready product CSVs from scratch</li>
          </ul>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Your plan</div>
            <div className="mt-1 text-sm text-[var(--muted)]">{sub ? planLabel : "Loading…"}</div>

            {isActive ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/profile"
                  className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)]"
                >
                  Manage subscription
                </Link>

                {/* FIX: remove text-white here too so it’s readable in light mode */}
                <Link
                  href="/app"
                  className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)]"
                >
                  Open app
                </Link>
              </div>
            ) : (
              <div className="mt-4 text-sm text-[var(--muted)]">
                Subscribe below to raise your export limits.
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-14 text-xl font-semibold text-[var(--text)]">Pricing</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Start free. Upgrade only when you need more exports or advanced formats.
      </p>

      {isActive ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm text-[var(--muted)]">
            You’re subscribed to <span className="font-semibold text-[var(--text)]">{planLabel}</span>.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)]"
            >
              Upgrade / cancel
            </Link>

            {/* FIX: remove text-white here too */}
            <Link
              href="/app"
              className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)]"
            >
              Open app
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <PriceCard
            title="Free"
            price="$0"
            bullets={[
              "3 exports per month per account",
              "Unlimited previews and diagnostics",
              "No account required",
            ]}
            cta="Start free"
            href="/app"
          />
          <PriceCard
            title="Basic"
            price="$3 / month"
            bullets={["Shopify product CSV exports", "100 exports per month", "Self-serve cancellation"]}
            cta="Choose Basic"
            href="/checkout?plan=basic"
          />
          <PriceCard
            title="Advanced"
            price="$10 / month"
            bullets={["Advanced Shopify formats", "Saved mappings + batch tools", "Higher export limits"]}
            cta="Choose Advanced"
            href="/checkout?plan=advanced"
          />
        </div>
      )}
    </main>
  );
}

function PriceCard(props: {
  title: string;
  price: string;
  bullets: string[];
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="text-sm font-semibold text-[var(--text)]">{props.title}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{props.price}</div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
        {props.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          href={props.href}
          className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)]"
        >
          {props.cta}
        </Link>
      </div>
    </div>
  );
}
