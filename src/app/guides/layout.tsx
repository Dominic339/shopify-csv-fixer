// English /guides layout (shared shell: src/views/guidePages.tsx)
import { GuidesShell } from "@/views/guidePages";

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <GuidesShell locale="en">{children}</GuidesShell>;
}
