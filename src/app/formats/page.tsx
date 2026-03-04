import type { Metadata } from "next";
import FormatsClient from "@/lib/formats/FormatsClient";

export const metadata: Metadata = {
  title: "Custom Formats | StriveFormats",
  description:
    "Create and manage reusable CSV formats with column templates and cleanup rules. Browse preset formats to get started quickly.",
  alternates: { canonical: "/formats" },
  robots: { index: true, follow: true },
};

export default function FormatsPage() {
  return <FormatsClient />;
}
