// /google-merchant-center-feed-checker (shared body and content: src/views/platformLanding.tsx, src/lib/landing/platforms.ts)
import { PlatformLandingView, platformLandingMetadata } from "@/views/platformLanding";

export function generateMetadata() {
  return platformLandingMetadata("google");
}

export default function Page() {
  return <PlatformLandingView slug="google" />;
}
