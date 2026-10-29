import React from "react";

export function GradientFrame({ children, subtle }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <div
      className="rounded-[28px] p-[1px]"
      style={{
        background: subtle
          ? "var(--border)"
          : "linear-gradient(120deg, rgba(var(--accent-rgb), 0.45), rgba(var(--secondary-rgb), 0.45))",
      }}
    >
      {children}
    </div>
  );
}
