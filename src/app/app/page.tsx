// src/app/app/page.tsx
import type { Metadata } from "next";
import AppClient from "./AppClient";

export const metadata: Metadata = {
  title: "CSV Fixer",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <AppClient />;
}
