// src/app/global-not-found.tsx
// 404 for URLs that match no route at all. It renders its own document because
// there is no single root layout (see app/(en)/layout.tsx and app/[locale]/layout.tsx).
import type { Metadata } from "next";
import { RootDocument, rootMetadata } from "@/components/layout/RootDocument";
import { NotFoundContent } from "@/components/layout/NotFoundContent";

export const metadata: Metadata = {
  ...rootMetadata,
  title: "Page not found | StriveFormats",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <RootDocument lang="en">
      <NotFoundContent />
    </RootDocument>
  );
}
