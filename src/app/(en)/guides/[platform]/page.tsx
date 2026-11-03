// English /guides/<platform> (shared body: src/views/guidePages.tsx)
import { GUIDE_PLATFORMS } from "@/lib/guidesRegistry";
import { GuidesPlatformView, guidesPlatformMetadata } from "@/views/guidePages";

type Props = { params: Promise<{ platform: string }> };

export function generateStaticParams() {
  return GUIDE_PLATFORMS.map((platform) => ({ platform }));
}

export async function generateMetadata({ params }: Props) {
  return guidesPlatformMetadata("en", (await params).platform);
}

export default async function PlatformGuidesPage({ params }: Props) {
  return <GuidesPlatformView locale="en" platform={(await params).platform} />;
}
