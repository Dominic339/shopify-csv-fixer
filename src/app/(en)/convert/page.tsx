// English /convert (shared body: src/views/toolPages.tsx)
import { ToolView, toolMetadata } from "@/views/toolPages";

export function generateMetadata() {
  return toolMetadata("en", "convert");
}

export default function ConvertPage() {
  return <ToolView locale="en" tool="convert" />;
}
