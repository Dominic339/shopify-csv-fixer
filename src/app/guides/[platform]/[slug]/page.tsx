// English /guides/<platform>/<slug> (shared body: src/views/guidePages.tsx)
import { allGuideParams, GuideView, guideMetadata } from "@/views/guidePages";

type Props = { params: Promise<{ platform: string; slug: string }> };

export const generateStaticParams = allGuideParams;

export async function generateMetadata({ params }: Props) {
  const { platform, slug } = await params;
  return guideMetadata("en", platform, slug);
}

export default async function GuideDetailPage({ params }: Props) {
  const { platform, slug } = await params;
  return <GuideView locale="en" platform={platform} slug={slug} />;
}
