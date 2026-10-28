import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | StriveFormats",
  description: "What StriveFormats stores, where, and why. Your CSV files are processed in your browser and never uploaded.",
  alternates: { canonical: "/privacy" },
};

const muted = "text-[color:rgba(var(--muted-rgb),1)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
      <div className={`mt-2 space-y-2 text-sm leading-7 ${muted}`}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-[var(--text)]">Privacy Policy</h1>
      <p className={`mt-4 text-sm leading-7 ${muted}`}>
        StriveFormats processes CSV files in your browser. This page lists everything the site stores, where, and why.
      </p>

      <Section title="Your CSV files">
        <p>
          Files you open in the CSV Fixer, Inspector, Converter or Merger are read, checked and exported entirely in your browser. Their contents
          are never uploaded to our servers or shared with anyone.
        </p>
        <p>Custom formats and workspaces you create are saved in your browser&apos;s local storage on that device.</p>
      </Section>

      <Section title="If you create an account">
        <p>
          We store your email address (for signing in), your plan and subscription status, and how many exports you have used this month.
          Accounts are provided by Supabase.
        </p>
      </Section>

      <Section title="Without an account">
        <p>Your free export count for the month is kept in your browser&apos;s local storage. It is not sent to us.</p>
      </Section>

      <Section title="Usage information">
        <p>
          We record anonymous usage events, such as which tool was opened or that a file was checked, together with a random identifier kept
          in your browser. These events never contain file contents.
        </p>
        <p>
          The site may use Google Analytics and Vercel Analytics to count page views. Google Analytics sets cookies; Vercel Analytics does not.
        </p>
      </Section>

      <Section title="Email updates">
        <p>
          If you enter your email address in the &ldquo;new formats and features&rdquo; box, we store it to send occasional product updates.
          You can ask us to remove it at any time.
        </p>
      </Section>

      <Section title="Payments">
        <p>Payments are handled by Stripe. We never see or store your card details; we only receive your subscription status from Stripe.</p>
      </Section>

      <Section title="Your choices">
        <p>
          You can clear the data saved in your browser at any time through your browser settings. To have your account or email address
          removed, contact the site owner.
        </p>
      </Section>
    </main>
  );
}
