// src/app/formats/page.tsx
import type { Metadata } from "next";
import FormatsClient from "./FormatsClient";

export const metadata: Metadata = {
  title: "Custom Formats",
  robots: { index: false, follow: false },
};

export default function FormatsPage() {
  return <FormatsClient />;
}
