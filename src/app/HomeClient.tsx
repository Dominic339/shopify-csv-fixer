"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PricingCards } from "@/components/ui/PricingCards";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import SEOJsonLd from "@/components/SEOJsonLd";
import type { Translations } from "@/lib/i18n/getTranslations";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref } from "@/lib/i18n/locales";
import { splitLocale } from "@/lib/i18n/paths";
import { FREE_EXPORTS_PER_MONTH } from "@/lib/plans";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  stripeCustomerId?: string | null;
};

type Props = {
  tHome: Translations["home"];
  tPricing: Translations["pricing"];
};

const kicker = "text-xs font-bold uppercase tracking-widest text-[var(--secondary-text)]";
const h2 = "text-3xl font-black tracking-tight sm:text-4xl";

export default function HomeClient({ tHome: t, tPricing }: Props) {
  const { locale } = splitLocale(usePathname() ?? "/");
  const href = (p: string) => localeHref(locale, p);

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
          stripeCustomerId: data?.stripe_customer_id ?? null,
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

  const steps = [
    { n: "01", title: t.step1Title, desc: t.step1Desc, tone: "text-[rgba(var(--accent-rgb),0.3)] group-hover:text-[rgba(var(--accent-rgb),0.55)]" },
    { n: "02", title: t.step2Title, desc: t.step2Desc, tone: "text-[rgba(var(--accent-rgb),0.3)] group-hover:text-[rgba(var(--accent-rgb),0.55)]" },
    { n: "03", title: t.step3Title, desc: t.step3Desc, tone: "text-[rgba(var(--secondary-rgb),0.3)] group-hover:text-[rgba(var(--secondary-rgb),0.55)]" },
  ];

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq5Q, a: fmt(t.faq5A, { count: FREE_EXPORTS_PER_MONTH }) },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ];

  return (
    <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-10 sm:px-6 sm:py-16">
      <SEOJsonLd />

      {/* ── Hero ── */}
      <section className="relative grid gap-10 md:grid-cols-2 md:items-center md:gap-12">
        
        <div className="relative z-10 min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.3)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t.heroBadge}
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-5xl md:text-6xl">
            {t.heroTitleA} <span className="gradient-text">{t.heroTitleB}</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">{t.heroDesc}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={`${href("/app")}?preset=shopify_products`} className="btn-primary text-center">
              {t.ctaFixer}
            </Link>
            <Link href={href("/presets")} className="rgb-btn px-6 py-3 text-center text-sm font-semibold text-[var(--text)]">
              {t.browseTemplates}
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
            {[t.trust1, t.trust2, fmt(t.trust3, { count: FREE_EXPORTS_PER_MONTH })].map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* CSV mock: what the fixer shows for a messy file */}
        <div className="relative min-w-0" aria-hidden="true">
                    <div className="relative rounded-2xl border border-[#2b313f] bg-[#161a23] p-4 font-mono text-[11px] text-slate-200 shadow-xl sm:p-5 sm:text-xs">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="hidden text-[10px] text-slate-400 sm:inline">products.csv</span>
              <span className="rounded-full border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">
                {fmt(t.mockIssues, { count: 5 })}
              </span>
            </div>
            <div className="mb-1 grid grid-cols-4 gap-2 border-b border-white/10 pb-2 text-[10px] font-semibold text-slate-400">
              <span>Handle</span>
              <span>Title</span>
              <span>Price</span>
              <span>Vendor</span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="grid grid-cols-4 gap-2 rounded py-1.5">
                <span className="truncate text-green-300/75">blue-shirt</span>
                <span className="truncate rounded bg-yellow-500/20 px-1 text-yellow-200">Blue Shirt␠</span>
                <span className="text-green-300/75">24.00</span>
                <span className="truncate text-green-300/75">Acme Co</span>
              </div>
              <div className="grid grid-cols-4 gap-2 rounded py-1.5">
                <span className="truncate text-green-300/75">red-hoodie</span>
                <span className="truncate text-green-300/75">Red Hoodie</span>
                <span className="rounded bg-yellow-500/20 px-1 text-yellow-200">$ 45</span>
                <span className="rounded bg-red-500/20 px-1 text-red-200/60">&nbsp;</span>
              </div>
              <div className="grid grid-cols-4 gap-2 rounded py-1.5">
                <span className="truncate rounded bg-yellow-500/20 px-1 text-yellow-200">Black Cap!</span>
                <span className="truncate text-green-300/75">Black Cap</span>
                <span className="rounded bg-yellow-500/20 px-1 text-yellow-200">18,00</span>
                <span className="truncate text-green-300/75">Acme Co</span>
              </div>
              <div className="grid grid-cols-4 gap-2 py-1 opacity-30">
                <span className="text-slate-500">···</span>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-[10px]">
              <span className="font-bold text-green-300">{t.mockAutoFix}</span>
              <span className="ml-1 text-green-300/70">{fmt(t.mockSummary, { fixes: 4, review: 1 })}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider mt-16 sm:mt-20" />

      {/* ── How it works ── */}
      <section className="mt-16 sm:mt-20">
        <div className="mb-10 sm:mb-14">
          <p className={kicker}>{t.howLabel}</p>
          <h2 className={`mt-3 ${h2}`}>{t.howTitle}</h2>
        </div>

        <ol className="space-y-8 sm:space-y-10">
          {steps.map((s, i) => (
            <li key={s.n} className={`group flex items-start gap-4 sm:gap-8 ${i === 1 ? "md:ml-20" : ""}`}>
              <div className={`w-12 shrink-0 select-none text-5xl font-black leading-none transition-colors sm:w-20 sm:text-7xl ${s.tone}`}>
                {s.n}
              </div>
              <div className="max-w-lg min-w-0 pt-1 sm:pt-2">
                <h3 className="text-lg font-bold text-[var(--text)] sm:text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="section-divider mt-16 sm:mt-20" />

      {/* ── Before / After ── */}
      <section className="mt-16 sm:mt-20">
        <p className={`mb-3 ${kicker}`}>{t.diffLabel}</p>
        <div className="overflow-hidden rounded-3xl border border-[var(--border)]">
          <div className="grid md:grid-cols-2">
            <div className="border-b border-red-500/15 bg-red-500/5 p-6 sm:p-8 md:border-b-0 md:border-r">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">{t.before}</span>
              </div>
              <ul className="space-y-4">
                {[t.before1, t.before2, t.before3, t.before4].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--accent-soft)] p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">{t.after}</span>
              </div>
              <ul className="space-y-4">
                {[t.after1, t.after2, t.after3, t.after4].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--text)]">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider mt-16 sm:mt-20" />

      {/* ── Feature rows ── */}
      <section className="mt-16 space-y-6 sm:mt-20">
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:items-center md:gap-10">
            <div className="min-w-0">
              <p className={kicker}>{t.csvFixerLabel}</p>
              <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t.fixerTitle}</h3>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{t.fixerDesc}</p>
              <div className="mt-6">
                <Link href={`${href("/app")}?preset=shopify_products`} className="btn-primary">
                  {t.openFixer}
                </Link>
              </div>
            </div>

            <FeatureList
              items={[
                { icon: "⚡", label: t.feat1Label, desc: t.feat1Desc },
                { icon: "🔍", label: t.feat2Label, desc: t.feat2Desc },
                { icon: "📦", label: t.feat3Label, desc: t.feat3Desc },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:items-center md:gap-10">
            <div className="min-w-0 md:order-last">
              <p className={kicker}>{t.customFormatsLabel}</p>
              <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t.customTitle}</h3>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{t.customDesc}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {canAccessCustomFormats ? (
                  <Link href="/formats" className="btn-primary">
                    {t.openCustomFormats}
                  </Link>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => setUpgradeOpen(true)}>
                    {t.upgradeToAdvanced}
                  </button>
                )}
                {!canAccessCustomFormats && <span className="text-xs text-[var(--muted)]">{t.advancedRequired}</span>}
              </div>
            </div>

            <FeatureList
              tinted
              items={[
                { icon: "📄", label: t.cf1Label, desc: t.cf1Desc },
                { icon: "🧩", label: t.cf2Label, desc: t.cf2Desc },
                { icon: "👥", label: t.cf3Label, desc: t.cf3Desc },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="section-divider mt-16 sm:mt-20" />

      {/* ── Why it's safe ── */}
      <section className="mt-16 sm:mt-20">
        <p className={`mb-3 ${kicker}`}>{t.safeLabel}</p>
        <h2 className={`mb-8 sm:mb-10 ${h2}`}>{t.safeTitle}</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { tone: "border-[var(--border)] bg-[var(--surface)]", icon: "bg-[var(--accent-soft)] text-[var(--accent-text)]", d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: t.safe1Title, desc: t.safe1Desc },
            { tone: "border-[var(--border)] bg-[var(--surface)]", icon: "bg-[var(--secondary-soft)] text-[var(--secondary-text)]", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: t.safe2Title, desc: t.safe2Desc },
            { tone: "border-[var(--border)] bg-[var(--surface)]", icon: "bg-[var(--accent-soft)] text-[var(--accent-text)]", d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", title: t.safe3Title, desc: t.safe3Desc },
          ].map(({ tone, icon, d, title, desc }) => (
            <div key={title} className={`rounded-2xl border p-5 ${tone}`}>
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${icon}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={d} />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider mt-16 sm:mt-20" />

      {/* ── Pricing ── */}
      <section className="mt-16 scroll-mt-24 sm:mt-20" id="pricing">
        <p className={kicker}>{t.pricingLabel}</p>
        <h2 className={`mt-3 mb-2 ${h2}`}>{t.pricingTitle}</h2>
        <p className="mb-8 max-w-xl text-sm leading-6 text-[var(--muted)]">{t.pricingDesc}</p>
        <PricingCards sub={sub} tPricing={tPricing} />
      </section>

      <div className="section-divider mt-16 sm:mt-20" />

      {/* ── FAQ ── */}
      <section className="mt-16 scroll-mt-24 sm:mt-20" id="faq">
        <p className={kicker}>{t.faqLabel}</p>
        <h2 className={`mt-3 mb-8 ${h2}`}>{t.faqTitle}</h2>

        <div className="grid gap-3">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-[var(--text)]">
                {q}
                <svg
                  className="ml-4 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
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
        title={t.upgradeModalTitle}
        message={t.upgradeModalMessage}
        signedIn={Boolean(sub?.signedIn)}
        upgradePlan="advanced"
        onClose={() => setUpgradeOpen(false)}
        labelClose={tPricing.close}
        labelViewPricing={tPricing.viewPricing}
        labelGoToAccount={tPricing.goToAccount}
        labelSignInToUpgrade={tPricing.signInToUpgrade}
      />
    </main>
  );
}

function FeatureList({ items, tinted }: { items: { icon: string; label: string; desc: string }[]; tinted?: boolean }) {
  return (
    <ul className="grid min-w-0 gap-3">
      {items.map(({ icon, label, desc }) => (
        <li
          key={label}
          className={`flex gap-4 rounded-2xl border p-4 ${
            tinted ? "border-[rgba(var(--accent-rgb),0.25)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]"
          }`}
        >
          <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text)]">{label}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
