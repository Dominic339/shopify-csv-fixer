"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { PricingCards } from "@/components/ui/PricingCards";
import { Screenshot } from "@/components/ui/Screenshot";
import FAQJsonLd from "@/components/FAQJsonLd";
import SEOJsonLd from "@/components/SEOJsonLd";
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

  // The product stage: one tab per part of the workflow.
  const showcases: { eyebrow: string; title: string; desc: string; shot: "step-issues" | "step-export" | "convert"; alt: string; link?: { href: string; label: string } }[] = [
    { eyebrow: t.show1Label, title: t.show1Title, desc: t.show1Desc, shot: "step-issues", alt: t.show1Alt },
    { eyebrow: t.step3Title, title: t.step3Title, desc: t.step3Desc, shot: "step-export", alt: t.show2Alt },
    { eyebrow: t.show3Label, title: t.show3Title, desc: t.show3Desc, shot: "convert", alt: t.show3Alt, link: { href: "/migrate", label: t.show3Link } },
  ];

  const [tab, setTab] = useState(0);
  const active = showcases[tab];

  // One product row before and after the fixer: three cells fixed, one left for you.
  const demoCols = ["URL handle", "Price", "Published", "SKU", "Inventory"];
  const demoBefore = ["Blue Shirt", "$19.99", "yes", "  SKU-114 ", "ten"];
  const demoAfter = ["blue-shirt", "19.99", "TRUE", "SKU-114", "ten"];

  return (
    <main className="overflow-x-clip">
      <SEOJsonLd />
      <FAQJsonLd items={faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* ── Hero: glow bubbles, an arc and a bracketed product shot ── */}
      <div className="hero-glow relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="orb orb-teal left-[-120px] top-[-80px] h-[420px] w-[420px]" />
          <span className="orb orb-indigo slow right-[-140px] top-[80px] h-[480px] w-[480px]" />
          <span className="bubble left-[46%] top-[12%] hidden h-10 w-10 lg:block" />
          <span className="bubble float-chip delay-1 right-[6%] top-[78%] hidden h-16 w-16 lg:block" style={{ animationDuration: "9s" }} />
          <span className="bubble left-[8%] top-[84%] h-7 w-7" style={{ animationDelay: "-3s" }} />
          {/* A sweeping arc behind everything */}
          <svg className="absolute left-0 top-0 h-full w-full" viewBox="0 0 1440 760" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="arc" x1="0" x2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
                <stop offset="0.45" stopColor="var(--accent)" stopOpacity="0.55" />
                <stop offset="1" stopColor="var(--secondary)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Kept low and to the right, so it passes behind the product shot, not the text. */}
            <path d="M560 790 C 820 720, 1060 520, 1480 470" stroke="url(#arc)" strokeWidth="2" />
            <path d="M620 820 C 880 760, 1120 600, 1480 580" stroke="url(#arc)" strokeWidth="1" strokeDasharray="4 8" />
          </svg>
        </div>

        <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-28">
          <div className="lg:col-span-5">
            <p className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
              {t.heroBadge}
            </p>
            <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-[var(--text)] sm:text-6xl lg:text-[4rem]">
              {t.heroTitleA}{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] bg-clip-text text-transparent">{t.heroTitleB}</span>
            </h1>
            <p className={`mt-6 max-w-xl ${lead}`}>{t.heroDesc}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={href("/app")} className="btn-primary rounded-full px-7 py-3.5 text-base shadow-[0_12px_30px_-12px_rgba(var(--accent-rgb),0.8)]">
                {t.ctaFixer} →
              </Link>
              <Link href={href("/how-it-works")} className="rgb-btn rounded-full px-7 py-3.5 text-base">
                {t.ctaHowItWorks}
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
              {[t.trust1, t.trust2, fmt(t.trustSmallFiles, { rows: FREE_ROWS_PER_EXPORT })].map((x) => (
                <li key={x} className="glass flex items-center gap-1.5 rounded-full px-3 py-1">
                  <Check />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:col-span-7">
            {/* A big ring behind the shot */}
            <span aria-hidden="true" className="absolute -right-10 -top-16 hidden h-72 w-72 rounded-full border border-[rgba(var(--secondary-rgb),0.25)] lg:block" />
            <span aria-hidden="true" className="absolute -right-2 -top-8 hidden h-56 w-56 rounded-full border border-dashed border-[rgba(var(--accent-rgb),0.3)] lg:block" />
            <div className="relative lg:[transform:perspective(1800px)_rotateY(-7deg)_rotateX(2deg)]">
              <div className="brackets" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="glow-frame">
                <Screenshot name="hero" alt={t.heroShotAlt} priority frame={false} className="!rounded-[calc(1.25rem-1px)] !border-0 !shadow-none" sizes="(min-width: 1024px) 760px, 100vw" />
              </div>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden sm:block">
              <span className="float-chip absolute -left-4 top-[18%] flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-xs text-[var(--text)] lg:-left-10">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                $19.99 → 19.99
              </span>
              <span className="float-chip delay-1 absolute -right-3 top-[44%] flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-xs text-[var(--text)]">
                <span className="h-2 w-2 rounded-full bg-[var(--secondary)] shadow-[0_0_8px_var(--secondary)]" />
                Blue Shirt → blue-shirt
              </span>
              <span className="float-chip delay-2 absolute bottom-[8%] left-[12%] flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-xs text-[var(--text)]">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                yes → TRUE
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ── A slanted ribbon: platforms and numbers, scrolling ── */}
      <div className="relative z-10 -my-2 overflow-hidden py-6">
        <div className="ribbon -mx-6 py-3.5">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center gap-10 pr-10 text-sm font-semibold sm:text-base" aria-hidden={copy === 1}>
                {PLATFORMS.map((p) => (
                  <li key={p.name} className="flex items-center gap-10">
                    <Link href={href(p.path)} tabIndex={copy === 1 ? -1 : undefined} className="whitespace-nowrap hover:underline">
                      {p.name}
                    </Link>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden="true" />
                  </li>
                ))}
                {stats.map((st) => (
                  <li key={st.label} className="flex items-center gap-10 whitespace-nowrap">
                    <span>
                      <span className="text-lg font-extrabold">{st.value}</span> <span className="font-medium text-white/85">{st.label}</span>
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      {/* ── Before → after: one row, fixed ── */}
      <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <span aria-hidden="true" className="orb orb-teal left-1/2 top-10 h-[360px] w-[620px] -translate-x-1/2 opacity-70" />
        <div className="relative text-center">
          <p className={eyebrow}>{t.show2Label}</p>
          <h2 className={`mx-auto mt-3 max-w-3xl ${h2}`}>{t.show2Title}</h2>
          <p className={`mx-auto mt-4 max-w-2xl ${lead}`}>{t.show2Desc}</p>
        </div>
        {/* Phones: one card per column, old value → new value */}
        <ul className="relative mt-10 space-y-2 sm:hidden">
          {demoCols.map((c, i) => {
            const flagged = i === 4;
            return (
              <li key={c} className={`rounded-2xl border p-3 ${flagged ? "border-amber-400/60 bg-amber-400/10" : "cell-glow bg-[var(--surface)]"}`}>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                  {c}
                  {flagged && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">{t.flaggedLabel}</span>}
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-sm">
                  <span className={flagged ? "text-[var(--text)]" : "text-[var(--muted)] line-through decoration-red-400/70"}>{demoBefore[i].trim() || demoBefore[i]}</span>
                  {!flagged && (
                    <>
                      <span className="text-[var(--accent-text)]" aria-hidden="true">→</span>
                      <span className="font-semibold text-[var(--text)]">{demoAfter[i]}</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="relative mt-12 hidden overflow-x-auto pb-2 sm:block">
          <div className="mx-auto min-w-[720px] max-w-5xl">
            <div className="grid grid-cols-[6rem_repeat(4,minmax(0,1fr))_minmax(0,1.5fr)] gap-2 px-1 text-xs font-semibold text-[var(--muted)]">
              <span />
              {demoCols.map((c) => (
                <span key={c} className="px-3">{c}</span>
              ))}
            </div>
            {[
              { label: t.beforeLabel, cells: demoBefore, after: false },
              { label: t.afterLabel, cells: demoAfter, after: true },
            ].map((row) => (
              <div key={row.label} className="mt-2 grid grid-cols-[6rem_repeat(4,minmax(0,1fr))_minmax(0,1.5fr)] items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-center text-xs font-bold ${row.after ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}>
                  {row.label}
                </span>
                {row.cells.map((c, i) => {
                  const flagged = i === 4;
                  const changed = row.after && !flagged;
                  return (
                    <span
                      key={i}
                      className={`relative flex min-w-0 items-center justify-between gap-2 whitespace-pre rounded-xl border px-3 py-3 font-mono text-sm ${
                        changed
                          ? "cell-glow text-[var(--text)]"
                          : flagged
                            ? "border-amber-400/60 bg-amber-400/10 text-[var(--text)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] line-through decoration-red-400/70"
                      }`}
                    >
                      <span className="truncate">{c}</span>
                      {row.after && flagged && (
                        <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 font-sans text-[10px] font-bold leading-4 text-amber-950">{t.flaggedLabel}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product stage: tabs that switch the screenshot ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 lg:p-14">
          <span aria-hidden="true" className="orb orb-indigo -right-24 -top-24 h-[380px] w-[380px]" />
          <span aria-hidden="true" className="orb orb-teal slow -bottom-32 -left-20 h-[340px] w-[340px]" />
          {/* A quarter-circle and a right angle as accents */}
          <span aria-hidden="true" className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full border-[18px] border-[rgba(var(--accent-rgb),0.08)]" />
          <span aria-hidden="true" className="absolute left-8 top-8 h-10 w-10 border-l-[3px] border-t-[3px] border-[var(--accent)] opacity-60" />

          <div className="relative grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div role="tablist" aria-label={t.howLabel} className="flex flex-wrap gap-2">
                {showcases.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    role="tab"
                    id={`stage-tab-${i}`}
                    aria-selected={tab === i}
                    aria-controls="stage-panel"
                    onClick={() => setTab(i)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      tab === i
                        ? "bg-[var(--accent)] text-[var(--on-primary)] shadow-[0_8px_24px_-10px_rgba(var(--accent-rgb),0.9)]"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {s.eyebrow}
                  </button>
                ))}
              </div>
              <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${tab}`} key={tab} className="menu-in">
                <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">{active.title}</h2>
                <p className={`mt-4 ${lead}`}>{active.desc}</p>
                <Link href={active.link ? active.link.href : href("/app")} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--secondary-text)] hover:underline">
                  {active.link ? active.link.label : t.ctaFixer} →
                </Link>
              </div>
            </div>
            <div className="relative lg:col-span-7">
              <div key={tab} className="menu-in glow-frame">
                <Screenshot name={active.shot} alt={active.alt} frame={false} className="!rounded-[calc(1.25rem-1px)] !border-0 !shadow-none" sizes="(min-width: 1024px) 720px, 100vw" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Privacy: one bold statement ── */}
      <section className="relative mx-auto max-w-5xl px-4 pb-24 text-center sm:px-6">
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,var(--accent),var(--secondary),var(--accent))] opacity-80 blur-md" />
          <span aria-hidden="true" className="absolute inset-[6px] rounded-full bg-[var(--bg)]" />
          <span className="relative text-7xl font-extrabold tracking-tight text-[var(--text)]">0</span>
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-text)]">{t.statUploads}</p>
        <h2 className={`mx-auto mt-4 max-w-2xl ${h2}`}>{t.privacyTitle}</h2>
        <p className={`mx-auto mt-4 max-w-2xl ${lead}`}>{t.privacyDesc}</p>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {[t.safe1Title, t.safe2Title, t.safe3Title].map((x) => (
            <li key={x} className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-[var(--text)]">
              <Check />
              {x}
            </li>
          ))}
        </ul>
        <Link href={href("/how-it-works")} className="mt-8 inline-block text-sm font-semibold text-[var(--secondary-text)] hover:underline">
          {t.ctaWalkthrough} →
        </Link>
      </section>

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

      {/* ── Final call to action: a curved panel with bubbles ── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="hero-glow relative overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-20 text-center sm:px-12">
          <span aria-hidden="true" className="orb orb-teal -left-20 -top-20 h-72 w-72" />
          <span aria-hidden="true" className="orb orb-indigo slow -bottom-24 -right-16 h-80 w-80" />
          <span aria-hidden="true" className="bubble left-[10%] top-[20%] h-8 w-8" />
          <span aria-hidden="true" className="bubble right-[12%] top-[30%] h-12 w-12" style={{ animationDelay: "-2s" }} />
          <span aria-hidden="true" className="bubble bottom-[18%] right-[28%] h-5 w-5" style={{ animationDelay: "-4s" }} />
          <h2 className={`relative ${h2}`}>{t.finalTitle}</h2>
          <p className={`relative mx-auto mt-4 max-w-xl ${lead}`}>{fmt(t.finalDesc, { rows: FREE_ROWS_PER_EXPORT })}</p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={href("/app")} className="btn-primary rounded-full px-7 py-3.5 text-base shadow-[0_12px_30px_-12px_rgba(var(--accent-rgb),0.8)]">
              {t.ctaFixer} →
            </Link>
            <Link href={href("/convert")} className="rgb-btn rounded-full px-7 py-3.5 text-base">
              {t.ctaConverter}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
