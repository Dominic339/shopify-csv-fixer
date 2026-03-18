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

      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">StriveFormats</p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text)] md:text-5xl">
            Fix Shopify and ecommerce CSV errors before they break your import
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Upload a messy CSV, auto-fix safe issues, review anything risky, and export a cleaner
            file in minutes. Built for sellers who want fewer import errors, fewer manual edits,
            and more confidence before upload.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/ecommerce-csv-fixer" className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                {tHome?.openEcommerceFixer ?? "Open Ecommerce CSV Fixer"}
              </span>
            </Link>

            <Link href={localeHref(currentLocale, "/presets")} className="rgb-btn">
              <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                {tHome?.browseTemplates ?? "Browse templates"}
              </span>
            </Link>

            <Link href="#pricing" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-2)]">
              View pricing
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
            <span>Files processed locally</span>
            <span>No forced signup to explore</span>
            <span>Review edits before export</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="text-sm font-semibold text-[var(--text)]">Why people would use this</div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Catch import blockers earlier</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Find common issues before uploading to Shopify or other ecommerce platforms.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Auto-fix safe formatting issues</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Clean spacing, normalize formatting, and make repetitive corrections faster.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Keep control over risky changes</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Anything that could change meaning is flagged so you can review it manually.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">1. Upload your CSV</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Start with a Shopify or ecommerce file that needs cleanup, validation, or conversion.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-[var(--text)]">2. Review detected issues</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                See what can be fixed safely, what needs review, and where the risky cells are.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-[var(--text)]">3. Export a cleaner file</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Download a more standardized CSV that is easier to trust before your final import.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-sm font-semibold text-[var(--text)]">Before</div>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">
            <div>• Extra spaces and inconsistent formatting</div>
            <div className="mt-2">• Empty cells in important places</div>
            <div className="mt-2">• Repetitive cleanup work by hand</div>
            <div className="mt-2">• Unclear which issues are safe to auto-fix</div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-sm font-semibold text-[var(--text)]">After</div>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">
            <div>• Cleaner formatting and normalized values</div>
            <div className="mt-2">• Issues grouped for faster review</div>
            <div className="mt-2">• Safer automatic cleanup where appropriate</div>
            <div className="mt-2">• More confidence before upload and export</div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                {tHome?.csvFixerLabel ?? "CSV Fixer"}
              </div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                Fix ecommerce CSV files faster
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Choose a platform, upload your CSV, and let the tool clean safe issues automatically.
                Review anything risky, manually adjust what matters, and export a cleaner file.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/ecommerce-csv-fixer" className="rgb-btn">
                  <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                    {tHome?.openEcommerceFixer ?? "Open Ecommerce CSV Fixer"}
                  </span>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
              <div className="text-sm font-semibold text-[var(--text)]">
                {tHome?.customFormatsLabel ?? "Custom Formats"}
              </div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
                Save reusable cleanup rules
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Create reusable templates and rules for repeat jobs so future cleanup takes less time.
                Useful for teams, recurring imports, and workflows you do more than once.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {canAccessCustomFormats ? (
                  <Link href="/formats" className="rgb-btn">
                    <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                      {tHome?.openCustomFormats ?? "Open Custom Formats"}
                    </span>
                  </Link>
                ) : (
                  <button type="button" className="rgb-btn" onClick={() => setUpgradeOpen(true)}>
                    <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
                      {tHome?.upgradeToAdvanced ?? "Upgrade to Advanced"}
                    </span>
                  </button>
                )}
              </div>

              {!canAccessCustomFormats ? (
                <div className="mt-3 text-xs text-[var(--muted)]">
                  {tHome?.advancedRequired ?? "Advanced plan required."}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-sm font-semibold text-[var(--text)]">Why this feels safer</div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="text-sm font-semibold text-[var(--text)]">Local-first workflow</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Core parsing, editing, and export behavior are designed around running in the browser.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="text-sm font-semibold text-[var(--text)]">Manual review where needed</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Potentially risky changes are separated so you stay in control of important data.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="text-sm font-semibold text-[var(--text)]">Built for repeat use</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Great for sellers and operators who regularly clean files for imports and product updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-20" id="pricing">
        <div className="mb-6">
          <div className="text-sm font-semibold text-[var(--text)]">Pricing</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
            Start using the tool first, then upgrade when you need more
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            The pricing options are here when you are ready, but the page now leads with product value
            instead of asking for money first.
          </p>
        </div>

        <PricingCards sub={sub} tPricing={tPricing} />
      </section>

      <section className="mt-16" id="faq">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-sm font-semibold text-[var(--text)]">
            {tHome?.faqLabel ?? "FAQ"}
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
            {tHome?.faqTitle ?? "Quick answers"}
          </div>

          <div className="mt-6 grid gap-4">
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                {tHome?.faq1Q ?? "Do you upload my CSV to a server?"}
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {tHome?.faq1A ??
                  "The fixer runs in your browser for the core parsing and edits. When you export, your cleaned CSV is generated locally."}
              </p>
            </details>

            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                {tHome?.faq2Q ?? "What kinds of problems can it fix automatically?"}
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {tHome?.faq2A ??
                  "Safe fixes include trimming extra spaces, normalizing empty cells, and applying consistent formatting. Anything that could change meaning is flagged so you can review it before export."}
              </p>
            </details>

            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                {tHome?.faq3Q ?? "What are Custom Formats?"}
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {tHome?.faq3A ??
                  "Custom Formats let you save reusable column templates and cleanup rules so repeat jobs take seconds. Advanced plan is required for creating and managing formats."}
              </p>
            </details>

            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                {tHome?.faq4Q ?? "Can I cancel or change plans later?"}
              </summary>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {tHome?.faq4A ?? "Yes. You can upgrade, downgrade, or cancel from your Profile at any time."}
              </p>
            </details>
          </div>
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