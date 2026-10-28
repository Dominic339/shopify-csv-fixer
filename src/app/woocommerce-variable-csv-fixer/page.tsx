// /woocommerce-variable-csv-fixer (shared body and content: src/views/platformLanding.tsx, src/lib/landing/platforms.ts)
import { PlatformLandingView, platformLandingMetadata } from "@/views/platformLanding";

export const metadata = platformLandingMetadata("woocommerce-variable");

export default function Page() {
  return <PlatformLandingView slug="woocommerce-variable" />;
}
