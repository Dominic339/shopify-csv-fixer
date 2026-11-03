// English /csv-inspector (shared body: src/views/toolPages.tsx)
import { ToolView, toolMetadata } from "@/views/toolPages";

export function generateMetadata() {
  return toolMetadata("en", "inspector");
}

export default function InspectorPage() {
  return <ToolView locale="en" tool="inspector" />;
}
