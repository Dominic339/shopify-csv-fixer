import { infoPageMetadata, PolicyView } from "@/views/infoPages";

export function generateMetadata() {
  return infoPageMetadata("privacy");
}

export default function PrivacyPage() {
  return <PolicyView page="privacy" />;
}
