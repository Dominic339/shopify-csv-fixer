// src/app/app/page.tsx
import type { Metadata } from "next";
import AppClient from "./AppClient";

export const metadata: Metadata = {
  title: "CSV Fixer",
  alternates: {
    canonical: "/app",
  },
  robots: { index: true, follow: true },
};

export default function AppPage() {
  return <AppClient />;
}
