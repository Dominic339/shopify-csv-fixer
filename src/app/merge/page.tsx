// English /merge (shared body: src/views/toolPages.tsx)
import { ToolView, toolMetadata } from "@/views/toolPages";

export function generateMetadata() {
  return toolMetadata("en", "merge");
}

export default function MergePage() {
  return <ToolView locale="en" tool="merge" />;
}
