// English /app (shared body: src/views/toolPages.tsx)
import { ToolView, toolMetadata } from "@/views/toolPages";

export function generateMetadata() {
  return toolMetadata("en", "app");
}

export default function AppPage() {
  return <ToolView locale="en" tool="app" />;
}
