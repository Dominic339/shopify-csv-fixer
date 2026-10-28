import { AboutView, infoPageMetadata } from "@/views/infoPages";

export function generateMetadata() {
  return infoPageMetadata("about");
}

export default function AboutPage() {
  return <AboutView />;
}
