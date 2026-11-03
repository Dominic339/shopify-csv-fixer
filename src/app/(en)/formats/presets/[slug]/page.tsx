import { redirect } from "next/navigation";

import { getPresetBySlug } from "@/lib/presetRegistry";

export default function LegacyPresetSlugRedirect({ params }: { params: { slug: string } }) {
  const preset = getPresetBySlug(params.slug);
  if (preset) redirect(`/presets/${encodeURIComponent(preset.id)}`);
  redirect("/presets");
}
