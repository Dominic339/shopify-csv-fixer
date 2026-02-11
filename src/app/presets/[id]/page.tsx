// src/app/presets/[id]/page.tsx

import Link from "next/link";

export const dynamic = "force-dynamic";

function titleFromId(id: string) {
  // bigcommerce_products -> Bigcommerce Products
  const clean = (id ?? "")
    .trim()
    .replace(/[-]+/g, "_")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "Preset CSV Format";

  return clean
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const name = titleFromId(params.id);
  return {
    title: `${name} CSV Fixer`,
    description:
      `Open the CSV Fixer preconfigured for ${name}. Upload your CSV, review issues, then export a cleaned file.`,
  };
}

export default function PresetDetailPage({ params }: { params: { id: string } }) {
  const id = (params?.id ?? "").toString();
  const name = titleFromId(id);

  // IMPORTANT:
  // We intentionally do NOT look this up in any registry.
  // That prevents 404s if an id is missing/mismatched.
  const openHref = `/app?preset=${encodeURIComponent(id)}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--muted)]">Preset format</p>

        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">
          {name} CSV Fixer
        </h1>

        <p className="mt-3 text-sm text-[var(--muted)]">
          Open the fixer with this preset selected. Upload your CSV, let safe fixes run, then review
          anything flagged before exporting.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={openHref} className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">
              Open fixer with this preset
            </span>
          </Link>

          <Link href="/presets" className="rg-btn">
            Back to all presets
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">What to do</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Click “Open fixer with this preset”</li>
            <li>Upload your CSV</li>
            <li>Review highlighted issues and apply manual fixes if needed</li>
            <li>Export the cleaned CSV</li>
          </ol>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-lg font-semibold text-[var(--text)]">Why this won’t 404 anymore</h2>
          <p className="mt-4 text-sm text-[var(--muted)]">
            This page no longer depends on a preset registry lookup. It renders for any id and
            passes that id into the fixer via the query string.
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="text-xs text-[var(--muted)]">Preset id</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)] break-all">{id}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
