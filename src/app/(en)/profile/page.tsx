// English /profile (shared body: src/views/toolPages.tsx)
import { ToolView, toolMetadata } from "@/views/toolPages";

export function generateMetadata() {
  return toolMetadata("en", "profile");
}

export default function ProfilePage() {
  return <ToolView locale="en" tool="profile" />;
}
