// src/app/formats/page.tsx
import type { Metadata } from "next";
import FormatsClient from "./FormatsClient";

export const metadata: Metadata = {
  title: "Custom Formats",
  alternates: {
    canonical: "/formats",
  },
  robots: { index: true, follow: true },
};

export default function FormatsPage() {
  return <FormatsClient />;
}
