// English /presets/<id> (shared body: src/views/presetPages.tsx)
import { getPresetFormats } from "@/lib/presets";
import { PresetDetailView, presetDetailMetadata } from "@/views/presetPages";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getPresetFormats().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return presetDetailMetadata("en", id);
}

export default async function PresetDetailPage({ params }: Props) {
  const { id } = await params;
  return <PresetDetailView locale="en" rawId={id} />;
}
