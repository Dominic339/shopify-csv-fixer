// src/components/layout/NotFoundContent.tsx
// The body of every 404 page: unmatched URLs (app/global-not-found.tsx) and missing guides,
// presets and other pages inside either root layout (not-found.tsx).
import Link from "next/link";

export function NotFoundContent() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <p className="text-sm font-semibold text-[var(--accent-text)]">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text)] sm:text-3xl">This page could not be found</h1>
      <p className="mt-3 text-base text-[var(--muted)]">The link may be old, or the page may have moved.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/app" className="rg-btn justify-center">
          Open the CSV Fixer
        </Link>
        <Link href="/guides" className="rgb-btn justify-center">
          Browse guides
        </Link>
        <Link href="/" className="rgb-btn justify-center">
          Go to the homepage
        </Link>
      </div>
    </main>
  );
}
