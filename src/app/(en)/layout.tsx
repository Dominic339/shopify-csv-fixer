// src/app/(en)/layout.tsx
// Root layout for the English pages (no locale prefix). The other languages use app/[locale]/layout.tsx.
import { RootDocument, rootMetadata } from "@/components/layout/RootDocument";

export const metadata = rootMetadata;

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
