// English /tools/<slug> (shared body: src/views/smallToolPages.tsx)
import { notFound } from "next/navigation";

import { SMALL_TOOLS, smallToolBySlug } from "@/lib/tools/registry";
import { SmallToolView, smallToolMetadata } from "@/views/smallToolPages";

type Params = { params: Promise<{ tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SMALL_TOOLS.map(({ slug }) => ({ tool: slug }));
}

export async function generateMetadata({ params }: Params) {
  return smallToolMetadata("en", (await params).tool);
}

export default async function SmallToolPage({ params }: Params) {
  const { tool } = await params;
  if (!smallToolBySlug(tool)) notFound();
  return <SmallToolView locale="en" slug={tool} />;
}
