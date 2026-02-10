import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "CSNest helps you fix and convert messy CSVs for Shopify and other tools.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">About CSNest</h1>
      <p className="mt-4 text-white/80">
        CSNest is a lightweight CSV fixer designed for e-commerce workflows. Upload a CSV, apply a format,
        auto-fix safe issues, and export a clean file that imports correctly.
      </p>
      <p className="mt-4 text-white/80">
        This project is actively evolving. If you run into a format you want supported, add it as a custom format
        or request it as a built-in.
      </p>
    </main>
  );
}
