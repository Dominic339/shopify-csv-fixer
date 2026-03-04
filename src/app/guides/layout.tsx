// src/app/guides/layout.tsx
import { Suspense } from "react";

import GuideSidebar from "@/components/GuideSidebar";

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-14">
      <Suspense fallback={<div className="w-52 shrink-0" />}>
        <GuideSidebar />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
