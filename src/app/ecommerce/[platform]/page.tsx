// src/app/ecommerce/[platform]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { ECOMMERCE_PLATFORMS, getEcommercePlatformById } from "@/lib/ecommercePlatforms";

type PageProps = {
  params: Promise<{ platform: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return ECOMMERCE_PLATFORMS.map((p) => ({ platform: p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { platform } = await params;
  const p = getEcommercePlatformById(platform);
  if (!p) return { title: "Not found" };

  const title = `${p.name} CSV Fixer | StriveFormats`;
  const description =
    p.description ??
    `Clean, standardize, and validate ${p.name} CSV files before import. StriveFormats applies safe auto-fixes and flags risky issues for review.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/ecommerce/${encodeURIComponent(p.id)}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/ecommerce/${encodeURIComponent(p.id)}`,
    },
  };
}

export default async function EcommercePlatformPage({ params }: PageProps) {
  const { platform } = await params;
  const p = getEcommercePlatformById(platform);
  if (!p) return notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${p.name} CSV Fixer`,
    description: p.description ?? p.blurb,
    url: `https://striveformats.com/ecommerce/${p.id}`,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={jsonLd} />

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-lg md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-white/70">
              <Link href="/ecommerce-csv-fixer" className="hover:underline">
                Ecommerce CSV Fixer
              </Link>
              <span className="mx-2 opacity-50">/</span>
              <span>{p.name}</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{p.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-white/80 md:text-base">{p.blurb}</p>
          </div>

          <Link href="/app" className="rgb-btn">
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Open Fixer</span>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {p.formats.map((f) => {
            const openFixerHref = `/app?preset=${encodeURIComponent(f.formatId)}`;
            const templatePreviewHref = `/presets/${encodeURIComponent(f.presetId)}`;
            const sampleCsvHref = `/presets/${encodeURIComponent(f.presetId)}/sample.csv`;

            return (
              <div key={f.presetId} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-lg font-semibold">{f.name}</div>
                <div className="mt-1 text-sm text-white/75">{f.blurb}</div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={openFixerHref} className="rgb-btn">
                    <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Open fixer</span>
                  </Link>
                  <Link href={templatePreviewHref} className="rgb-btn">
                    <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">View template</span>
                  </Link>
                  <Link href={sampleCsvHref} className="rgb-btn">
                    <span className="px-5 py-2 text-sm font-semibold text-[var(--text)]">Download sample CSV</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
