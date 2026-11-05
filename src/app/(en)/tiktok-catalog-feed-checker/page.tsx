// /tiktok-catalog-feed-checker, English only for now (shared body and content: src/views/platformLanding.tsx, src/lib/landing/platforms.ts)
import { PlatformLandingView, platformLandingMetadata } from "@/views/platformLanding";

export function generateMetadata() {
  return platformLandingMetadata("tiktok");
}

export default function Page() {
  return <PlatformLandingView slug="tiktok" />;
}
