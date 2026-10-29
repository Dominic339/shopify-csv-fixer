"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SUPPORT_EMAIL } from "@/lib/contact";
import { LOCALES, LOCALE_NAMES, localeHref, type Locale } from "@/lib/i18n/locales";
import { pathInLocale, rememberLocale, splitLocale } from "@/lib/i18n/paths";
import type { Translations } from "@/lib/i18n/getTranslations";

type Props = { navByLocale: Record<Locale, Translations["nav"]> };

export default function Footer({ navByLocale }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { locale } = splitLocale(pathname);
  const t = navByLocale[locale];
  const href = (path: string) => localeHref(locale, path);

  const columns = [
    {
      title: t.tools,
      links: [
        { href: href("/app"), label: t.csvFixer },
        { href: href("/convert"), label: t.formatConverter },
        { href: href("/merge"), label: t.csvMerger },
        { href: href("/csv-inspector"), label: t.csvInspector },
        { href: "/migrate", label: t.storeMigrations },
      ],
    },
    {
      title: t.resources,
      links: [
        { href: href("/presets"), label: t.templates },
        { href: href("/guides"), label: t.guides },
        { href: `${href("/")}#pricing`, label: t.pricing },
      ],
    },
    {
      title: "StriveFormats",
      links: [
        { href: href("/about"), label: t.about },
        { href: href("/privacy"), label: t.privacy },
        { href: href("/terms"), label: t.terms },
        { href: `mailto:${SUPPORT_EMAIL}`, label: t.contact },
      ],
    },
  ];

  return (
    <footer className="mt-14 border-t border-[var(--border)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">
          <div className="font-semibold text-[var(--text)]">StriveFormats</div>
          <p className="mt-1 max-w-xs">{t.tagline}</p>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[color:rgba(var(--muted-rgb),0.8)]" htmlFor="footer-language">
            {t.language}
          </label>
          <select
            id="footer-language"
            className="mt-2 w-full max-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            value={locale}
            onChange={(e) => {
              const next = e.target.value as Locale;
              rememberLocale(next);
              router.push(pathInLocale(pathname, next));
            }}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>

          <div className="mt-5 text-xs text-[color:rgba(var(--muted-rgb),0.7)]">© {new Date().getFullYear()} StriveFormats</div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="text-sm">
            <div className="font-semibold text-[var(--text)]">{col.title}</div>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link className="text-[color:rgba(var(--muted-rgb),1)] hover:text-[var(--text)]" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
