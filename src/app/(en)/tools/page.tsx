// English /tools (shared body: src/views/smallToolPages.tsx)
import { SmallToolsIndexView, smallToolsIndexMetadata } from "@/views/smallToolPages";

export function generateMetadata() {
  return smallToolsIndexMetadata("en");
}

export default function ToolsPage() {
  return <SmallToolsIndexView locale="en" />;
}
