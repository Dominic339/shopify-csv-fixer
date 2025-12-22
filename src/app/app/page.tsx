import Link from "next/link";
import { GradientFrame } from "@/components/ui/GradientFrame";

function ModeCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <GradientFrame subtle>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm transition group-hover:translate-y-[-1px]">
          <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{desc}</p>
          <p className="mt-5 text-sm font-semibold text-[var(--primary)]">Open →</p>
        </div>
      </GradientFrame>
    </Link>
  );
}

export default function AppHome() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Choose a mode</h1>
        <p className="mt-2 text-[var(--muted)]">
          Start free. No account needed until you use all free exports for the month on this device.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <ModeCard title="Convert & Fix CSV" desc="Fix common Shopify CSV import issues automatically." href="/app/upload" />
          <ModeCard
            title="Validate & Diagnose"
            desc="See exactly what’s wrong, which rows are affected, and what Shopify expects."
            href="/app/validate"
          />
          <ModeCard
            title="Build From Scratch"
            desc="Create Shopify-ready product CSVs using a simple form instead of a spreadsheet."
            href="/app/builder"
          />
        </div>
      </div>
    </div>
  );
}
