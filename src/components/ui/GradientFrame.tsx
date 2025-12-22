import React from "react";

export function GradientFrame({ children, subtle }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <div
      className="rounded-[28px] p-[1px]"
      style={{
        background: subtle
          ? "linear-gradient(120deg, rgba(34,197,94,0.35), rgba(6,182,212,0.35), rgba(59,130,246,0.35), rgba(168,85,247,0.35), rgba(249,115,22,0.35))"
          : "linear-gradient(120deg, rgba(34,197,94,0.55), rgba(6,182,212,0.55), rgba(59,130,246,0.55), rgba(168,85,247,0.55), rgba(249,115,22,0.55))",
      }}
    >
      {children}
    </div>
  );
}
