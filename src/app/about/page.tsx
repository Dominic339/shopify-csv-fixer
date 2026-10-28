import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORM_LANDINGS } from "@/lib/landing/platforms";
import { FREE_EXPORTS_PER_MONTH } from "@/lib/plans";

export const metadata: Metadata = {
  title: "About StriveFormats",
  description:
    "StriveFormats checks and fixes product CSVs for Shopify, WooCommerce, Etsy, eBay and Amazon in your browser. What it does, what runs where, and how it's built.",
  alternates: { canonical: "/about" },
};

const card = "min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7";
const muted = "text-[color:rgba(var(--muted-rgb),1)]";

const DATA_FLOW: { what: string; where: string }[] = [
  { what: "Your CSV file and every edit you make", where: "Stays in your browser. It is never uploaded." },
  { what: "Custom formats and workspaces", where: "Saved in your browser. Export a format as a file to move it." },
  { what: "Free export count (signed out)", where: "Kept in your browser for this device." },
  { what: "Export count and plan (signed in)", where: "Stored with your account so it works on every device." },
  { what: "Anonymous usage events", where: "Which tools are used, never what's in your files." },
  { what: "Payments", where: "Handled by Stripe. We never see your card details." },
];

const TOOLS: { href: string; name: string; desc: string }[] = [
  { href: "/app", name: "CSV Fixer", desc: "Validate against a platform's rules, auto-fix what's safe, edit the rest in a table." },
  { href: "/csv-inspector", name: "CSV Inspector", desc: "Check any CSV's structure: delimiters, quoting, encoding, empty and duplicate columns." },
  { href: "/convert", name: "Format Converter", desc: "Move products between Shopify, WooCommerce, Etsy, eBay and Amazon layouts." },
  { href: "/merge", name: "CSV Merger", desc: "Combine two files and remove duplicates on a shared column." },
  { href: "/formats", name: "Custom Formats", desc: "Save the columns and rules of any file you handle regularly (Advanced plan)." },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">About StriveFormats</h1>
        <p className={`mt-4 text-base leading-7 ${muted}`}>
          StriveFormats checks product CSV files before you import them into an online store, fixes the problems that are safe to fix,
          and points at the exact row and column of everything else. It runs in your browser, so your catalogue never leaves your computer.
        </p>
      </header>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-bold text-[var(--text)]">Why it exists</h2>
        <div className={`mt-3 space-y-3 text-sm leading-7 ${muted}`}>
          <p>
            Store importers are strict, and their error messages rarely say which row is wrong. A file that looks fine in a spreadsheet can fail
            because of a price written as &ldquo;45,00&rdquo;, a variant row that lost its handle, or a blank cell that would quietly erase data
            already in the store.
          </p>
          <p>
            StriveFormats knows each platform&apos;s rules, applies the fixes that can&apos;t change what your data means, and leaves every decision
            that could to you, with an explanation and a link to a guide.
          </p>
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-bold text-[var(--text)]">How it&apos;s run</h2>
        <ul className={`mt-3 space-y-2 text-sm leading-6 ${muted}`}>
          <li>
            <span className="font-semibold text-[var(--text)]">Try it before you sign up.</span> Every check and fix works without an account,
            and you get {FREE_EXPORTS_PER_MONTH} free exports a month on each device.
          </li>
          <li>
            <span className="font-semibold text-[var(--text)]">Nothing changes silently.</span> Every automatic change is listed in a fix log you
            can download with the file.
          </li>
          <li>
            <span className="font-semibold text-[var(--text)]">Small and independent.</span> The tool does its work in your browser, which keeps
            it fast, private and cheap to run, and keeps the free tier free.
          </li>
        </ul>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-bold text-[var(--text)]">What runs where</h2>
        <dl className="mt-4 divide-y divide-[var(--border)]">
          {DATA_FLOW.map((d) => (
            <div key={d.what} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-4">
              <dt className="text-sm font-semibold text-[var(--text)]">{d.what}</dt>
              <dd className={`text-sm ${muted}`}>{d.where}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-3 text-xs ${muted}`}>
          Details in the{" "}
          <Link className="underline" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-bold text-[var(--text)]">Platforms</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.values(PLATFORM_LANDINGS).map((p) => (
              <li key={p.slug}>
                <Link className="text-[var(--text)] hover:underline" href={p.path}>
                  <span className={`font-semibold ${p.accent.text}`}>{p.kicker}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="text-xl font-bold text-[var(--text)]">Tools</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link className="font-semibold text-[var(--text)] hover:underline" href={t.href}>
                  {t.name}
                </Link>
                <p className={`text-xs ${muted}`}>{t.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
