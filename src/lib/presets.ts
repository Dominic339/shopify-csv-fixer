import type { CsvFormat } from "@/lib/formats/types";
import { getAllFormats } from "@/lib/formats";

export function getPresetFormats(): CsvFormat[] {
  // “General CSV” is not a preset landing page target (it’s the default tool mode)
  return getAllFormats().filter((f) => f.id !== "general_csv");
}

export function getPresetById(id: string): CsvFormat | null {
  const presets = getPresetFormats();
  return presets.find((p) => p.id === id) ?? null;
}

export function groupPresetsByCategory(presets: CsvFormat[]) {
  const map = new Map<string, CsvFormat[]>();

  for (const p of presets) {
    const cat = (p.category ?? "Other").trim() || "Other";
    const arr = map.get(cat) ?? [];
    arr.push(p);
    map.set(cat, arr);
  }

  // sort each category list by name
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    map.set(k, arr);
  }

  // return stable category ordering
  const categories = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  return { categories, map };
}
