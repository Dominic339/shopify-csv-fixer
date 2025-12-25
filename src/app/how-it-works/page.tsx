import Link from "next/link";
import Image from "next/image";

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-[var(--muted)]">CSV Nest</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">How it works</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Upload a CSV, see what’s wrong, fix what’s safe, and export a clean file ready for your target platform.
          Your file stays in your browser during processing.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rgb-btn bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white"
          >
            Try it yourself
          </Link>
          <Link
            href="/"
            className="rgb-btn bg-[var(--surface)] px-6 py-3 text-sm"
          >
            Back to home
          </Link>
        </div>
      </header>

      <section className="mt-14 grid gap-6 md:grid-cols-4">
        {[
          { t: "Step 1", d: "Upload a CSV (or start from scratch later)." },
          { t: "Step 2", d: "Diagnostics show errors vs warnings in plain English." },
          { t: "Step 3", d: "Auto-fix safe issues and edit rows when needed." },
          { t: "Step 4", d: "Export a Shopify-ready CSV (more formats later)." },
        ].map((s) => (
          <div
            key={s.t}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm"
          >
            <p className="font-semibold">{s.t}</p>
            <p className="mt-1 text-[var(--muted)]">{s.d}</p>
          </div>
        ))}
      </section>

      {/* Screenshots */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold">Screenshots</h2>
        <p className="mt-2 text-[var(--muted)]">
          Drop your screenshots into <span className="font-semibold">/public/how-it-works/</span> using these filenames,
          and they’ll appear here automatically.
        </p>

        <div className="mt-8 grid gap-10">
          <Step
            title="1) Upload a CSV"
            body="Choose your CSV file. We parse it immediately and show a preview."
            img="/how-it-works/step-1-upload.png"
          />

          <Step
            title="2) Review Diagnostics"
            body="Errors must be fixed before export. Warnings are usually safe."
            img="/how-it-works/step-2-diagnostics.png"
          />

          <Step
            title="3) Fix issues"
            body="Auto-fix safe issues, then edit any remaining problem rows directly."
            img="/how-it-works/step-3-fix.png"
          />

          <Step
            title="4) Export the clean CSV"
            body="When errors are cleared and quota allows, export your final CSV."
            img="/how-it-works/step-4-export.png"
          />
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/app"
            className="rgb-btn bg-[var(--primary)] px-8 py-4 text-sm font-semibold text-white"
          >
            Try it yourself
          </Link>
        </div>
      </section>
    </main>
  );
}

function Step({
  title,
  body,
  img,
}: {
  title: string;
  body: string;
  img: string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-center">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-[var(--muted)]">{body}</p>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
          <Image
            src={img}
            alt={title}
            width={1400}
            height={900}
            className="h-auto w-full"
            priority={title.startsWith("1")}
          />
        </div>
      </div>
    </div>
  );
}
