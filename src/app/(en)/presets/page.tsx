// English /presets (shared body: src/views/presetPages.tsx)
import { PresetsView, presetsMetadata } from "@/views/presetPages";

export function generateMetadata() {
  return presetsMetadata("en");
}

export default function PresetsPage() {
  return <PresetsView locale="en" />;
}
