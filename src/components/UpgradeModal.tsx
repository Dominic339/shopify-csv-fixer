"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function UpgradeModal({
  onClose,
  signedIn,
  plan,
  status,
}: {
  onClose: () => void;
  signedIn: boolean | null;
  plan: "free" | "basic" | "advanced";
  status: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isActive = (status ?? "").toLowerCase() === "active";
  const isAdvanced = plan === "advanced" && isActive;

  let title = "Custom Formats";
  let body =
    "Custom formats let you save your own rules and reuse them anytime. They’re included with the Advanced plan.";
  let ctaText = "Upgrade";
  let ctaAction: (() => void) | null = () => {
    router.push("/#pricing");
    onClose();
  };

  if (signedIn === null) {
    title = "Checking your account…";
    body = "One second—loading your plan details.";
    ctaText = "Checking…";
    ctaAction = null;
  } else if (!signedIn) {
    title = "Sign in required";
    body = "Sign in to upgrade and unlock Custom Formats.";
    ctaText = "Sign in";
    ctaAction = () => {
      router.push("/login");
      onClose();
    };
  } else if (isAdvanced) {
    title = "You already have Custom Formats";
    body = "Your Advanced plan is active. You can use Custom Formats now.";
    ctaText = "Go to Custom Formats";
    ctaAction = () => {
      router.push("/formats");
      onClose();
    };
  } else {
    title = "Upgrade to Advanced";
    body =
      plan === "basic"
        ? "You’re on Basic. Upgrade to Advanced to unlock Custom Formats (and unlimited exports)."
        : "Upgrade to Advanced to unlock Custom Formats (and unlimited exports).";
    ctaText = "View plans";
    ctaAction = () => {
      router.push("/#pricing");
      onClose();
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* darker overlay + blur so the modal is readable on dark theme */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
            <p className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">{body}</p>
          </div>

          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--text)]"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text)]"
            onClick={onClose}
          >
            Not now
          </button>

          <button
            type="button"
            className="rg-btn"
            disabled={!ctaAction}
            onClick={() => ctaAction?.()}
            title={!ctaAction ? "Loading…" : undefined}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
