"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { PricingCards } from "@/components/ui/PricingCards";
import { Screenshot } from "@/components/ui/Screenshot";
import FAQJsonLd from "@/components/FAQJsonLd";
import SEOJsonLd from "@/components/SEOJsonLd";
import { LogoMark } from "@/components/brand/Logo";
import type { Translations } from "@/lib/i18n/getTranslations";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref, LOCALES } from "@/lib/i18n/locales";
import { splitLocale } from "@/lib/i18n/paths";
import { FREE_EXPORTS_PER_MONTH, FREE_ROWS_PER_EXPORT } from "@/lib/plans";
import { getSupabase } from "@/lib/supabase/browser";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  stripeCustomerId?: string | null;
};

type Props = {
  tHome: Translations["home"];
  tPricing: Translations["pricing"];
  /** Number of import checks across the built-in formats. */
  checksCount: number;
};

const PLATFORMS = [
  { name: "Shopify", path: "/shopify-csv-fixer" },
  { name: "WooCommerce", path: "/woocommerce-csv-fixer" },
  { name: "Etsy", path: "/etsy-csv-fixer" },
  { name: "eBay", path: "/ebay-csv-fixer" },
  { name: "Amazon", path: "/amazon-csv-fixer" },
];

const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary-text)]";
const h2 = "text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl";
const lead = "text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8";

function Check() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  );
}

function Cross() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-[var(--muted)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}

export default function HomeClient({ tHome: t, tPricing, checksCount }: Props) {
  const { locale } = splitLocale(usePathname() ?? "/");
  const href = (p: string) => localeHref(locale, p);
  const [sub, setSub] = useState<SubStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setSub({ signedIn: false, plan: "free", status: "none" });
          return;
        }
        const { data } = await supabase.from("user_subscriptions").select("plan,status,stripe_customer_id").eq("user_id", session.user.id).maybeSingle();
        if (cancelled) return;
        const activePlan = data?.status === "active" ? data.plan : "free";
        setSub({
          signedIn: true,
          plan: (activePlan ?? "free") as SubStatus["plan"],
          status: data?.status ?? "none",
          stripeCustomerId: data?.stripe_customer_id ?? null,
        });
      } catch {
        if (!cancelled) setSub({ signedIn: false, plan: "free", status: "none" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq6Q, a: t.faq6A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq5Q, a: fmt(t.faq5A, { count: FREE_EXPORTS_PER_MONTH }) },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ];

  const stats = [
    { value: String(checksCount), label: t.statChecks },
    { value: String(PLATFORMS.length), label: t.statPlatforms },
    { value: String(LOCALES.length), label: t.statLanguages },
    { value: "0", label: t.statUploads },
  ];

  const showcases = [
    { eyebrow: t.show1Label, title: t.show1Title, desc: t.show1Desc, points: [t.show1Point1, t.show1Point2, t.show1Point3], shot: "step-issues" as const, alt: t.show1Alt },
    { eyebrow: t.show2Label, title: t.show2Title, desc: t.show2Desc, points: [t.show2Point1, t.show2Point2, t.show2Point3], shot: "step-export" as const, alt: t.show2Alt },
    {
      eyebrow: t.show3Label,
      title: t.show3Title,
      desc: t.show3Desc,
      points: [t.show3Point1, t.show3Point2, t.show3Point3],
      shot: "convert" as const,
      alt: t.show3Alt,
      link: { href: "/migrate", label: t.show3Link },
    },
  ];

  // StriveFormats vs. pasting the file into a general AI chatbot.
  const aiRows = [
    { topic: t.aiRow1Topic, us: t.aiRow1Us, them: t.aiRow1Them },
    { topic: t.aiRow2Topic, us: t.aiRow2Us, them: t.aiRow2Them },
    { topic: t.aiRow3Topic, us: fmt(t.aiRow3Us, { checks: checksCount }), them: t.aiRow3Them },
    { topic: t.aiRow4Topic, us: t.aiRow4Us, them: t.aiRow4Them },
    { topic: t.aiRow5Topic, us: t.aiRow5Us, them: t.aiRow5Them },
  ];

  const steps = [
    { title: t.step1Title, desc: t.step1Desc },
    { title: t.step2Title, desc: t.step2Desc },
    { title: t.step3Title, desc: t.step3Desc },
  ];

  return (
    <main className="overflow-x-clip">
      <SEOJsonLd />
      <FAQJsonLd items={faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* ── Hero: an ink band, with the product shot and stats on it ── */}
      <div data-theme="dark" className="ink-band">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-24">
          <div className="lg:col-span-5">
            <p className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {t.heroBadge}
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              {t.heroTitleA} <span className="text-[var(--accent-text)]">{t.heroTitleB}</span>
            </h1>
            <p className={`mt-6 max-w-xl ${lead}`}>{t.heroDesc}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={href("/app")} className="btn-primary px-6 py-3 text-base">
                {t.ctaFixer}
              </Link>
              <Link href={href("/how-it-works")} className="glass inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-[var(--text)] transition-colors hover:bg-white/10">
                {t.ctaHowItWorks}
              </Link>
            </div>
            <ul className="mt-7 space-y-2 text-sm text-[var(--muted)]">
              {[t.trust1, t.trust2, fmt(t.trustSmallFiles, { rows: FREE_ROWS_PER_EXPORT })].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          {/* Product shot, tilted, with a few of the fixes it makes floating over it */}
          <div className="relative lg:col-span-7">
            <div className="glow-frame lg:[transform:perspective(1800px)_rotateY(-7deg)_rotateX(2deg)]">
              <Screenshot name="hero" alt={t.heroShotAlt} priority frame={false} className="!rounded-[calc(1.25rem-1px)] !border-0 !shadow-none" sizes="(min-width: 1024px) 760px, 100vw" />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden sm:block">
              <span className="float-chip absolute -left-4 top-[18%] flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs text-[var(--text)] shadow-lg lg:-left-10">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                $19.99 → 19.99
              </span>
              <span className="float-chip delay-1 absolute -right-3 top-[44%] flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs text-[var(--text)] shadow-lg">
                <span className="h-2 w-2 rounded-full bg-[var(--secondary)]" />
                Blue Shirt → blue-shirt
              </span>
              <span className="float-chip delay-2 absolute bottom-[10%] left-[12%] flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs text-[var(--text)] shadow-lg">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                yes → TRUE
              </span>
            </div>
          </div>
        </section>

        {/* Works with + stats */}
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="glass flex flex-col justify-center gap-3 rounded-2xl p-5 lg:col-span-5">
              <p className="text-sm text-[var(--muted)]">{t.worksWith}</p>
              <ul className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <li key={p.name}>
                    <Link href={href(p.path)} className="inline-block rounded-full border border-white/15 px-3 py-1 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-text)]">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-7">
              {stats.map((s) => (
                <div key={s.label} className="glass rounded-2xl p-5">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-3xl font-bold tracking-tight text-[var(--text)]">{s.value}</dd>
                  <dd className="mt-1 text-sm text-[var(--muted)]">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ── Showcases: a bento grid ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-6">
          {showcases.map((s, i) => {
            // Wide card, tall narrow card, then a full-width card with the shot beside the text.
            const layout = ["lg:col-span-4", "lg:col-span-2", "lg:col-span-6"][i];
            const wash = ["wash-teal", "wash-indigo", "wash-teal"][i];
            const side = i === 2;
            return (
              <article key={s.title} className={`lift flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] ${layout}`}>
                <div className={`${wash} flex h-full flex-col ${side ? "lg:grid lg:grid-cols-12 lg:items-center" : ""}`}>
                  <div className={`p-7 sm:p-8 ${side ? "lg:col-span-5" : ""}`}>
                    <p className={eyebrow}>{s.eyebrow}</p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">{s.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{s.desc}</p>
                    <ul className="mt-5 space-y-2.5">
                      {s.points.map((pt) => (
                        <li key={pt} className="flex gap-3 text-sm leading-6 text-[var(--text)]">
                          <Check />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    {s.link && (
                      <Link href={s.link.href} className="mt-5 inline-block text-sm font-semibold text-[var(--secondary-text)] hover:underline">
                        {s.link.label} →
                      </Link>
                    )}
                  </div>
                  {/* The screenshot peeks in from the bottom (or the side, on the wide card). */}
                  <div className={`mt-auto ${side ? "px-7 pb-7 lg:col-span-7 lg:py-8 lg:pl-0 lg:pr-8" : "pl-7 sm:pl-8"}`}>
                    {/* The narrow card shows a close-up crop instead of a tiny full screenshot. */}
                    <div className={i === 1 ? "overflow-hidden lg:h-80" : ""}>
                      <Screenshot
                        name={s.shot}
                        alt={s.alt}
                        frame={false}
                        className={side ? "" : `rounded-b-none rounded-r-none border-b-0 border-r-0 ${i === 1 ? "lg:w-[190%] lg:max-w-none" : ""}`}
                        sizes={i === 1 ? "(min-width: 1024px) 720px, 100vw" : "(min-width: 1024px) 760px, 100vw"}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Why not just ask an AI? ── */}
      <div className="wash-indigo border-y border-[var(--border)]">
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-labelledby="ai-title">
        <div className="max-w-3xl">
          <p className={eyebrow}>{t.aiLabel}</p>
          <h2 id="ai-title" className={`mt-3 ${h2}`}>
            {t.aiTitle}
          </h2>
          <p className={`mt-4 ${lead}`}>{t.aiDesc}</p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="hidden border-b border-[var(--border)] sm:grid sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
            <div />
            <div className="flex items-center gap-2 border-l border-[var(--border)] bg-[var(--accent-soft)] px-6 py-4 text-sm font-semibold text-[var(--text)]">
              <LogoMark className="h-5 w-5" />
              {t.aiUs}
            </div>
            <div className="border-l border-[var(--border)] px-6 py-4 text-sm font-semibold text-[var(--muted)]">{t.aiThem}</div>
          </div>
          <dl className="divide-y divide-[var(--border)]">
            {aiRows.map((r) => (
              <div key={r.topic} className="grid sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
                <dt className="px-6 pb-2 pt-5 text-sm font-semibold text-[var(--text)] sm:py-5">{r.topic}</dt>
                <dd className="flex gap-3 px-6 py-2 text-sm leading-6 text-[var(--text)] sm:border-l sm:border-[var(--border)] sm:bg-[var(--accent-soft)] sm:py-5">
                  <Check />
                  <span>
                    <span className="font-semibold sm:hidden">{t.aiUs}: </span>
                    {r.us}
                  </span>
                </dd>
                <dd className="flex gap-3 px-6 pb-5 pt-2 text-sm leading-6 text-[var(--muted)] sm:border-l sm:border-[var(--border)] sm:py-5">
                  <Cross />
                  <span>
                    <span className="font-semibold sm:hidden">{t.aiThem}: </span>
                    {r.them}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--muted)]">{t.aiNote}</p>
      </section>
      </div>

      {/* ── How it works: a connected timeline ── */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className={eyebrow}>{t.howLabel}</p>
            <h2 className={`mt-3 ${h2}`}>{t.howTitle}</h2>
          </div>
          <Link href={href("/how-it-works")} className="text-sm font-semibold text-[var(--secondary-text)] hover:underline">
            {t.ctaWalkthrough} →
          </Link>
        </div>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* The line joining the steps */}
          <span aria-hidden="true" className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-[var(--accent)] to-[var(--secondary)] md:left-5 md:right-5 md:h-px md:w-auto md:bg-gradient-to-r" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative pl-16 md:pl-0">
              <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-primary)] shadow-[0_0_0_6px_var(--bg)] md:static">
                {i + 1}
              </span>
              <h3 className="text-lg font-semibold text-[var(--text)] md:mt-6">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Privacy ── */}
      <div className="wash-teal border-y border-[var(--border)]">
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--secondary-soft)] text-[var(--secondary-text)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 10-9 0v3.5M6.75 21h10.5a2.25 2.25 0 002.25-2.25v-6a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6A2.25 2.25 0 006.75 21z" />
              </svg>
            </span>
            <h2 className={`mt-5 ${h2}`}>{t.privacyTitle}</h2>
            <p className={`mt-4 ${lead}`}>{t.privacyDesc}</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
            {[
              { title: t.safe1Title, desc: t.safe1Desc },
              { title: t.safe2Title, desc: t.safe2Desc },
              { title: t.safe3Title, desc: t.safe3Desc },
            ].map((x) => (
              <div key={x.title} className="lift rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <dt className="text-sm font-semibold text-[var(--text)]">{x.title}</dt>
                <dd className="mt-2 text-sm leading-6 text-[var(--muted)]">{x.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      </div>

      {/* ── Pricing ── */}
      <section className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6" id="pricing">
        <div className="max-w-2xl">
          <p className={eyebrow}>{t.pricingLabel}</p>
          <h2 className={`mt-3 ${h2}`}>{t.pricingTitle}</h2>
          <p className={`mt-4 ${lead}`}>{t.pricingDesc}</p>
        </div>
        <PricingCards sub={sub} tPricing={tPricing} />
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-24 sm:px-6" id="faq">
        <p className={eyebrow}>{t.faqLabel}</p>
        <h2 className={`mt-3 ${h2}`}>{t.faqTitle}</h2>
        <div className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-[var(--text)]">
                {q}
                <svg className="h-5 w-5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final call to action ── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div data-theme="dark" className="ink-band overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
          <h2 className={h2}>{t.finalTitle}</h2>
          <p className={`mx-auto mt-4 max-w-xl ${lead}`}>{fmt(t.finalDesc, { rows: FREE_ROWS_PER_EXPORT })}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={href("/app")} className="btn-primary px-6 py-3 text-base">
              {t.ctaFixer}
            </Link>
            <Link href={href("/convert")} className="glass inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-[var(--text)] transition-colors hover:bg-white/10">
              {t.ctaConverter}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
