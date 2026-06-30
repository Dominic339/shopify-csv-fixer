"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PricingCards } from "@/components/ui/PricingCards";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import SEOJsonLd from "@/components/SEOJsonLd";
import type { Translations } from "@/lib/i18n/getTranslations";
import { localeHref, DEFAULT_LOCALE, isValidLocale, type Locale } from "@/lib/i18n/locales";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  stripeCustomerId?: string | null;
};

type Props = {
  tHome?: Translations["home"];
  tPricing?: Translations["pricing"];
};

export default function HomeClient({ tHome, tPricing }: Props) {
  const pathname = usePathname();
  const currentLocale: Locale = (() => {
    const segment = pathname?.split("/")?.[1] ?? "";
    return isValidLocale(segment) ? segment : DEFAULT_LOCALE;
  })();

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!session?.user) {
          setSub({ signedIn: false, plan: "free", status: "none" });
          return;
        }

        const { data } = await supabase
          .from("user_subscriptions")
          .select("plan,status,stripe_customer_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (cancelled) return;

        const activePlan = data?.status === "active" ? data.plan : "free";

        setSub({
          signedIn: true,
          plan: (activePlan ?? "free") as SubStatus["plan"],
          status: data?.status ?? "none",
          stripeCustomerId: (data as any)?.stripe_customer_id ?? null,
        });
      } catch {
        if (!cancelled) {
          setSub({ signedIn: false, plan: "free", status: "none" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAdvanced = useMemo(() => {
    return !!sub?.signedIn && sub.plan === "advanced" && sub.status === "active";
  }, [sub]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <SEOJsonLd />

      {/* ── Hero ── */}
      <section className="relative grid gap-12 md:grid-cols-2 md:items-center">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-green-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            StriveFormats
          </p>

          <h1 className="mt-4 text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Fix Shopify CSV errors<br />
            <span className="gradient-text">before they break</span><br />
            your import
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">
            Upload a messy CSV, auto-fix safe issues, review anything risky, and export a cleaner
            file in minutes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app?preset=shopify_products" className="btn-primary">
              Try the CSV Fixer
            </Link>
            <Link href={localeHref(currentLocale, "/presets")} className="rgb-btn px-6 py-3 text-sm font-semibold text-[var(--text)]">
              {tHome?.browseTemplates ?? "Browse templates"}
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
            {["Files processed locally", "No forced signup to explore", "Review edits before export"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-400" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CSV mock visual */}
        <div className="relative hidden md:block">
          <div className="pointer-events-none absolute inset-0 -m-6 rounded-3xl bg-gradient-to-br from-green-500/10 via-cyan-500/8 to-blue-500/5 blur-2xl" />
          <div className="relative rounded-2xl border border-cyan-500/25 bg-[rgba(4,10,22,0.85)] p-5 font-mono text-xs shadow-2xl backdrop-blur-sm">
            {/* window chrome */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-cyan-400/50">products.csv</span>
              <span className="rounded-full border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">
                4 issues found
              </span>
            </div>
            {/* header row */}
            <div className="mb-1 grid grid-cols-4 gap-2 border-b border-cyan-500/15 pb-2 text-[10px] font-semibold text-cyan-400/60">
              <span>Handle</span>
              <span>Title</span>
              <span>Price</span>
              <span>Vendor</span>
            </div>
            {/* data rows */}
            <div className="space-y-1 pt-1">
              <div className="grid grid-cols-4 gap-2 rounded py-1.5">
                <span className="text-green-300/75">blue-shirt</span>
                <span className="rounded bg-yellow-500/20 px-1 text-yellow-200">Blue Shirt </span>
                <span className="text-green-300/75">24.00</span>
                <span className="text-green-300/75">Acme Co</span>
              </div>
              <div className="grid grid-cols-4 gap-2 rounded py-1.5">
                <span className="text-green-300/75">red-hoodie</span>
                <span className="text-green-300/75">Red Hoodie</span>
                <span className="rounded bg-red-500/20 px-1 text-red-200">$ 45</span>
                <span className="rounded bg-red-500/20 px-1 text-red-200/60">&nbsp;</span>
              </div>
              <div className="grid grid-cols-4 gap-2 rounded py-1.5">
                <span className="text-green-300/75">black-cap</span>
                <span className="rounded bg-yellow-500/20 px-1 text-yellow-200">  black cap</span>
                <span className="text-green-300/75">18.00</span>
                <span className="text-green-300/75">Acme Co</span>
              </div>
              <div className="grid grid-cols-4 gap-2 py-1 opacity-30">
                <span className="text-cyan-400">···</span>
              </div>
            </div>
            {/* fix notice */}
            <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-[10px]">
              <span className="font-bold text-green-300">Auto-fix ready:</span>
              <span className="ml-1 text-green-300/70">2 safe fixes · 2 need review</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="section-divider mt-20" />

      {/* ── How it works — staggered ── */}
      <section className="mt-20">
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">How it works</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">
            Three steps to a <span className="gradient-text">cleaner file</span>
          </h2>
        </div>

        <div className="space-y-10">
          {/* Step 1 */}
          <div className="group flex items-start gap-8">
            <div className="w-20 shrink-0 select-none text-7xl font-black leading-none text-green-500/20 transition-colors group-hover:text-green-500/35">
              01
            </div>
            <div className="pt-2 max-w-lg">
              <div className="text-xl font-bold text-[var(--text)]">Upload your CSV</div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Start with a Shopify or ecommerce file that needs cleanup, validation, or conversion.
                Any platform, any mess.
              </p>
            </div>
          </div>

          {/* Step 2 — indented */}
          <div className="group flex items-start gap-8 md:ml-20">
            <div className="w-20 shrink-0 select-none text-7xl font-black leading-none text-cyan-500/20 transition-colors group-hover:text-cyan-500/35">
              02
            </div>
            <div className="pt-2 max-w-lg">
              <div className="text-xl font-bold text-[var(--text)]">Review detected issues</div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                See what can be fixed safely, what needs your eyes, and exactly which cells are
                flagged — nothing changed without you knowing.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="group flex items-start gap-8">
            <div className="w-20 shrink-0 select-none text-7xl font-black leading-none text-blue-500/20 transition-colors group-hover:text-blue-500/35">
              03
            </div>
            <div className="pt-2 max-w-lg">
              <div className="text-xl font-bold text-[var(--text)]">Export a cleaner file</div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Download a standardized CSV you can trust before your final import. No surprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="section-divider mt-20" />

      {/* ── Before / After ── */}
      <section className="mt-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-cyan-400">The difference</p>
        <div className="overflow-hidden rounded-3xl border border-[var(--border)]">
          <div className="grid md:grid-cols-2">
            {/* Before */}
            <div className="border-b border-red-500/15 bg-red-950/25 p-8 md:border-b-0 md:border-r">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-red-400">Before</span>
              </div>
              <div className="space-y-4">
                {[
                  "Extra spaces and inconsistent formatting",
                  "Empty cells in important columns",
                  "Repetitive cleanup work by hand",
                  "No clear signal on what's safe to change",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-red-200/65">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="bg-green-950/20 p-8">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-green-400">After</span>
              </div>
              <div className="space-y-4">
                {[
                  "Cleaner formatting and normalized values",
                  "Issues grouped and prioritized for faster review",
                  "Safe auto-cleanup where it's appropriate",
                  "More confidence before you upload and export",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-green-200/75">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="section-divider mt-20" />

      {/* ── Feature rows ── */}
      <section className="mt-20 space-y-6">
        {/* CSV Fixer */}
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="grid gap-10 p-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                {tHome?.csvFixerLabel ?? "CSV Fixer"}
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-tight">
                Fix ecommerce CSV files <span className="gradient-text">faster</span>
              </h3>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Choose a platform, upload your CSV, and let the tool clean safe issues automatically.
                Review anything risky, adjust what matters, and export a cleaner file.
              </p>
              <div className="mt-6">
                <Link href="/app?preset=shopify_products" className="btn-primary">
                  Open the fixer
                </Link>
              </div>
            </div>

            {/* mini feature list */}
            <div className="grid gap-3">
              {[
                { icon: "⚡", label: "Auto-fix safe issues", desc: "Trim spaces, normalize empties, fix consistent patterns." },
                { icon: "🔍", label: "Flag anything risky", desc: "Changes that could alter meaning are surfaced for review." },
                { icon: "📦", label: "Multi-platform support", desc: "Shopify, WooCommerce, eBay, Etsy, Amazon and more." },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <span className="text-xl leading-none">{icon}</span>
                  <div>
                    <div className="text-sm font-bold text-[var(--text)]">{label}</div>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Formats */}
        <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/8 to-[var(--bg)]">
          <div className="grid gap-10 p-8 md:grid-cols-2 md:items-center">
            {/* feature list — left this time */}
            <div className="grid gap-3 md:order-first">
              {[
                { icon: "💾", label: "Save reusable rules", desc: "Define column templates and cleanup logic once, reuse forever." },
                { icon: "🔁", label: "Built for repeat imports", desc: "Recurring jobs get faster over time, not slower." },
                { icon: "👥", label: "Useful for teams", desc: "Share consistent formats across everyone touching the data." },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex gap-4 rounded-2xl border border-cyan-500/18 bg-[rgba(6,182,212,0.07)] p-4">
                  <span className="text-xl leading-none">{icon}</span>
                  <div>
                    <div className="text-sm font-bold text-[var(--text)]">{label}</div>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                {tHome?.customFormatsLabel ?? "Custom Formats"}
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-tight">
                Save reusable <span className="gradient-text">cleanup rules</span>
              </h3>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Create reusable templates for repeat jobs so future cleanup takes seconds.
                Useful for teams, recurring imports, and workflows you run more than once.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {canAccessCustomFormats ? (
                  <Link href="/formats" className="btn-primary">
                    {tHome?.openCustomFormats ?? "Open Custom Formats"}
                  </Link>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => setUpgradeOpen(true)}>
                    {tHome?.upgradeToAdvanced ?? "Upgrade to Advanced"}
                  </button>
                )}
                {!canAccessCustomFormats && (
                  <span className="text-xs text-[var(--muted)]">
                    {tHome?.advancedRequired ?? "Advanced plan required."}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="section-divider mt-20" />

      {/* ── Why it's safer ── */}
      <section className="mt-20">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-cyan-400">Why this feels safer</p>
        <h2 className="mb-10 text-4xl font-black tracking-tight">
          Control stays <span className="gradient-text">with you</span>
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              color: "green" as const,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: "Local-first workflow",
              desc: "Core parsing, editing, and export run entirely in your browser. Your data doesn't leave unless you choose.",
            },
            {
              color: "cyan" as const,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
              title: "Manual review where needed",
              desc: "Potentially risky changes are separated so you stay in full control of the data that matters most.",
            },
            {
              color: "blue" as const,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
              title: "Built for repeat use",
              desc: "Great for sellers and operators who regularly clean files for imports and product updates.",
            },
          ].map(({ color, icon, title, desc }) => (
            <div
              key={title}
              className={`rounded-2xl border p-5 ${
                color === "green"
                  ? "border-green-500/20 bg-green-500/8"
                  : color === "cyan"
                  ? "border-cyan-500/20 bg-cyan-500/8"
                  : "border-blue-500/20 bg-blue-500/8"
              }`}
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                  color === "green"
                    ? "bg-green-500/20 text-green-400"
                    : color === "cyan"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {icon}
              </div>
              <div className="text-sm font-bold text-[var(--text)]">{title}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="section-divider mt-20" />

      {/* ── Pricing ── */}
      <section className="mt-20" id="pricing">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Pricing</p>
        <h2 className="mt-3 mb-2 text-4xl font-black tracking-tight">
          Start free. <span className="gradient-text">Upgrade when ready.</span>
        </h2>
        <p className="mb-8 max-w-xl text-sm leading-6 text-[var(--muted)]">
          No card required to get started. Higher limits and custom formats unlock on paid plans.
        </p>
        <PricingCards sub={sub} tPricing={tPricing} />
      </section>

      {/* ── Divider ── */}
      <div className="section-divider mt-20" />

      {/* ── FAQ ── */}
      <section className="mt-20" id="faq">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
          {tHome?.faqLabel ?? "FAQ"}
        </p>
        <h2 className="mt-3 mb-8 text-4xl font-black tracking-tight">
          {tHome?.faqTitle ?? "Quick answers"}
        </h2>

        <div className="grid gap-3">
          {[
            {
              q: tHome?.faq1Q ?? "Do you upload my CSV to a server?",
              a: tHome?.faq1A ?? "The fixer runs in your browser for the core parsing and edits. When you export, your cleaned CSV is generated locally.",
            },
            {
              q: tHome?.faq2Q ?? "What kinds of problems can it fix automatically?",
              a: tHome?.faq2A ?? "Safe fixes include trimming extra spaces, normalizing empty cells, and applying consistent formatting. Anything that could change meaning is flagged so you can review it before export.",
            },
            {
              q: tHome?.faq3Q ?? "What are Custom Formats?",
              a: tHome?.faq3A ?? "Custom Formats let you save reusable column templates and cleanup rules so repeat jobs take seconds. Advanced plan is required for creating and managing formats.",
            },
            {
              q: tHome?.faq4Q ?? "Can I cancel or change plans later?",
              a: tHome?.faq4A ?? "Yes. You can upgrade, downgrade, or cancel from your Profile at any time.",
            },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-[var(--text)]">
                {q}
                <svg
                  className="ml-4 h-4 w-4 shrink-0 text-cyan-400 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <UpgradeModal
        open={upgradeOpen}
        title={tHome?.upgradeModalTitle ?? "Advanced only"}
        message={
          tHome?.upgradeModalMessage ??
          "Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        }
        signedIn={Boolean(sub?.signedIn)}
        upgradePlan="advanced"
        onClose={() => setUpgradeOpen(false)}
        labelClose={tPricing?.close}
        labelViewPricing={tPricing?.viewPricing}
        labelGoToAccount={tPricing?.goToAccount}
        labelSignInToUpgrade={tPricing?.signInToUpgrade}
      />
    </main>
  );
}
