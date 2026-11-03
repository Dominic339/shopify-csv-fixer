// src/components/marketing/AiComparison.tsx
// "Why not just ask an AI?": StriveFormats vs. pasting the file into a general chatbot.
// Shown on the How it works page.
import { LogoMark } from "@/components/brand/Logo";
import type { Translations } from "@/lib/i18n/getTranslations";
import { fmt } from "@/lib/i18n/fmt";

const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary-text)]";

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

export function AiComparison({ t, checksCount, id = "vs-ai" }: { t: Translations["home"]; checksCount: number; id?: string }) {
  const rows = [
    { topic: t.aiRow1Topic, us: t.aiRow1Us, them: t.aiRow1Them },
    { topic: t.aiRow2Topic, us: t.aiRow2Us, them: t.aiRow2Them },
    { topic: t.aiRow3Topic, us: fmt(t.aiRow3Us, { checks: checksCount }), them: t.aiRow3Them },
    { topic: t.aiRow4Topic, us: t.aiRow4Us, them: t.aiRow4Them },
    { topic: t.aiRow5Topic, us: t.aiRow5Us, them: t.aiRow5Them },
  ];
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6" aria-labelledby={`${id}-title`}>
      <div className="max-w-3xl">
        <p className={eyebrow}>{t.aiLabel}</p>
        <h2 id={`${id}-title`} className="mt-3 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          {t.aiTitle}
        </h2>
        <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">{t.aiDesc}</p>
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
          {rows.map((r) => (
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
  );
}
