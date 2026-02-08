"use client";

import React, { useEffect } from "react";

export function UpgradeModal(props: {
  open: boolean;
  title?: string;
  message: string;
  // If falsey, the modal will prompt the user to sign in before upgrading.
  signedIn?: boolean;
  // Which plan the CTA should focus on.
  upgradePlan?: "basic" | "advanced";
  onClose: () => void;
}) {
  const { open, onClose, title, message, signedIn, upgradePlan } = props;

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const plan = upgradePlan ?? "advanced";
  const redirect = `/profile?upgrade=${encodeURIComponent(plan)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}&msg=${encodeURIComponent(
    "Sign in to upgrade your plan."
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">
              {title ?? "Upgrade required"}
            </div>
            <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">{message}</div>
          </div>

          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="#pricing"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              const el = document.getElementById("pricing");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)]"
          >
            View pricing
          </a>

          <a
            href={signedIn ? redirect : loginHref}
            className="rgb-btn px-5 py-3 text-sm font-semibold text-[var(--text)]"
          >
            {signedIn ? "Go to account to upgrade" : "Sign in to upgrade"}
          </a>
        </div>
      </div>
    </div>
  );
}
