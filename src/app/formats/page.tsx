// src/app/formats/page.tsx
import type { Metadata } from "next";
import FormatsClient, { type PresetFormatLite } from "./FormatsClient";
import { PRESET_FORMATS, getPresetsByCategory } from "@/lib/presetRegistry";

export const metadata: Metadata = {
  title: "Formats | StriveFormats",
  description:
    "Browse built-in preset formats for common CSV workflows. View required columns, download sample CSVs, and open the fixer with a preset selected.",
  alternates: { canonical: "/formats" },
  robots: { index: true, follow: true },
};

export default function FormatsPage() {
  const groupsRaw = getPresetsByCategory();
  const featuredRaw = PRESET_FORMATS.slice(0, 6);

  // Normalize shape for the client component (keeps this file stable if presetRegistry grows)
  const groups: Array<{ category: string; presets: PresetFormatLite[] }> = groupsRaw.map((g) => ({
    category: g.category,
    presets: g.presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
    })),
  }));

  const featured: PresetFormatLite[] = featuredRaw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
  }));

  return <FormatsClient groups={groups} featured={featured} />;
}
