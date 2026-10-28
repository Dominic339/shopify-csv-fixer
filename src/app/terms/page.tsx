import { infoPageMetadata, PolicyView } from "@/views/infoPages";

export function generateMetadata() {
  return infoPageMetadata("terms");
}

export default function TermsPage() {
  return <PolicyView page="terms" />;
}
