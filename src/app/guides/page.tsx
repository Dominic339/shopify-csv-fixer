// English /guides (shared body: src/views/guidePages.tsx)
import { GuidesHubView, guidesHubMetadata } from "@/views/guidePages";

type Props = { searchParams: Promise<{ q?: string }> };

export function generateMetadata() {
  return guidesHubMetadata("en");
}

export default async function GuidesHubPage({ searchParams }: Props) {
  const { q } = await searchParams;
  return <GuidesHubView locale="en" q={q} />;
}
