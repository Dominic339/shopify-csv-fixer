import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "StriveFormats helps you clean, standardize, and validate CSVs for Shopify and other tools.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">About StriveFormats</h1>
      <p className="mt-4 text-white/80">
        StriveFormats is a lightweight CSV fixer designed for e-commerce workflows. Upload a CSV, apply a format,
        auto-fix safe issues, and export a clean file that imports correctly.
      </p>
      <p className="mt-4 text-white/80">
        This project is actively evolving. If you run into a format you want supported, add it as a custom format
        or request it as a built-in.
      </p>
    </main>
  );
}
