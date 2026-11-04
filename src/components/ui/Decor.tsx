// src/components/ui/Decor.tsx
// Shared pieces of the site's visual style: glowing orbs, glassy bubbles, corner brackets and
// curved panels (see the "Homepage shapes" styles in globals.css). No hooks, so they work in
// server and client components alike.

import Link from "next/link";

/** Two soft glows drifting behind a section. Place inside a `relative` (and usually `overflow-hidden`) box. */
export function Orbs({ size = "md" }: { size?: "sm" | "md" }) {
  const big = size === "md";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className={`orb orb-teal ${big ? "-left-24 -top-28 h-80 w-80" : "-left-16 -top-20 h-56 w-56"}`} />
      <span className={`orb orb-indigo slow ${big ? "-right-24 -top-10 h-96 w-96" : "-right-16 -top-16 h-64 w-64"}`} />
    </span>
  );
}

/** A curved, glowing header panel for index pages (guides, templates). */
export function PageHero({
  eyebrow,
  title,
  intro,
  stat,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  intro?: React.ReactNode;
  /** A number shown in a round bubble beside the title. */
  stat?: { value: string | number; label: string };
  /** Buttons or links under the intro. */
  children?: React.ReactNode;
}) {
  return (
    <header className="hero-glow relative mb-10 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10">
      <Orbs />
      <span aria-hidden="true" className="absolute left-5 top-5 h-8 w-8 border-l-[3px] border-t-[3px] border-[var(--accent)] opacity-60" />
      <span aria-hidden="true" className="bubble right-[30%] top-[18%] hidden h-6 w-6 sm:block" />
      <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary-text)]">{eyebrow}</div>}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-5xl">{title}</h1>
          {intro && <div className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">{intro}</div>}
          {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
        </div>
        {stat && (
          <div className="glass float-chip flex h-32 w-32 shrink-0 flex-col items-center justify-center self-start rounded-full text-center shadow-[0_18px_40px_-20px_rgba(var(--secondary-rgb),0.6)] sm:self-center">
            <span className="bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] bg-clip-text text-4xl font-extrabold leading-none text-transparent">{stat.value}</span>
            <span className="mt-1.5 px-3 text-[11px] leading-4 text-[var(--muted)]">{stat.label}</span>
          </div>
        )}
      </div>
    </header>
  );
}

/** Soft glows behind a tool page's title. Wraps the existing header content. */
export function GlowHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative isolate ${className}`}>
      {/* The glow fades out on every side (mask), so it never ends in a straight edge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 -bottom-6 -z-10 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,#000_35%,transparent_72%)]"
      >
        <span className="orb orb-teal -left-10 -top-10 h-56 w-56" />
        <span className="orb orb-indigo slow right-0 -top-16 h-64 w-64" />
      </span>
      {children}
    </div>
  );
}

/** The curved "need help?" panel with bubbles. */
export function CtaPanel({
  title,
  desc,
  primary,
  secondary,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="hero-glow relative mt-12 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center sm:px-10">
      <Orbs size="sm" />
      <span aria-hidden="true" className="bubble left-[8%] top-[24%] h-7 w-7" />
      <span aria-hidden="true" className="bubble right-[10%] top-[34%] h-10 w-10" style={{ animationDelay: "-2s" }} />
      <h2 className="relative text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">{title}</h2>
      {desc && <p className="relative mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">{desc}</p>}
      <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link className="btn-primary rounded-full px-7 py-3 text-base shadow-[0_12px_30px_-12px_rgba(var(--accent-rgb),0.8)]" href={primary.href}>
          {primary.label} →
        </Link>
        {secondary && (
          <Link className="rgb-btn rounded-full px-7 py-3 text-base" href={secondary.href}>
            {secondary.label}
          </Link>
        )}
      </div>
    </section>
  );
}
