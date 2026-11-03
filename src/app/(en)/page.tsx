// English / (shared body: src/views/toolPages.tsx)
import { ToolView, toolMetadata } from "@/views/toolPages";

export function generateMetadata() {
  return toolMetadata("en", "home");
}

export default function HomePage() {
  return <ToolView locale="en" tool="home" />;
}
