// /ebay-csv-fixer (shared body and content: src/views/platformLanding.tsx, src/lib/landing/platforms.ts)
import { PlatformLandingView, platformLandingMetadata } from "@/views/platformLanding";

export const metadata = platformLandingMetadata("ebay");

export default function Page() {
  return <PlatformLandingView slug="ebay" />;
}
