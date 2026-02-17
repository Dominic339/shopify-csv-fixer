// src/app/formats/page.tsx

import { getPresetFormats } from "@/lib/presets";
import FormatsClient from "./FormatsClient";

export default function FormatsPage() {
  const presets = getPresetFormats();

  // Pass the simplest, most stable data shape to the client:
  // a flat list of presets. The client can group for display.
  return <FormatsClient presets={presets} />;
}
